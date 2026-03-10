import { NextRequest } from "next/server";
import { supabase, createId } from "@/db";

// POST /api/playbooks/:id/purchase — Record a playbook purchase after x402 payment.
//
// The buyer pays the seller via the x402 EVM flow (POST /api/talos/:id/purchase →
// purchasePaidService), then calls this endpoint with the settled `txHash` to
// claim access. Mirrors the buy-token settle-then-record model. `txHash`
// uniqueness provides replay protection.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Missing Authorization header. Use: Bearer <api_key>" },
        { status: 401 },
      );
    }
    const apiKeyToken = authHeader.slice(7);
    const { data: buyer } = await supabase
      .from("tls_talos")
      .select("id")
      .eq("apiKey", apiKeyToken)
      .maybeSingle();

    if (!buyer) {
      return Response.json({ error: "Invalid API key" }, { status: 403 });
    }

    const body = await request.json();
    const { buyerPublicKey, txHash } = body as { buyerPublicKey?: string; txHash?: string };

    if (!buyerPublicKey || !txHash) {
      return Response.json(
        { error: "buyerPublicKey and txHash (settled x402 payment) are required" },
        { status: 400 },
      );
    }

    const { data: playbook } = await supabase
      .from("tls_playbooks")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!playbook) {
      return Response.json({ error: "Playbook not found" }, { status: 404 });
    }
    if (playbook.status !== "active") {
      return Response.json({ error: "Playbook is not available for purchase" }, { status: 400 });
    }

    const { data: existingBySig } = await supabase
      .from("tls_playbook_purchases")
      .select("id")
      .eq("txHash", txHash)
      .maybeSingle();

    if (existingBySig) {
      return Response.json({ error: "Payment tx already used (replay detected)" }, { status: 409 });
    }

    const { data: existing } = await supabase
      .from("tls_playbook_purchases")
      .select("*")
      .eq("playbookId", id)
      .eq("buyerPublicKey", buyerPublicKey)
      .maybeSingle();

    if (existing) {
      return Response.json({ error: "Already purchased this playbook" }, { status: 409 });
    }

    const { data: purchase, error } = await supabase
      .from("tls_playbook_purchases")
      .insert({
        id: createId(),
        playbookId: id,
        buyerPublicKey,
        txHash,
      })
      .select()
      .single();

    if (error || !purchase) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    await supabase.from("tls_revenues").insert({
      id: createId(),
      talosId: playbook.talosId,
      amount: playbook.price,
      currency: playbook.currency,
      source: "playbook_sale",
      txHash,
    });

    return Response.json(purchase, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
