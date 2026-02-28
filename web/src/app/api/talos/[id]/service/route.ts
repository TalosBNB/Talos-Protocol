import { NextRequest } from "next/server";
import { supabase, createId } from "@/db";
import { verifyAgentApiKey } from "@/lib/auth";
import { fulfillInstant } from "@/lib/fulfillment";
import { registerServiceSchema, parseBody } from "@/lib/schemas";
import type { Json } from "@/lib/supabase/types";

const X402_NETWORK = process.env.X402_NETWORK ?? "eip155:56";

// GET /api/talos/:id/service — Returns 402 with payment details (x402 storefront)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [{ data: service }, { data: talos }] = await Promise.all([
      supabase.from("tls_commerce_services").select("*").eq("talosId", id).maybeSingle(),
      supabase.from("tls_talos").select("agentWalletAddress").eq("id", id).maybeSingle(),
    ]);

    if (!service) {
      return Response.json({ error: "No service registered for this TALOS" }, { status: 404 });
    }

    const payee = service.stellarPublicKey || talos?.agentWalletAddress;
    if (!payee) {
      return Response.json({ error: "No payment address configured for this TALOS" }, { status: 500 });
    }

    const sellerUrl = (process.env.SELLER_PUBLIC_URL ?? "http://localhost:4021").replace(/\/$/, "");

    return Response.json(
      {
        price: Number(service.price),
        currency: service.currency,
        payee,
        chains: service.chains,
        network: X402_NETWORK,
        asset: "USDC",
        serviceName: service.serviceName,
        description: service.description,
        fulfillmentMode: service.fulfillmentMode,
        talosId: id,
        serviceUrl: `${sellerUrl}/buy/${id}`,
      },
      { status: 402 }
    );
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/talos/:id/service — Submit x402 payment + create commerce job
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Missing Authorization header. Use: Bearer <api_key>" },
        { status: 401 }
      );
    }
    const apiKeyToken = authHeader.slice(7);
    const { data: requester } = await supabase
      .from("tls_talos")
      .select("id")
      .eq("apiKey", apiKeyToken)
      .maybeSingle();

    if (!requester) {
      return Response.json({ error: "Invalid API key" }, { status: 403 });
    }

    const requestBody = await request.json().catch(() => ({})) as Record<string, unknown>;

    const txHash =
      (typeof requestBody.txHash === "string" && requestBody.txHash) ||
      request.headers.get("x-payment-response") ||
      "";
    if (!txHash) {
      return Response.json(
        { error: "Missing settled payment txHash (from the x402 purchase flow)" },
        { status: 400 }
      );
    }

    const [{ data: service }, { data: providerTalos }] = await Promise.all([
      supabase.from("tls_commerce_services").select("*").eq("talosId", id).maybeSingle(),
      supabase.from("tls_talos").select("agentWalletAddress").eq("id", id).maybeSingle(),
    ]);

    if (!service) {
      return Response.json({ error: "No service registered for this TALOS" }, { status: 404 });
    }

    const expectedPayee = service.stellarPublicKey || providerTalos?.agentWalletAddress;
    if (!expectedPayee) {
      return Response.json(
        { error: "No payment address configured for this TALOS" },
        { status: 500 }
      );
    }

    const { data: existingJob } = await supabase
      .from("tls_commerce_jobs")
      .select("id")
      .eq("paymentSig", txHash)
      .maybeSingle();

    if (existingJob) {
      return Response.json({ error: "Payment tx already used (replay detected)" }, { status: 409 });
    }

    const payload = (requestBody.payload ?? requestBody) as Record<string, unknown>;

    if (service.fulfillmentMode === "instant") {
      let result: Record<string, unknown>;
      try {
        result = await fulfillInstant(service.serviceName, payload ?? {});
      } catch (fulfillErr) {
        console.error("Service fulfillment failed:", fulfillErr);
        return Response.json(
          { error: "Service fulfillment failed" },
          { status: 502 }
        );
      }

      const { data: job, error: jobError } = await supabase
        .from("tls_commerce_jobs")
        .insert({
          id: createId(),
          talosId: id,
          requesterTalosId: requester.id,
          serviceName: service.serviceName,
          payload: (payload ?? undefined) as Json | undefined,
          result: result as Json,
          paymentSig: txHash,
          txHash,
          amount: service.price,
          status: "completed",
        })
        .select()
        .single();

      if (jobError || !job) {
        return Response.json({ error: "Internal server error" }, { status: 500 });
      }

      await supabase.from("tls_revenues").insert({
        id: createId(),
        talosId: id,
        amount: service.price,
        currency: service.currency ?? "USDC",
        source: "commerce",
        txHash,
      });

      return Response.json(
        { id: job.id, jobId: job.id, status: "completed", result, txHash },
        { status: 201 }
      );
    }

    const { data: job, error: jobError } = await supabase
      .from("tls_commerce_jobs")
      .insert({
        id: createId(),
        talosId: id,
        requesterTalosId: requester.id,
        serviceName: service.serviceName,
        payload: (payload ?? undefined) as Json | undefined,
        paymentSig: txHash,
        txHash,
        amount: service.price,
        status: "pending",
      })
      .select()
      .single();

    if (jobError || !job) {
      if (jobError?.code === "23505") {
        return Response.json({ error: "Payment token already used (replay detected)" }, { status: 409 });
      }
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    return Response.json(
      { id: job.id, jobId: job.id, status: "pending", txHash },
      { status: 201 }
    );
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    if (e?.code === "23505" && String(e?.constraint ?? "").includes("paymentSig")) {
      return Response.json({ error: "Payment token already used (replay detected)" }, { status: 409 });
    }
    console.error("Service POST error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/talos/:id/service — Register or update commerce service (upsert)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const auth = await verifyAgentApiKey(request, id);
    if (!auth.ok) return auth.response;

    const parsed = await parseBody(request, registerServiceSchema);
    if (parsed.error) return parsed.error;

    const { serviceName, description, price, stellarPublicKey, chains, fulfillmentMode } = parsed.data;

    const { data: talos } = await supabase
      .from("tls_talos")
      .select("agentWalletAddress")
      .eq("id", id)
      .maybeSingle();

    const servicePublicKey = stellarPublicKey || talos?.agentWalletAddress;
    if (!servicePublicKey) {
      return Response.json(
        { error: "stellarPublicKey is required (no agent wallet available as fallback)" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("tls_commerce_services")
      .select("id")
      .eq("talosId", id)
      .maybeSingle();

    if (existing) {
      const { data: updated, error } = await supabase
        .from("tls_commerce_services")
        .update({
          serviceName,
          description: description ?? null,
          price: String(price),
          stellarPublicKey: servicePublicKey,
          chains: chains ?? ["bsc"],
          fulfillmentMode: fulfillmentMode ?? "async",
        })
        .eq("talosId", id)
        .select()
        .single();

      if (error || !updated) {
        return Response.json({ error: "Internal server error" }, { status: 500 });
      }
      return Response.json(updated);
    }

    const { data: service, error } = await supabase
      .from("tls_commerce_services")
      .insert({
        id: createId(),
        talosId: id,
        serviceName,
        description: description ?? null,
        price: String(price),
        stellarPublicKey: servicePublicKey,
        chains: chains ?? ["stellar"],
        fulfillmentMode: fulfillmentMode ?? "async",
      })
      .select()
      .single();

    if (error || !service) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    return Response.json(service, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
