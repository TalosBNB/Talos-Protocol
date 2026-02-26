import { NextRequest } from "next/server";
import { supabase } from "@/db";
import { verifyAgentApiKey } from "@/lib/auth";

// PATCH /api/talos/:id/status — Agent status update (online/offline)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const auth = await verifyAgentApiKey(request, id);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { agentOnline } = body;

    if (typeof agentOnline !== "boolean") {
      return Response.json(
        { error: "agentOnline must be a boolean" },
        { status: 400 }
      );
    }

    const { data: updated, error } = await supabase
      .from("tls_talos")
      .update({
        agentOnline,
        agentLastSeen: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, agentOnline, agentLastSeen")
      .single();

    if (error || !updated) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    return Response.json(updated);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
