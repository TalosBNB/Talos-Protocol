import { NextRequest } from "next/server";
import { supabase } from "@/db";
import { recordApprovalOnChain } from "@/lib/evm";

// PATCH /api/talos/:id/approvals/:approvalId — Approve/reject
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; approvalId: string }> }
) {
  const { id, approvalId } = await params;

  try {
    const { data: talos, error: talosError } = await supabase
      .from("tls_talos")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (talosError || !talos) {
      return Response.json({ error: "TALOS not found" }, { status: 404 });
    }

    const { data: existing, error: existingError } = await supabase
      .from("tls_approvals")
      .select("*")
      .eq("id", approvalId)
      .maybeSingle();

    if (existingError || !existing || existing.talosId !== id) {
      return Response.json({ error: "Approval not found" }, { status: 404 });
    }

    const body = await request.json();
    const { status, decidedBy } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return Response.json(
        { error: "status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    if (!decidedBy) {
      return Response.json(
        { error: "decidedBy (Stellar public key) is required" },
        { status: 400 }
      );
    }

    const { data: patron } = await supabase
      .from("tls_patrons")
      .select("*")
      .eq("talosId", id)
      .eq("stellarPublicKey", decidedBy)
      .eq("status", "active")
      .maybeSingle();

    if (!patron) {
      return Response.json(
        { error: "Only active Patrons can approve or reject decisions" },
        { status: 403 }
      );
    }

    const onChainResult = await recordApprovalOnChain(
      approvalId,
      id,
      status,
      decidedBy,
    );

    const { data: approval, error } = await supabase
      .from("tls_approvals")
      .update({
        status,
        decidedAt: new Date().toISOString(),
        decidedBy,
        txHash: onChainResult?.txHash ?? null,
      })
      .eq("id", approvalId)
      .select()
      .single();

    if (error || !approval) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    return Response.json(approval);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
