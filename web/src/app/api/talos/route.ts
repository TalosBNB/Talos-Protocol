import { NextRequest } from "next/server";
import { supabase, createId } from "@/db";
import { randomBytes } from "crypto";
import { createAgentKeypair, fundTestnetAccount, OPERATOR_KEY, OPERATOR_ADDRESS } from "@/lib/evm";
import { launchFourMemeToken as executeMemeLaunch } from "@/lib/four-meme";
import { createTalosSchema, parseBody } from "@/lib/schemas";
import type { TlsTalosRow } from "@/lib/supabase/types";

async function rollbackGenesis(talosId: string): Promise<void> {
  await supabase.from("tls_commerce_services").delete().eq("talosId", talosId);
  await supabase.from("tls_patrons").delete().eq("talosId", talosId);
  await supabase.from("tls_talos").delete().eq("id", talosId);
}

async function countPatronsByTalos(): Promise<Map<string, number>> {
  const { data } = await supabase.from("tls_patrons").select("talosId");
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    map.set(row.talosId, (map.get(row.talosId) ?? 0) + 1);
  }
  return map;
}

// GET /api/talos — List TALOS entries with cursor-based pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 100);

    let query = supabase
      .from("tls_talos")
      .select(
        "id, onChainId, agentName, name, category, description, status, stellarAssetCode, pulsePrice, totalSupply, creatorShare, investorShare, treasuryShare, persona, targetAudience, channels, toneVoice, approvalThreshold, gtmBudget, minPatronPulse, agentOnline, agentLastSeen, walletPublicKey, creatorPublicKey, investorPublicKey, treasuryPublicKey, createdAt, updatedAt",
      )
      .order("createdAt", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      const [cursorDate, cursorId] = cursor.split("|");
      if (cursorDate && cursorId) {
        query = query.or(
          `createdAt.lt.${cursorDate},and(createdAt.eq.${cursorDate},id.lt.${cursorId})`,
        );
      }
    }

    const [{ data: entries }, patronMap] = await Promise.all([
      query,
      countPatronsByTalos(),
    ]);

    const rows = entries ?? [];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const data = page.map((c) => ({
      ...c,
      patrons: patronMap.get(c.id) ?? 0,
    }));

    const lastItem = page[page.length - 1];
    const nextCursor =
      hasMore && lastItem
        ? `${lastItem.createdAt}|${lastItem.id}`
        : null;

    return Response.json({ data, nextCursor });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/talos — Create a new TALOS (Genesis)
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, createTalosSchema);
    if (parsed.error) return parsed.error;

    const {
      name,
      category,
      description,
      totalSupply: supply,
      persona,
      targetAudience,
      channels,
      approvalThreshold,
      gtmBudget,
      creatorPublicKey,
      walletPublicKey,
      onChainId,
      agentName,
      toneVoice,
      initialPrice,
      minPatronPulse,
      tokenSymbol,
      launchFlapToken,
      serviceName,
      serviceDescription,
      servicePrice,
    } = parsed.data;

    const apiKey = `tak_${randomBytes(24).toString("hex")}`;
    const talosId = createId();

    let agentWalletId: string | null = null;
    let agentWalletAddress: string | null = null;
    let agentWalletPrivateKey: string | null = null;
    try {
      const keypair = createAgentKeypair();
      agentWalletId = keypair.address;
      agentWalletAddress = keypair.address;
      agentWalletPrivateKey = keypair.privateKey;
    } catch (err) {
      console.error("EVM keypair creation failed:", err);
    }

    const talosInsert = {
      id: talosId,
      name,
      category,
      description,
      apiKey,
      totalSupply: supply,
      creatorShare: 0,
      investorShare: 0,
      treasuryShare: 100,
      persona,
      targetAudience,
      channels: channels ?? [],
      toneVoice: toneVoice ?? null,
      approvalThreshold: String(approvalThreshold ?? 10),
      gtmBudget: String(gtmBudget ?? 200),
      pulsePrice: String(initialPrice ?? 0),
      minPatronPulse: minPatronPulse ?? null,
      creatorPublicKey,
      walletPublicKey,
      onChainId: onChainId ?? null,
      agentName: agentName ?? null,
      stellarAssetCode: null,
      tokenSymbol: tokenSymbol ?? null,
      agentWalletId,
      agentWalletAddress,
    };

    const { data: talos, error: talosError } = await supabase
      .from("tls_talos")
      .insert(talosInsert)
      .select()
      .single();

    if (talosError || !talos) {
      throw talosError ?? new Error("Failed to create TALOS");
    }

    try {
      const CREATOR_GOVERNANCE_FRACTION = 0.6;
      if (creatorPublicKey) {
        const { error: patronError } = await supabase.from("tls_patrons").insert({
          id: createId(),
          talosId: talos.id,
          stellarPublicKey: creatorPublicKey,
          role: "Creator",
          pulseAmount: Math.floor(supply * CREATOR_GOVERNANCE_FRACTION),
          share: "0",
        });
        if (patronError) throw patronError;
      }

      if (serviceName && servicePrice) {
        const serviceWallet =
          agentWalletAddress || creatorPublicKey || walletPublicKey;
        if (serviceWallet) {
          const { error: serviceError } = await supabase
            .from("tls_commerce_services")
            .insert({
              id: createId(),
              talosId: talos.id,
              serviceName,
              description: serviceDescription ?? description,
              price: String(servicePrice),
              stellarPublicKey: serviceWallet,
            });
          if (serviceError) throw serviceError;
        }
      }
    } catch (err) {
      await rollbackGenesis(talos.id);
      throw err;
    }

    if (agentWalletAddress) {
      fundTestnetAccount(agentWalletAddress).catch(() => {});
    }

    let tokenAddress: string | null = null;
    let memeUrl: string | null = null;
    let memeLaunchTxHash: string | null = null;
    let memeLaunched = false;
    let memeSkipReason: string | null = null;

    const wantsMeme = launchFlapToken !== false && !!tokenSymbol?.trim();
    const beneficiary = (creatorPublicKey || walletPublicKey || OPERATOR_ADDRESS) as `0x${string}` | undefined;

    if (!wantsMeme) {
      memeSkipReason = tokenSymbol ? "flap.sh launch disabled" : "No token symbol";
    } else if (!OPERATOR_KEY) {
      memeSkipReason = "BSC_OPERATOR_PRIVATE_KEY not configured — add to .env.local for flap.sh launch";
    } else if (!beneficiary) {
      memeSkipReason = "No beneficiary address for flap.sh token";
    } else {
      try {
        const launch = await executeMemeLaunch({
          privateKey: OPERATOR_KEY,
          name,
          symbol: tokenSymbol!,
          description: description || `${name} — Talos agent on BSC`,
          preSaleBnb: process.env.FOUR_MEME_LAUNCH_BNB ?? process.env.FLAP_LAUNCH_BNB ?? "0",
        });
        tokenAddress = launch.tokenAddress;
        memeUrl = launch.memeUrl;
        memeLaunchTxHash = launch.txHash;
        memeLaunched = true;
        await supabase
          .from("tls_talos")
          .update({
            stellarAssetCode: launch.tokenAddress,
            flapLaunchTxHash: launch.txHash,
            pulsePrice: "0",
          })
          .eq("id", talos.id);
      } catch (err) {
        console.error("flap.sh launch failed (non-fatal):", err);
        memeSkipReason = err instanceof Error ? err.message : "flap.sh launch failed";
      }
    }

    const { apiKey: _key, ...safeTalos } = talos as TlsTalosRow;
    return Response.json(
      {
        ...safeTalos,
        stellarAssetCode: tokenAddress,
        memeTokenAddress: tokenAddress,
        memeUrl,
        memeLaunchTxHash,
        memeLaunched,
        memeSkipReason,
        // backward-compatible aliases
        flapTokenAddress: tokenAddress,
        flapUrl: memeUrl,
        flapLaunchTxHash: memeLaunchTxHash,
        flapLaunched: memeLaunched,
        flapSkipReason: memeSkipReason,
        apiKeyOnce: apiKey,
        agentWalletKeyOnce: agentWalletPrivateKey,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    console.error("POST /api/talos error:", JSON.stringify({
      message: e?.message,
      code: e?.code,
      detail: e?.detail,
      constraint: e?.constraint,
    }, null, 2));
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
