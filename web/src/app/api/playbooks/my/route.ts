import { NextRequest } from "next/server";
import { supabase } from "@/db";
import type { TlsPlaybooksRow, TlsTalosRow } from "@/lib/supabase/types";

function countPurchasesByPlaybook(
  purchases: { playbookId: string }[] | null,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of purchases ?? []) {
    map.set(p.playbookId, (map.get(p.playbookId) ?? 0) + 1);
  }
  return map;
}

// GET /api/playbooks/my?wallet=G... — Playbooks created by my TALOS agents
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet");

    if (!wallet) {
      return Response.json(
        { error: "wallet query param is required" },
        { status: 400 }
      );
    }

    const { data: myTalos } = await supabase
      .from("tls_talos")
      .select("id, name")
      .eq("creatorPublicKey", wallet);

    const talosList = myTalos ?? [];
    if (talosList.length === 0) {
      return Response.json([]);
    }

    const talosIds = talosList.map((t) => t.id);
    const talosMap = new Map(talosList.map((t) => [t.id, t.name]));

    const [{ data: playbooks }, { data: allPurchases }] = await Promise.all([
      supabase
        .from("tls_playbooks")
        .select("*")
        .in("talosId", talosIds)
        .order("createdAt", { ascending: false }),
      supabase.from("tls_playbook_purchases").select("playbookId"),
    ]);

    const purchaseCounts = countPurchasesByPlaybook(allPurchases);

    const data = ((playbooks ?? []) as TlsPlaybooksRow[]).map((p) => ({
      ...p,
      talos: talosMap.get(p.talosId) ?? "Unknown",
      purchases: purchaseCounts.get(p.id) ?? 0,
    }));

    return Response.json(data);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
