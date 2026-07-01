import { NextRequest } from "next/server";
import { supabase, createId } from "@/db";
import { getAccountInfo } from "@/lib/evm";

// GET /api/talos/:id/patrons — List patrons for a TALOS
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: talos, error: talosError } = await supabase
      .from("tls_talos")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (talosError || !talos) {
      return Response.json({ error: "TALOS not found" }, { status: 404 });
    }

    const { data: patrons, error } = await supabase
      .from("tls_patrons")
      .select("*")
      .eq("talosId", id)
      .eq("status", "active")
      .order("createdAt", { ascending: false });

    if (error) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    return Response.json(patrons ?? []);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/talos/:id/patrons — Register as patron (requires min flap.sh token holding)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await request.json();
    const { stellarPublicKey, pulseAmount } = body;

    if (!stellarPublicKey) {
      return Response.json(
        { error: "stellarPublicKey is required" },
        { status: 400 }
      );
    }

    if (pulseAmount == null || typeof pulseAmount !== "number" || pulseAmount <= 0) {
      return Response.json(
        { error: "pulseAmount must be a positive number" },
        { status: 400 }
      );
    }

    const { data: talos, error: talosError } = await supabase
      .from("tls_talos")
      .select("id, totalSupply, minPatronPulse, tokenSymbol")
      .eq("id", id)
      .maybeSingle();

    if (talosError || !talos) {
      return Response.json({ error: "TALOS not found" }, { status: 404 });
    }

    const minRequired = talos.minPatronPulse ?? Math.floor(talos.totalSupply * 0.001);

    if (pulseAmount < minRequired) {
      return Response.json(
        {
          error: `Minimum ${minRequired} ${talos.tokenSymbol ?? "tokens"} required to become Patron`,
          minRequired,
          current: pulseAmount,
        },
        { status: 403 }
      );
    }

    const accountInfo = await getAccountInfo(stellarPublicKey);
    if (!accountInfo.exists) {
      return Response.json(
        { error: `EVM account ${stellarPublicKey} is not reachable` },
        { status: 400 }
      );
    }

    const hasUsdc = parseFloat(accountInfo.usdcBalance) > 0;
    if (!hasUsdc) {
      return Response.json(
        { error: "Account holds no USDC. Fund it with USDC first." },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("tls_patrons")
      .select("*")
      .eq("talosId", id)
      .eq("stellarPublicKey", stellarPublicKey)
      .maybeSingle();

    if (existing && existing.status === "active") {
      return Response.json(
        { error: "Already a Patron of this TALOS" },
        { status: 409 }
      );
    }

    const sharePercent = ((pulseAmount / talos.totalSupply) * 100).toFixed(2);

    if (existing && existing.status === "revoked") {
      const { data: patron, error } = await supabase
        .from("tls_patrons")
        .update({
          status: "active",
          pulseAmount,
          role: "Investor",
          share: sharePercent,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error || !patron) {
        return Response.json({ error: "Internal server error" }, { status: 500 });
      }
      return Response.json(patron, { status: 200 });
    }

    const { data: patron, error } = await supabase
      .from("tls_patrons")
      .insert({
        id: createId(),
        talosId: id,
        stellarPublicKey,
        role: "Investor",
        pulseAmount,
        share: sharePercent,
      })
      .select()
      .single();

    if (error || !patron) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    return Response.json(patron, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/talos/:id/patrons — Withdraw patron status
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await request.json();
    const { stellarPublicKey } = body;

    if (!stellarPublicKey) {
      return Response.json(
        { error: "stellarPublicKey is required" },
        { status: 400 }
      );
    }

    const { data: patron } = await supabase
      .from("tls_patrons")
      .select("*")
      .eq("talosId", id)
      .eq("stellarPublicKey", stellarPublicKey)
      .maybeSingle();

    if (!patron || patron.status !== "active") {
      return Response.json(
        { error: "No active Patron found for this wallet" },
        { status: 404 }
      );
    }

    if (patron.role === "Creator") {
      return Response.json(
        { error: "Creator cannot withdraw Patron status" },
        { status: 403 }
      );
    }

    const { data: updated, error } = await supabase
      .from("tls_patrons")
      .update({ status: "revoked" })
      .eq("id", patron.id)
      .select()
      .single();

    if (error || !updated) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    return Response.json(updated);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
