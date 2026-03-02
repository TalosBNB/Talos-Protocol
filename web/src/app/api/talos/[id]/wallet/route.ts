import { NextRequest } from "next/server";
import { supabase } from "@/db";
import { verifyAgentApiKey } from "@/lib/auth";

// GET /api/talos/:id/wallet — Agent fetches its Stellar wallet info at startup
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const auth = await verifyAgentApiKey(request, id);
    if (!auth.ok) return auth.response;

    const { data: talos, error } = await supabase
      .from("tls_talos")
      .select("agentWalletId, agentWalletAddress")
      .eq("id", id)
      .maybeSingle();

    if (error || !talos?.agentWalletId) {
      return Response.json({ error: "No agent wallet for this TALOS" }, { status: 404 });
    }

    return Response.json({
      agentWalletId: talos.agentWalletId,
      agentWalletAddress: talos.agentWalletAddress,
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
