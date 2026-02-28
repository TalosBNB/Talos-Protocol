import { supabase, createId } from "@/db";
import { NextResponse } from "next/server";
import { getErc20Balance } from "@/lib/evm";
import { fourMemeTradeUrl } from "@/lib/four-meme";

/**
 * four.meme token patron flow — buy on four.meme, sync patron status here.
 *
 * GET  — trade URL + min patron threshold
 * POST — verify on-chain token balance, upsert patron record (no treasury sale)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data: talos, error } = await supabase
    .from("tls_talos")
    .select("stellarAssetCode, tokenSymbol, minPatronPulse, totalSupply")
    .eq("id", id)
    .maybeSingle();

  if (error || !talos) {
    return NextResponse.json({ error: "TALOS not found" }, { status: 404 });
  }
  if (!talos.stellarAssetCode?.startsWith("0x")) {
    return NextResponse.json({ error: "Token not launched on four.meme yet" }, { status: 400 });
  }

  const minForPatron = talos.minPatronPulse ?? Math.floor((talos.totalSupply ?? 1_000_000) * 0.001);
  const tradeUrl = fourMemeTradeUrl(talos.stellarAssetCode);

  return NextResponse.json({
    tokenAddress: talos.stellarAssetCode,
    tokenSymbol: talos.tokenSymbol ?? "TOKEN",
    memeUrl: tradeUrl,
    flapUrl: tradeUrl,
    minPatronTokens: minForPatron,
    message: "Buy on four.meme, then POST here to sync patron status from your wallet balance.",
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const { buyerPublicKey } = body as { buyerPublicKey?: string };

  if (!buyerPublicKey || typeof buyerPublicKey !== "string") {
    return NextResponse.json({ error: "buyerPublicKey (0x...) is required" }, { status: 400 });
  }

  const { data: talos, error: talosError } = await supabase
    .from("tls_talos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (talosError || !talos) {
    return NextResponse.json({ error: "TALOS not found" }, { status: 404 });
  }

  const tokenAddress = talos.stellarAssetCode;
  if (!tokenAddress?.startsWith("0x")) {
    return NextResponse.json({ error: "Token not launched on four.meme yet" }, { status: 400 });
  }

  const balanceStr = await getErc20Balance(tokenAddress, buyerPublicKey, 18);
  const balance = Math.floor(parseFloat(balanceStr));
  const tradeUrl = fourMemeTradeUrl(tokenAddress);
  if (balance <= 0) {
    return NextResponse.json(
      {
        error: "No tokens held — buy on four.meme first",
        memeUrl: tradeUrl,
        flapUrl: tradeUrl,
      },
      { status: 400 },
    );
  }

  const minForPatron = talos.minPatronPulse ?? Math.floor(talos.totalSupply * 0.001);
  const becomesPatron = balance >= minForPatron;
  const tokenSymbol = talos.tokenSymbol ?? "TOKEN";

  const { data: existingPatron } = await supabase
    .from("tls_patrons")
    .select("*")
    .eq("talosId", id)
    .eq("stellarPublicKey", buyerPublicKey)
    .maybeSingle();

  if (existingPatron) {
    await supabase
      .from("tls_patrons")
      .update({
        pulseAmount: balance,
        status: becomesPatron ? "active" : existingPatron.status,
      })
      .eq("id", existingPatron.id);
  } else if (becomesPatron) {
    await supabase.from("tls_patrons").insert({
      id: createId(),
      talosId: id,
      stellarPublicKey: buyerPublicKey,
      role: "patron",
      share: "0",
      pulseAmount: balance,
      status: "active",
    });
  }

  return NextResponse.json({
    success: true,
    tokenSymbol,
    tokenAddress,
    memeUrl: tradeUrl,
    flapUrl: tradeUrl,
    buyerPublicKey,
    onChainBalance: balance,
    totalPulseHeld: balance,
    patronStatus: becomesPatron
      ? existingPatron
        ? "updated"
        : "registered"
      : `pending (need ${minForPatron - balance} more ${tokenSymbol} on four.meme)`,
    message: becomesPatron
      ? `Patron synced — ${balance.toLocaleString()} ${tokenSymbol} held`
      : `Balance recorded — buy ${minForPatron - balance} more ${tokenSymbol} on four.meme to become a Patron`,
  });
}
