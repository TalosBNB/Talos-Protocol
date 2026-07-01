export const dynamic = 'force-dynamic';

import { supabase } from "@/db";
import { AgentsClient } from "./agents-client";

function aggregateCounts<T extends { talosId: string }>(
  rows: T[] | null,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows ?? []) {
    map.set(row.talosId, (map.get(row.talosId) ?? 0) + 1);
  }
  return map;
}

function aggregateRevenue(
  rows: { talosId: string; amount: string }[] | null,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows ?? []) {
    map.set(row.talosId, (map.get(row.talosId) ?? 0) + Number(row.amount));
  }
  return map;
}

function aggregateJobs(
  rows: { talosId: string; status: string }[] | null,
): Map<string, { total: number; completed: number }> {
  const map = new Map<string, { total: number; completed: number }>();
  for (const row of rows ?? []) {
    const current = map.get(row.talosId) ?? { total: 0, completed: 0 };
    current.total += 1;
    if (row.status === "completed") current.completed += 1;
    map.set(row.talosId, current);
  }
  return map;
}

function latestActivityByTalos(
  rows: { talosId: string; createdAt: string }[] | null,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows ?? []) {
    if (!map.has(row.talosId)) {
      map.set(row.talosId, row.createdAt);
    }
  }
  return map;
}

export default async function AgentsPage() {
  const [
    { data: agents },
    { data: patronRows },
    { data: revenueRows },
    { data: jobRows },
    { data: services },
    { data: activityRows },
  ] = await Promise.all([
    supabase
      .from("tls_talos")
      .select("*")
      .order("createdAt", { ascending: false }),
    supabase.from("tls_patrons").select("talosId"),
    supabase.from("tls_revenues").select("talosId, amount"),
    supabase.from("tls_commerce_jobs").select("talosId, status"),
    supabase.from("tls_commerce_services").select("*"),
    supabase
      .from("tls_activities")
      .select("talosId, createdAt")
      .order("createdAt", { ascending: false }),
  ]);

  const patronMap = aggregateCounts(patronRows);
  const revenueMap = aggregateRevenue(revenueRows);
  const jobMap = aggregateJobs(jobRows);
  const activityMap = latestActivityByTalos(activityRows);
  const serviceMap = new Map(
    (services ?? []).map((s) => [s.talosId, s]),
  );

  const data = (agents ?? []).map((c) => {
    const totalRevenue = revenueMap.get(c.id) ?? 0;
    const jobs = jobMap.get(c.id) ?? { total: 0, completed: 0 };
    const successRate =
      jobs.total > 0 ? Math.round((jobs.completed / jobs.total) * 100) : null;
    const lastActivity = activityMap.get(c.id) ?? null;
    const commerceServices = serviceMap.get(c.id) ?? null;

    return {
      id: c.id,
      name: c.name,
      agentName: c.agentName,
      category: c.category,
      description: c.description,
      status: c.status,
      agentOnline: c.agentOnline,
      agentLastSeen: c.agentLastSeen ?? null,
      patrons: patronMap.get(c.id) ?? 0,
      revenue: totalRevenue,
      revenueDisplay: `$${totalRevenue.toLocaleString()}`,
      pulsePrice: Number(c.pulsePrice),
      pulsePriceDisplay: Number(c.pulsePrice) > 0 ? `$${Number(c.pulsePrice).toFixed(2)}` : "flap.sh curve",
      serviceName: commerceServices?.serviceName ?? null,
      serviceDescription: commerceServices?.description ?? null,
      servicePrice: commerceServices ? Number(commerceServices.price) : null,
      servicePriceDisplay: commerceServices
        ? `${Number(commerceServices.price)} ${commerceServices.currency}`
        : null,
      serviceCurrency: commerceServices?.currency ?? null,
      framework: c.description.includes("OpenClaw") ? "openclaw" : null,
      channels: c.channels,
      totalJobs: jobs.total,
      completedJobs: jobs.completed,
      successRate,
      lastActivity,
      createdAt: c.createdAt,
    };
  });

  return <AgentsClient agents={data} />;
}
