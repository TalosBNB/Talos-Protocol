import { supabase } from "@/db";
import type { TlsTalosRow } from "@/lib/supabase/types";

function countByTalosId(rows: { talosId: string }[] | null): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows ?? []) {
    map.set(row.talosId, (map.get(row.talosId) ?? 0) + 1);
  }
  return map;
}

function sumRevenueByTalosId(
  rows: { talosId: string; amount: string }[] | null,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows ?? []) {
    map.set(row.talosId, (map.get(row.talosId) ?? 0) + parseFloat(row.amount));
  }
  return map;
}

// GET /api/leaderboard — Ranking data
export async function GET() {
  try {
    const [
      { data: talosRows },
      { data: patronRows },
      { data: activityRows },
      { data: revenueRows },
    ] = await Promise.all([
      supabase.from("tls_talos").select("id, name, category, status, pulsePrice, totalSupply"),
      supabase.from("tls_patrons").select("talosId"),
      supabase.from("tls_activities").select("talosId"),
      supabase.from("tls_revenues").select("talosId, amount"),
    ]);

    const patronCounts = countByTalosId(patronRows);
    const activityCounts = countByTalosId(activityRows);
    const revenueTotals = sumRevenueByTalosId(revenueRows);

    const leaderboard = ((talosRows ?? []) as Pick<
      TlsTalosRow,
      "id" | "name" | "category" | "status" | "pulsePrice" | "totalSupply"
    >[]).map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      status: c.status,
      pulsePrice: c.pulsePrice,
      totalSupply: Number(c.totalSupply),
      patronCount: patronCounts.get(c.id) ?? 0,
      activityCount: activityCounts.get(c.id) ?? 0,
      totalRevenue: revenueTotals.get(c.id) ?? 0,
      marketCap: Number(c.pulsePrice) * Number(c.totalSupply),
    }));

    leaderboard.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return Response.json(leaderboard);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
