import { NextRequest } from "next/server";
import { supabase, createId } from "@/db";
import { verifyAgentApiKey } from "@/lib/auth";

// GET /api/talos/:id/approvals — Pending approval list
// Public read (no auth) — patrons need to see approvals to vote
// Agent-authenticated write is handled in POST
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    let query = supabase
      .from("tls_approvals")
      .select("*")
      .eq("talosId", id)
      .order("createdAt", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: rows, error } = await query;

    if (error) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    return Response.json(rows ?? []);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/talos/:id/approvals — Create approval request
// Can be called by: local agent (Bearer api_key) OR active patron (proposerPublicKey)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { data: talos, error: talosError } = await supabase
      .from("tls_talos")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (talosError || !talos) {
      return Response.json({ error: "TALOS not found" }, { status: 404 });
    }

    const body = await request.json();
    const { type, title, description, amount, proposerPublicKey } = body;

    const authHeader = request.headers.get("authorization");
    const isAgentAuth = authHeader?.startsWith("Bearer ");

    if (!isAgentAuth) {
      if (!proposerPublicKey) {
        return Response.json({ error: "proposerPublicKey required for patron proposals" }, { status: 401 });
      }
      const { data: patron } = await supabase
        .from("tls_patrons")
        .select("id")
        .eq("talosId", id)
        .eq("stellarPublicKey", proposerPublicKey)
        .eq("status", "active")
        .maybeSingle();

      if (!patron) {
        return Response.json({ error: "Only active patrons can propose approvals" }, { status: 403 });
      }
    }

    const validTypes = ["transaction", "strategy", "policy", "channel"];

    if (!type || !title) {
      return Response.json(
        { error: "type, title are required" },
        { status: 400 }
      );
    }

    if (!validTypes.includes(type)) {
      return Response.json(
        { error: `type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (amount !== undefined && (typeof amount !== "number" || amount < 0)) {
      return Response.json(
        { error: "amount must be a non-negative number" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("tls_approvals")
      .select("id")
      .eq("talosId", id)
      .eq("type", type)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return Response.json(
        {
          error: "An approval of this type is already pending",
          existingId: existing.id,
        },
        { status: 409 },
      );
    }

    const { data: approval, error } = await supabase
      .from("tls_approvals")
      .insert({
        id: createId(),
        talosId: id,
        type,
        title,
        description,
        amount: amount != null ? String(amount) : undefined,
      })
      .select()
      .single();

    if (error || !approval) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    return Response.json(approval, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
