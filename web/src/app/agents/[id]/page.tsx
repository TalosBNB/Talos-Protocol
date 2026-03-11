export const dynamic = 'force-dynamic';

import { supabase } from "@/db";
import { notFound } from "next/navigation";
import { TalosDetailClient } from "./detail-client";

function getRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export default async function TalosDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [
    { data: talos, error: talosError },
    { data: patrons },
    { data: activities },
    { data: approvals },
    { data: revenues },
    { data: commerceServices },
    { data: commerceJobs },
    { data: allJobs },
  ] = await Promise.all([
    supabase.from("tls_talos").select("*").eq("id", id).maybeSingle(),
    supabase.from("tls_patrons").select("*").eq("talosId", id),
    supabase
      .from("tls_activities")
      .select("*")
      .eq("talosId", id)
      .order("createdAt", { ascending: false })
      .limit(20),
    supabase
      .from("tls_approvals")
      .select("*")
      .eq("talosId", id)
      .order("createdAt", { ascending: false })
      .limit(10),
    supabase
      .from("tls_revenues")
      .select("*")
      .eq("talosId", id)
      .order("createdAt", { ascending: false })
      .limit(20),
    supabase
      .from("tls_commerce_services")
      .select("*")
      .eq("talosId", id)
      .maybeSingle(),
    supabase
      .from("tls_commerce_jobs")
      .select("*")
      .eq("talosId", id)
      .order("createdAt", { ascending: false })
      .limit(10),
    supabase
      .from("tls_commerce_jobs")
      .select("status, amount, createdAt")
      .eq("talosId", id),
  ]);

  if (talosError || !talos) notFound();

  const jobStatsRow = (allJobs ?? []).reduce(
    (acc, j) => {
      acc.total += 1;
      if (j.status === "completed") {
        acc.completed += 1;
        acc.totalRevenue += Number(j.amount);
      }
      if (j.status === "failed") acc.failed += 1;
      if (j.status === "pending") acc.pending += 1;
      if (j.createdAt >= todayIso) acc.jobsToday += 1;
      return acc;
    },
    {
      total: 0,
      completed: 0,
      failed: 0,
      pending: 0,
      totalRevenue: 0,
      jobsToday: 0,
    },
  );

  const totalRevenue = (revenues ?? []).reduce(
    (sum, r) => sum + Number(r.amount),
    0,
  );

  const revenueByMonth = new Map<string, number>();
  for (const r of revenues ?? []) {
    const d = new Date(r.createdAt);
    const key = `${d.toLocaleString("en-US", { month: "short" })} ${String(d.getFullYear()).slice(-2)}`;
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + Number(r.amount));
  }
  const revenueHistory = Array.from(revenueByMonth.entries())
    .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }))
    .slice(-6);

  const todayActivities = (activities ?? []).filter(
    (a) => new Date(a.createdAt) >= todayStart,
  );
  const agentStats = {
    postsToday: todayActivities.filter((a) => a.type === "post").length,
    repliesToday: todayActivities.filter((a) => a.type === "reply").length,
    researchesToday: todayActivities.filter((a) => a.type === "research").length,
  };

  const successRate =
    jobStatsRow.total > 0
      ? Math.round((jobStatsRow.completed / jobStatsRow.total) * 100)
      : null;

  const data = {
    id: talos.id,
    name: talos.name,
    agentName: talos.agentName,
    category: talos.category,
    description: talos.description,
    status: talos.status,
    stellarAssetCode: talos.stellarAssetCode ?? "",
    tokenSymbol: talos.tokenSymbol ?? "",
    hasFlapToken: !!(
      talos.stellarAssetCode?.startsWith("0x") && talos.stellarAssetCode.length === 42
    ),
    pulsePrice: Number(talos.pulsePrice) > 0 ? `$${Number(talos.pulsePrice).toFixed(2)}` : "four.meme curve",
    totalSupply: talos.totalSupply,
    creatorPublicKey: talos.creatorPublicKey,
    persona: talos.persona ?? "",
    targetAudience: talos.targetAudience ?? "",
    channels: talos.channels,
    approvalThreshold: Number(talos.approvalThreshold),
    gtmBudget: Number(talos.gtmBudget),
    minPatronPulse: talos.minPatronPulse,
    investorShare: talos.investorShare,
    agentOnline: talos.agentOnline,
    agentLastSeen: talos.agentLastSeen ?? null,
    agentWalletAddress: talos.agentWalletAddress ?? null,
    xIntegration: {
      configured: !!(talos.xApiKey && talos.xApiKeySecret && talos.xAccessToken && talos.xAccessTokenSecret),
      apiKeyMasked: talos.xApiKey
        ? `${talos.xApiKey.slice(0, 4)}****${talos.xApiKey.slice(-4)}`
        : null,
      accessTokenMasked: talos.xAccessToken
        ? `${talos.xAccessToken.slice(0, 4)}****${talos.xAccessToken.slice(-4)}`
        : null,
    },
    createdAt: talos.createdAt.split("T")[0],
    revenue: `$${totalRevenue.toLocaleString()}`,
    patronCount: (patrons ?? []).length,
    patrons: (patrons ?? []).map((p) => ({
      stellarPublicKey: p.stellarPublicKey,
      role: p.role,
      pulseAmount: p.pulseAmount,
      share: Number(p.share),
      status: p.status,
    })),
    activities: (activities ?? []).map((a) => ({
      id: a.id,
      type: a.type,
      content: a.content,
      channel: a.channel,
      status: a.status,
      timestamp: getRelativeTime(new Date(a.createdAt)),
    })),
    revenueHistory,
    agentStats,
    service: commerceServices
      ? {
          name: commerceServices.serviceName,
          description: commerceServices.description,
          price: Number(commerceServices.price),
          currency: commerceServices.currency,
          stellarPublicKey: commerceServices.stellarPublicKey,
          chains: commerceServices.chains,
        }
      : null,
    jobStats: {
      total: jobStatsRow.total,
      completed: jobStatsRow.completed,
      failed: jobStatsRow.failed,
      pending: jobStatsRow.pending,
      successRate,
      totalRevenue: jobStatsRow.totalRevenue,
      jobsToday: jobStatsRow.jobsToday,
    },
    recentJobs: (commerceJobs ?? []).map((j) => ({
      id: j.id,
      serviceName: j.serviceName,
      status: j.status,
      amount: Number(j.amount),
      createdAt: getRelativeTime(new Date(j.createdAt)),
    })),
  };

  return <TalosDetailClient talos={data} />;
}
