export const dynamic = 'force-dynamic';

import { supabase } from "@/db";
import type {
  TlsActivitiesRow,
  TlsPatronsRow,
  TlsRevenuesRow,
  TlsTalosRow,
} from "@/lib/supabase/types";
import { LeaderboardClient } from "./leaderboard-client";

type TalosWithRelations = TlsTalosRow & {
  patrons: TlsPatronsRow[];
  revenues: TlsRevenuesRow[];
  activities: TlsActivitiesRow[];
};

export default async function LeaderboardPage() {
  const [
    { data: talosRows },
    { data: patronRows },
    { data: revenueRows },
    { data: activityRows },
  ] = await Promise.all([
    supabase.from("tls_talos").select("*").order("createdAt", { ascending: true }),
    supabase.from("tls_patrons").select("*"),
    supabase.from("tls_revenues").select("*"),
    supabase.from("tls_activities").select("*"),
  ]);

  const patronsByTalos = new Map<string, TlsPatronsRow[]>();
  const revenuesByTalos = new Map<string, TlsRevenuesRow[]>();
  const activitiesByTalos = new Map<string, TlsActivitiesRow[]>();

  for (const p of patronRows ?? []) {
    const list = patronsByTalos.get(p.talosId) ?? [];
    list.push(p);
    patronsByTalos.set(p.talosId, list);
  }
  for (const r of revenueRows ?? []) {
    const list = revenuesByTalos.get(r.talosId) ?? [];
    list.push(r);
    revenuesByTalos.set(r.talosId, list);
  }
  for (const a of activityRows ?? []) {
    const list = activitiesByTalos.get(a.talosId) ?? [];
    list.push(a);
    activitiesByTalos.set(a.talosId, list);
  }

  const agents: TalosWithRelations[] = ((talosRows ?? []) as TlsTalosRow[]).map((c) => ({
    ...c,
    patrons: patronsByTalos.get(c.id) ?? [],
    revenues: revenuesByTalos.get(c.id) ?? [],
    activities: activitiesByTalos.get(c.id) ?? [],
  }));

  const topTalos = agents
    .map((c) => {
      const totalRevenue = c.revenues.reduce((sum, r) => sum + Number(r.amount), 0);
      return {
        id: c.id,
        name: c.name,
        category: c.category,
        revenue: totalRevenue,
        marketCap: Number(c.pulsePrice) * Number(c.totalSupply),
        patrons: c.patrons.length,
        pulsePrice: Number(c.pulsePrice),
        activityCount: c.activities.length,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .map((e, i) => ({
      ...e,
      rank: i + 1,
      revenueStr: `$${e.revenue.toLocaleString()}`,
      marketCapStr: e.marketCap >= 1_000_000
        ? `$${(e.marketCap / 1_000_000).toFixed(1)}M`
        : `$${(e.marketCap / 1000).toFixed(0)}K`,
    }));

  const patronMap = new Map<string, { wallet: string; totalPulse: number; talosCount: number; roles: string[] }>();
  for (const c of agents) {
    for (const p of c.patrons) {
      if (p.status !== "active") continue;
      const existing = patronMap.get(p.stellarPublicKey) ?? {
        wallet: p.stellarPublicKey,
        totalPulse: 0,
        talosCount: 0,
        roles: [],
      };
      existing.totalPulse += Number(p.pulseAmount);
      existing.talosCount++;
      if (!existing.roles.includes(p.role)) existing.roles.push(p.role);
      patronMap.set(p.stellarPublicKey, existing);
    }
  }
  const topPatrons = Array.from(patronMap.values())
    .sort((a, b) => b.totalPulse - a.totalPulse)
    .slice(0, 50)
    .map((p, i) => ({
      rank: i + 1,
      wallet: p.wallet,
      totalPulse: p.totalPulse,
      talosCount: p.talosCount,
      roles: p.roles,
    }));

  const topAgents = agents
    .filter((c) => c.status === "Active")
    .map((c) => {
      const totalRevenue = c.revenues.reduce((sum, r) => sum + Number(r.amount), 0);
      const posts = c.activities.filter((a) => a.type === "post").length;
      const replies = c.activities.filter((a) => a.type === "reply").length;
      const commerce = c.activities.filter((a) => a.type === "commerce").length;
      return {
        id: c.id,
        name: c.name,
        category: c.category,
        activityCount: c.activities.length,
        posts,
        replies,
        commerce,
        revenue: totalRevenue,
        online: c.agentOnline,
      };
    })
    .sort((a, b) => b.activityCount - a.activityCount)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const trending = agents
    .map((c) => {
      const recentRevenue = c.revenues
        .filter((r) => new Date(r.createdAt) >= sevenDaysAgo)
        .reduce((sum, r) => sum + Number(r.amount), 0);
      const recentPatrons = c.patrons.filter((p) => new Date(p.createdAt) >= sevenDaysAgo).length;
      const recentActivity = c.activities.filter((a) => new Date(a.createdAt) >= sevenDaysAgo).length;
      return {
        id: c.id,
        name: c.name,
        category: c.category,
        recentRevenue,
        recentPatrons,
        recentActivity,
        pulsePrice: Number(c.pulsePrice),
        score: recentRevenue * 10 + recentPatrons * 5 + recentActivity,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  return (
    <LeaderboardClient
      topTalos={topTalos}
      topPatrons={topPatrons}
      topAgents={topAgents}
      trending={trending}
    />
  );
}
