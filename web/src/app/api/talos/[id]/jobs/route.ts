import { NextRequest } from "next/server";
import { supabase, createId } from "@/db";
import { fulfillInstant } from "@/lib/fulfillment";
import type { Json } from "@/lib/supabase/types";

/**
 * POST /api/talos/:id/jobs
 *
 * Human user requests a service from an agent on BSC. The user pays the
 * service price in USDC from their wallet (x402 / direct ERC-20 transfer) and
 * passes the settled `txHash` as proof. Replay protection via txHash uniqueness.
 *
 * Body: { buyerPublicKey, txHash, payload? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { buyerPublicKey, txHash, payload } = body as {
      buyerPublicKey?: string;
      txHash?: string;
      payload?: Record<string, unknown>;
    };

    if (!buyerPublicKey) {
      return Response.json({ error: "buyerPublicKey is required" }, { status: 400 });
    }
    if (!txHash) {
      return Response.json({ error: "txHash (settled USDC payment) is required" }, { status: 400 });
    }

    const [{ data: service }, { data: talos }] = await Promise.all([
      supabase.from("tls_commerce_services").select("*").eq("talosId", id).maybeSingle(),
      supabase.from("tls_talos").select("id, agentOnline, name, agentWalletAddress").eq("id", id).maybeSingle(),
    ]);

    if (!talos) return Response.json({ error: "TALOS not found" }, { status: 404 });
    if (!service) return Response.json({ error: "This agent offers no services" }, { status: 404 });

    const { data: duplicate } = await supabase
      .from("tls_commerce_jobs")
      .select("id")
      .eq("txHash", txHash)
      .maybeSingle();

    if (duplicate) {
      return Response.json({ error: "Transaction already used for a job (replay)" }, { status: 409 });
    }

    if (service.fulfillmentMode === "instant") {
      let result: Record<string, unknown>;
      try {
        result = await fulfillInstant(service.serviceName, payload ?? {});
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "unknown error";
        return Response.json(
          { error: `Fulfillment failed: ${message}` },
          { status: 502 },
        );
      }

      const { data: job, error: jobError } = await supabase
        .from("tls_commerce_jobs")
        .insert({
          id: createId(),
          talosId: id,
          requesterTalosId: `human:${buyerPublicKey}`,
          serviceName: service.serviceName,
          payload: (payload ?? {}) as Json,
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
        { jobId: job.id, status: "completed", serviceName: service.serviceName, result, txHash },
        { status: 201 },
      );
    }

    const { data: job, error: jobError } = await supabase
      .from("tls_commerce_jobs")
      .insert({
        id: createId(),
        talosId: id,
        requesterTalosId: `human:${buyerPublicKey}`,
        serviceName: service.serviceName,
        payload: (payload ?? {}) as Json,
        paymentSig: txHash,
        txHash,
        amount: service.price,
        status: "pending",
      })
      .select()
      .single();

    if (jobError || !job) {
      if (jobError?.code === "23505") {
        return Response.json({ error: "Transaction already used for a job (replay)" }, { status: 409 });
      }
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
      {
        jobId: job.id,
        status: "pending",
        serviceName: service.serviceName,
        amount: Number(service.price),
        txHash,
        message: `Job queued. The agent will process your request and you can poll for results.`,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    if (e?.code === "23505") {
      return Response.json({ error: "Transaction already used for a job (replay)" }, { status: 409 });
    }
    console.error("[jobs POST]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/talos/:id/jobs?txHash=xxx  or  ?jobId=xxx
 * Poll job status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  const txHash = searchParams.get("txHash");

  if (!jobId && !txHash) {
    return Response.json({ error: "Provide jobId or txHash" }, { status: 400 });
  }

  try {
    const { data: job } = jobId
      ? await supabase.from("tls_commerce_jobs").select("*").eq("id", jobId).maybeSingle()
      : await supabase.from("tls_commerce_jobs").select("*").eq("txHash", txHash!).maybeSingle();

    if (!job || job.talosId !== id) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    return Response.json({
      jobId: job.id,
      status: job.status,
      serviceName: job.serviceName,
      result: job.result,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
