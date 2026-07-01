export const dynamic = 'force-dynamic';

import { supabase } from "@/db";
import { HomeContent } from "./home-content";

const DEFAULT_STATS = [
  { label: "Active TALOS", value: "0" },
  { label: "Total Revenue", value: "$0" },
  { label: "Agents Running", value: "0" },
  { label: "Activities", value: "0" },
];

async function getStats() {
  try {
    const [
      { count: activeCount },
      { data: revenueRows },
      { count: agentCount },
      { count: activityCount },
    ] = await Promise.all([
      supabase
        .from("tls_talos")
        .select("*", { count: "exact", head: true })
        .eq("status", "Active"),
      supabase.from("tls_revenues").select("amount"),
      supabase
        .from("tls_talos")
        .select("*", { count: "exact", head: true })
        .eq("agentOnline", true),
      supabase
        .from("tls_activities")
        .select("*", { count: "exact", head: true }),
    ]);

    const revenue =
      revenueRows?.reduce((sum, r) => sum + Number(r.amount), 0) ?? 0;
    const fmtRevenue =
      revenue >= 1000 ? `$${(revenue / 1000).toFixed(1)}K` : `$${revenue.toFixed(0)}`;

    const activities = activityCount ?? 0;

    return [
      { label: "Active TALOS", value: String(activeCount ?? 0) },
      { label: "Total Revenue", value: fmtRevenue },
      { label: "Agents Running", value: String(agentCount ?? 0) },
      {
        label: "Activities",
        value:
          activities >= 1000
            ? `${(activities / 1000).toFixed(1)}K`
            : String(activities),
      },
    ];
  } catch (err) {
    console.error("[home] stats query failed:", err);
    return DEFAULT_STATS;
  }
}

export default async function Home() {
  const stats = await getStats();
  return <HomeContent stats={stats} />;
}
