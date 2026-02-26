import { NextRequest } from "next/server";
import { supabase } from "@/db";
import { verifyAgentApiKey } from "@/lib/auth";
import { sendUSDC } from "@/lib/evm";
import { transferSchema, parseBody } from "@/lib/schemas";
import type { Hex } from "viem";

// POST /api/talos/:id/transfer — Execute USDC (ERC-20) transfer on BSC
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const auth = await verifyAgentApiKey(request, id);
    if (!auth.ok) return auth.response;

    const parsed = await parseBody(request, transferSchema);
    if (parsed.error) return parsed.error;

    const { to, amount } = parsed.data;

    const { data: talos } = await supabase
      .from("tls_talos")
      .select("approvalThreshold")
      .eq("id", id)
      .maybeSingle();

    if (talos && amount > Number(talos.approvalThreshold)) {
      return Response.json(
        {
          error: "Amount exceeds approval threshold. Create an approval request first.",
          amount,
          threshold: Number(talos.approvalThreshold),
        },
        { status: 403 }
      );
    }

    const agentSecret = process.env[`TALOS_AGENT_SECRET_${id}`];
    if (!agentSecret) {
      return Response.json(
        { error: "Agent secret key not configured for this TALOS" },
        { status: 503 }
      );
    }

    const result = await sendUSDC(agentSecret as Hex, to, String(amount));
    return Response.json({
      status: "completed",
      currency: "USDC",
      to,
      amount,
      txHash: result.txHash,
    });
  } catch (err) {
    console.error("Transfer error:", err);
    return Response.json({ error: "Transfer failed" }, { status: 500 });
  }
}
