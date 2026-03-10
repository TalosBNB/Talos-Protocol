import { NextRequest } from "next/server";
import { supabase } from "@/db";
import type { TlsPlaybooksRow, TlsTalosRow } from "@/lib/supabase/types";

// GET /api/playbooks/purchased?wallet=G... — Playbooks purchased by wallet
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet");

    if (!wallet) {
      return Response.json(
        { error: "wallet query param is required" },
        { status: 400 }
      );
    }

    const { data: purchases, error } = await supabase
      .from("tls_playbook_purchases")
      .select("*")
      .eq("buyerPublicKey", wallet)
      .order("createdAt", { ascending: false });

    if (error) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    const purchaseRows = purchases ?? [];
    const playbookIds = [...new Set(purchaseRows.map((p) => p.playbookId))];

    const { data: playbookRows } = playbookIds.length > 0
      ? await supabase.from("tls_playbooks").select("*").in("id", playbookIds)
      : { data: [] as TlsPlaybooksRow[] };

    const playbookMap = new Map((playbookRows ?? []).map((p) => [p.id, p]));

    const talosIds = [...new Set((playbookRows ?? []).map((p) => p.talosId))];
    const { data: talosRows } = talosIds.length > 0
      ? await supabase.from("tls_talos").select("id, name").in("id", talosIds)
      : { data: [] as Pick<TlsTalosRow, "id" | "name">[] };

    const talosMap = new Map((talosRows ?? []).map((t) => [t.id, t.name]));

    const data = purchaseRows.map((pp) => {
      const playbook = playbookMap.get(pp.playbookId);
      return {
        purchaseId: pp.id,
        appliedAt: pp.appliedAt,
        txHash: pp.txHash,
        purchasedAt: pp.createdAt,
        playbook: playbook
          ? {
              id: playbook.id,
              title: playbook.title,
              talos: talosMap.get(playbook.talosId) ?? "Unknown",
              category: playbook.category,
              channel: playbook.channel,
              price: playbook.price,
              version: playbook.version,
            }
          : null,
      };
    });

    return Response.json(data);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
