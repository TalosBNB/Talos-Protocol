import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/db";
import type {
  TlsActivitiesRow,
  TlsApprovalsRow,
  TlsPatronsRow,
  TlsRevenuesRow,
  TlsTalosRow,
} from "@/lib/supabase/types";

import { hasFlapToken, maskSecret } from "@/lib/talos-token";

function maskApiKey(key: string | null): string | null {
  if (!key || key.length < 12) return null;
  return `${key.slice(0, 8)}${"*".repeat(key.length - 12)}${key.slice(-4)}`;
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet parameter required" }, { status: 400 });
  }

  const addr = wallet;

  const { data: patronTalosIds } = await supabase
    .from("tls_patrons")
    .select("talosId")
    .eq("stellarPublicKey", addr);

  const patronIds = (patronTalosIds ?? []).map((p) => p.talosId);

  const { data: ownerTalos } = await supabase
    .from("tls_talos")
    .select("id")
    .or(
      `walletPublicKey.eq.${addr},creatorPublicKey.eq.${addr},investorPublicKey.eq.${addr},treasuryPublicKey.eq.${addr}`,
    );

  const ownerIds = (ownerTalos ?? []).map((t) => t.id);
  const allTalosIds = [...new Set([...patronIds, ...ownerIds])];

  if (allTalosIds.length === 0) {
    return NextResponse.json({
      stats: {
        totalValue: "$0",
        activeTalos: 0,
        totalRevenue: "$0.00",
        pendingCount: 0,
      },
      approvals: [],
      approvalHistory: [],
      activities: [],
      agents: [],
      revenueStreams: [],
      talosManagement: [],
    });
  }

  const [
    { data: talosRows },
    { data: approvals },
    { data: activities },
    { data: revenues },
    { data: patrons },
  ] = await Promise.all([
    supabase.from("tls_talos").select("*").in("id", allTalosIds),
    supabase.from("tls_approvals").select("*").in("talosId", allTalosIds).order("createdAt", { ascending: false }),
    supabase.from("tls_activities").select("*").in("talosId", allTalosIds).order("createdAt", { ascending: false }),
    supabase.from("tls_revenues").select("*").in("talosId", allTalosIds).order("createdAt", { ascending: false }),
    supabase.from("tls_patrons").select("*").in("talosId", allTalosIds),
  ]);

  type TalosWithRelations = TlsTalosRow & {
    approvals: TlsApprovalsRow[];
    activities: TlsActivitiesRow[];
    revenues: TlsRevenuesRow[];
    patrons: TlsPatronsRow[];
  };

  const approvalsByTalos = new Map<string, TlsApprovalsRow[]>();
  const activitiesByTalos = new Map<string, TlsActivitiesRow[]>();
  const revenuesByTalos = new Map<string, TlsRevenuesRow[]>();
  const patronsByTalos = new Map<string, TlsPatronsRow[]>();

  for (const a of approvals ?? []) {
    const list = approvalsByTalos.get(a.talosId) ?? [];
    list.push(a);
    approvalsByTalos.set(a.talosId, list);
  }
  for (const a of activities ?? []) {
    const list = activitiesByTalos.get(a.talosId) ?? [];
    list.push(a);
    activitiesByTalos.set(a.talosId, list);
  }
  for (const r of revenues ?? []) {
    const list = revenuesByTalos.get(r.talosId) ?? [];
    list.push(r);
    revenuesByTalos.set(r.talosId, list);
  }
  for (const p of patrons ?? []) {
    const list = patronsByTalos.get(p.talosId) ?? [];
    list.push(p);
    patronsByTalos.set(p.talosId, list);
  }

  const talosWithRelations: TalosWithRelations[] = ((talosRows ?? []) as TlsTalosRow[]).map((c) => ({
    ...c,
    approvals: approvalsByTalos.get(c.id) ?? [],
    activities: (activitiesByTalos.get(c.id) ?? []).slice(0, 10),
    revenues: revenuesByTalos.get(c.id) ?? [],
    patrons: patronsByTalos.get(c.id) ?? [],
  }));

  const totalValue = talosWithRelations.reduce(
    (sum, c) => sum + Number(c.pulsePrice) * Number(c.totalSupply),
    0,
  );
  const totalRevenue = talosWithRelations.reduce(
    (sum, c) => sum + c.revenues.reduce((rs, r) => rs + Number(r.amount), 0),
    0,
  );

  const pendingApprovals = talosWithRelations.flatMap((c) =>
    c.approvals
      .filter((a) => a.status === "pending")
      .map((a) => ({
        id: a.id,
        talosId: c.id,
        talosName: c.name,
        type: a.type,
        title: a.title,
        description: a.description,
        amount: a.amount ? `$${Number(a.amount)}` : null,
        timestamp: a.createdAt,
      })),
  );

  const approvalHistory = talosWithRelations
    .flatMap((c) =>
      c.approvals
        .filter((a) => a.status === "approved" || a.status === "rejected")
        .map((a) => ({
          id: a.id,
          talosId: c.id,
          talosName: c.name,
          type: a.type,
          title: a.title,
          description: a.description,
          amount: a.amount ? `$${Number(a.amount)}` : null,
          status: a.status as "approved" | "rejected",
          decidedBy: a.decidedBy,
          decidedAt: a.decidedAt ?? null,
          txHash: a.txHash ?? null,
          timestamp: a.createdAt,
        })),
    )
    .sort(
      (a, b) =>
        new Date(b.decidedAt ?? b.timestamp).getTime() -
        new Date(a.decidedAt ?? a.timestamp).getTime(),
    )
    .slice(0, 50);

  const allActivities = talosWithRelations
    .flatMap((c) =>
      c.activities.map((a) => ({
        id: a.id,
        talosName: c.name,
        action: a.content,
        status: a.status,
        timestamp: a.createdAt,
      })),
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  const agents = talosWithRelations.map((c) => ({
    name: c.name,
    status: c.agentOnline ? "online" : "offline",
    lastActive: c.agentLastSeen ? getRelativeTime(new Date(c.agentLastSeen)) : "never",
  }));

  const revenueStreams = talosWithRelations
    .map((c) => {
      const talosRevenue = c.revenues.reduce((s, r) => s + Number(r.amount), 0);
      const bySource: Record<string, number> = {};
      for (const r of c.revenues) {
        bySource[r.source] = (bySource[r.source] ?? 0) + Number(r.amount);
      }
      return {
        talosId: c.id,
        talosName: c.name,
        totalRevenue: talosRevenue,
        bySource,
        recentTx: c.revenues.slice(0, 5).map((r) => ({
          amount: Number(r.amount),
          source: r.source,
          currency: r.currency,
          date: r.createdAt,
        })),
      };
    })
    .filter((r) => r.totalRevenue > 0);

  const talosManagement = talosWithRelations.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    approvalThreshold: Number(c.approvalThreshold),
    gtmBudget: Number(c.gtmBudget),
    channels: c.channels,
    stellarAssetCode: c.stellarAssetCode ?? "",
    tokenSymbol: c.tokenSymbol ?? null,
    hasFlapToken: hasFlapToken(c.stellarAssetCode),
    agentWalletAddress: c.agentWalletAddress ?? null,
    totalSupply: Number(c.totalSupply),
    pulsePrice: Number(c.pulsePrice),
    apiKeyMasked: maskApiKey(c.apiKey),
    apiKeyRaw: c.apiKey,
    xIntegration: {
      configured: !!(c.xApiKey && c.xApiKeySecret && c.xAccessToken && c.xAccessTokenSecret),
      apiKeyMasked: maskSecret(c.xApiKey),
      accessTokenMasked: maskSecret(c.xAccessToken),
    },
  }));

  return NextResponse.json({
    stats: {
      totalValue: `$${Math.round(totalValue).toLocaleString()}`,
      activeTalos: talosWithRelations.filter((c) => c.status === "Active").length,
      totalRevenue: `$${totalRevenue.toFixed(2)}`,
      pendingCount: pendingApprovals.length,
    },
    approvals: pendingApprovals,
    approvalHistory,
    activities: allActivities,
    agents,
    revenueStreams,
    talosManagement,
  });
}

function getRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
