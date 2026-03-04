import { NextRequest } from "next/server";
import { supabase } from "@/db";

/**
 * Resolve the caller's TALOS ID from their Bearer API key.
 * Returns null if auth is missing or invalid.
 */
async function resolveCallerTalos(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const { data: talos } = await supabase
    .from("tls_talos")
    .select("id")
    .eq("apiKey", token)
    .maybeSingle();
  return talos?.id ?? null;
}

// POST /api/jobs/:id/result — Submit job result (from service provider agent)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const callerTalosId = await resolveCallerTalos(request);
    if (!callerTalosId) {
      return Response.json({ error: "Missing or invalid Authorization" }, { status: 401 });
    }

    const body = await request.json();
    const { result } = body;

    if (!result) {
      return Response.json({ error: "result is required" }, { status: 400 });
    }

    const { data: job } = await supabase
      .from("tls_commerce_jobs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!job) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.talosId !== callerTalosId) {
      return Response.json({ error: "Not authorized to fulfill this job" }, { status: 403 });
    }

    const { data: updated, error } = await supabase
      .from("tls_commerce_jobs")
      .update({
        result,
        status: "completed",
      })
      .eq("id", id)
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

// GET /api/jobs/:id/result — Poll for job result (from requester agent)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const callerTalosId = await resolveCallerTalos(request);
    if (!callerTalosId) {
      return Response.json({ error: "Missing or invalid Authorization" }, { status: 401 });
    }

    const { data: job } = await supabase
      .from("tls_commerce_jobs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!job) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.talosId !== callerTalosId && job.requesterTalosId !== callerTalosId) {
      return Response.json({ error: "Not authorized to view this job" }, { status: 403 });
    }

    return Response.json({
      id: job.id,
      status: job.status,
      result: job.result,
      talosId: job.talosId,
      serviceName: job.serviceName,
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
