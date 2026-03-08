import { supabase } from "@/db";
import type { TlsTalosRow } from "@/lib/supabase/types";

export type Transaction = {
  id: string;
  type: "service" | "playbook";
  sellerName: string;
  sellerAgent: string | null;
  buyerName: string;
  buyerAgent: string | null;
  itemName: string;
  amount: number;
  currency: string;
  status: string;
  timestamp: string;
  txHash: string | null;
};

export type ActivityStats = {
  totalTransactions: number;
  totalVolume: number;
  activeAgents: number;
  totalAgents: number;
  registeredServices: number;
  playbooksTraded: number;
};

function talosMap(rows: TlsTalosRow[] | null): Map<string, TlsTalosRow> {
  return new Map((rows ?? []).map((t) => [t.id, t]));
}

async function resolveBuyerTalos(
  buyerPublicKey: string,
): Promise<TlsTalosRow | null> {
  const { data: byId } = await supabase
    .from("tls_talos")
    .select("*")
    .eq("id", buyerPublicKey)
    .maybeSingle();
  if (byId) return byId;

  const { data: byAgent } = await supabase
    .from("tls_talos")
    .select("*")
    .eq("agentName", buyerPublicKey)
    .maybeSingle();
  return byAgent;
}

export async function fetchActivityStats(): Promise<ActivityStats> {
  const [
    { data: talosRows },
    { count: registeredServiceCount },
    { data: jobs },
    { data: purchases },
    { data: playbooks },
  ] = await Promise.all([
    supabase.from("tls_talos").select("id, agentOnline"),
    supabase
      .from("tls_commerce_services")
      .select("*", { count: "exact", head: true }),
    supabase.from("tls_commerce_jobs").select("amount"),
    supabase.from("tls_playbook_purchases").select("playbookId"),
    supabase.from("tls_playbooks").select("id, price"),
  ]);

  const totalAgents = talosRows?.length ?? 0;
  const activeAgents =
    talosRows?.filter((t) => t.agentOnline).length ?? 0;

  const jobVolume =
    jobs?.reduce((sum, j) => sum + Number(j.amount), 0) ?? 0;
  const playbookPriceMap = new Map(
    (playbooks ?? []).map((p) => [p.id, Number(p.price)]),
  );
  const pbVolume =
    purchases?.reduce(
      (sum, p) => sum + (playbookPriceMap.get(p.playbookId) ?? 0),
      0,
    ) ?? 0;

  return {
    totalTransactions: (jobs?.length ?? 0) + (purchases?.length ?? 0),
    totalVolume: jobVolume + pbVolume,
    activeAgents,
    totalAgents,
    registeredServices: registeredServiceCount ?? 0,
    playbooksTraded: purchases?.length ?? 0,
  };
}

export async function fetchActivityTransactions(
  limit: number,
  cursor?: string | null,
): Promise<{ transactions: Transaction[]; nextCursor: string | null }> {
  let cursorDate: string | null = null;
  if (cursor) {
    const dateStr = cursor.split("|")[0];
    if (dateStr) cursorDate = dateStr;
  }

  let jobsQuery = supabase
    .from("tls_commerce_jobs")
    .select("*")
    .order("createdAt", { ascending: false })
    .limit(limit + 1);

  if (cursorDate) {
    jobsQuery = jobsQuery.lt("createdAt", cursorDate);
  }

  let purchasesQuery = supabase
    .from("tls_playbook_purchases")
    .select("*")
    .order("createdAt", { ascending: false })
    .limit(limit + 1);

  if (cursorDate) {
    purchasesQuery = purchasesQuery.lt("createdAt", cursorDate);
  }

  const [{ data: jobs }, { data: purchases }] = await Promise.all([
    jobsQuery,
    purchasesQuery,
  ]);

  const playbookIds = [...new Set((purchases ?? []).map((p) => p.playbookId))];
  const { data: playbookRows } =
    playbookIds.length > 0
      ? await supabase
          .from("tls_playbooks")
          .select("id, title, price, currency, talosId")
          .in("id", playbookIds)
      : { data: [] };
  const playbookMap = new Map((playbookRows ?? []).map((p) => [p.id, p]));

  const talosIds = new Set<string>();
  for (const j of jobs ?? []) {
    talosIds.add(j.talosId);
    talosIds.add(j.requesterTalosId);
  }
  for (const p of purchases ?? []) {
    const playbook = playbookMap.get(p.playbookId);
    if (playbook?.talosId) talosIds.add(playbook.talosId);
  }

  const { data: talosRows } =
    talosIds.size > 0
      ? await supabase
          .from("tls_talos")
          .select("id, name, agentName")
          .in("id", [...talosIds])
      : { data: [] as TlsTalosRow[] };

  const talosById = talosMap(talosRows as TlsTalosRow[]);

  const transactions: Transaction[] = [];

  for (const j of jobs ?? []) {
    const seller = talosById.get(j.talosId);
    const buyer = talosById.get(j.requesterTalosId);
    transactions.push({
      id: j.id,
      type: "service",
      sellerName: seller?.name ?? "Unknown",
      sellerAgent: seller?.agentName ?? null,
      buyerName: buyer?.name ?? "Unknown",
      buyerAgent: buyer?.agentName ?? null,
      itemName: j.serviceName,
      amount: Number(j.amount),
      currency: "USDC",
      status: j.status,
      timestamp: j.createdAt,
      txHash: j.txHash ?? null,
    });
  }

  for (const p of purchases ?? []) {
    const pb = playbookMap.get(p.playbookId);
    const seller = pb ? talosById.get(pb.talosId) : undefined;
    const buyerTalos = await resolveBuyerTalos(p.buyerPublicKey);

    transactions.push({
      id: p.id,
      type: "playbook",
      sellerName: seller?.name ?? "Unknown",
      sellerAgent: seller?.agentName ?? null,
      buyerName:
        buyerTalos?.name ??
        `${p.buyerPublicKey.slice(0, 6)}...${p.buyerPublicKey.slice(-4)}`,
      buyerAgent: buyerTalos?.agentName ?? null,
      itemName: pb?.title ?? "Playbook",
      amount: Number(pb?.price ?? 0),
      currency: pb?.currency ?? "USDC",
      status: "completed",
      timestamp: p.createdAt,
      txHash: p.txHash ?? null,
    });
  }

  transactions.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const hasMore = transactions.length > limit;
  const page = hasMore ? transactions.slice(0, limit) : transactions;

  const lastItem = page[page.length - 1];
  const nextCursor = hasMore && lastItem ? lastItem.timestamp : null;

  return { transactions: page, nextCursor };
}
