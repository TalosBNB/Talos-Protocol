import { NextRequest } from "next/server";
import { supabase } from "@/db";
import { sendUSDC, OPERATOR_KEY, OPERATOR_ADDRESS } from "@/lib/evm";

/**
 * POST /api/talos/:id/revenue/distribute
 *
 * Distribute accumulated treasury USDC to Mitos holders proportionally (BSC).
 * Requires BSC_OPERATOR_PRIVATE_KEY (operator holds the agent treasury).
 *
 * Body: { requesterPublicKey } — must be creator or operator (0x...)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { requesterPublicKey } = body as { requesterPublicKey?: string };

    if (!requesterPublicKey) {
      return Response.json({ error: "requesterPublicKey is required" }, { status: 400 });
    }

    const { data: talos, error: talosError } = await supabase
      .from("tls_talos")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (talosError || !talos) {
      return Response.json({ error: "TALOS not found" }, { status: 404 });
    }

    const isCreator = requesterPublicKey.toLowerCase() === talos.creatorPublicKey?.toLowerCase();
    const isOperator = OPERATOR_ADDRESS && requesterPublicKey.toLowerCase() === OPERATOR_ADDRESS.toLowerCase();
    if (!isCreator && !isOperator) {
      return Response.json({ error: "Only the creator or operator can trigger distribution" }, { status: 403 });
    }

    const { data: revenueRows } = await supabase
      .from("tls_revenues")
      .select("amount")
      .eq("talosId", id);

    const totalRevenue = (revenueRows ?? []).reduce((s, r) => s + parseFloat(r.amount), 0);

    if (totalRevenue <= 0) {
      return Response.json({ error: "No revenue to distribute" }, { status: 400 });
    }

    const { data: patrons } = await supabase
      .from("tls_patrons")
      .select("*")
      .eq("talosId", id)
      .eq("status", "active");

    if (!patrons || patrons.length === 0) {
      return Response.json({ error: "No active patrons to distribute to" }, { status: 400 });
    }

    const totalPulse = patrons.reduce((s, p) => s + Number(p.pulseAmount), 0);
    if (totalPulse === 0) {
      return Response.json({ error: "Total Mitos held by patrons is 0" }, { status: 400 });
    }

    const investorShare = Number(talos.investorShare ?? 25);
    const distributableAmount = (totalRevenue * investorShare) / 100;

    if (!OPERATOR_KEY) {
      return Response.json({ error: "BSC_OPERATOR_PRIVATE_KEY not configured" }, { status: 500 });
    }

    const transfers: { patron: string; amount: number; txHash: string }[] = [];
    const errors: { patron: string; error: string }[] = [];

    for (const patron of patrons) {
      const pulseAmount = Number(patron.pulseAmount);
      const shareRatio = pulseAmount / totalPulse;
      const patronAmount = Math.floor(distributableAmount * shareRatio * 1e6) / 1e6;
      if (patronAmount < 0.000001) continue;

      try {
        const result = await sendUSDC(OPERATOR_KEY, patron.stellarPublicKey, patronAmount.toFixed(6));
        transfers.push({ patron: patron.stellarPublicKey, amount: patronAmount, txHash: result.txHash });
      } catch (err) {
        errors.push({
          patron: patron.stellarPublicKey,
          error: err instanceof Error ? err.message : "unknown",
        });
      }
    }

    return Response.json({
      success: true,
      totalRevenue,
      distributableAmount,
      investorSharePercent: investorShare,
      transfers,
      errors,
      message: `Distributed ${distributableAmount.toFixed(2)} USDC (${investorShare}% of ${totalRevenue.toFixed(2)} USDC treasury) to ${transfers.length} patrons`,
    });
  } catch (err) {
    console.error("[revenue/distribute]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/talos/:id/revenue/distribute — preview without executing.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const [{ data: talos, error: talosError }, { data: revenueRows }, { data: patrons }] =
      await Promise.all([
        supabase.from("tls_talos").select("*").eq("id", id).maybeSingle(),
        supabase.from("tls_revenues").select("amount").eq("talosId", id),
        supabase.from("tls_patrons").select("*").eq("talosId", id).eq("status", "active"),
      ]);

    if (talosError || !talos) {
      return Response.json({ error: "TALOS not found" }, { status: 404 });
    }

    const totalRevenue = (revenueRows ?? []).reduce((s, r) => s + parseFloat(r.amount), 0);
    const investorShare = Number(talos.investorShare ?? 25);
    const distributableAmount = (totalRevenue * investorShare) / 100;
    const patronList = patrons ?? [];
    const totalPulse = patronList.reduce((s, p) => s + Number(p.pulseAmount), 0);

    const breakdown = patronList.map((p) => {
      const pulseAmount = Number(p.pulseAmount);
      return {
        stellarPublicKey: p.stellarPublicKey,
        pulseAmount,
        sharePercent: totalPulse > 0 ? ((pulseAmount / totalPulse) * 100).toFixed(2) : "0",
        estimatedUsdc: totalPulse > 0
          ? ((distributableAmount * pulseAmount) / totalPulse).toFixed(6)
          : "0",
      };
    });

    return Response.json({
      totalRevenue,
      distributableAmount,
      investorSharePercent: investorShare,
      treasuryRetained: totalRevenue - distributableAmount,
      breakdown,
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
