import { NextRequest } from "next/server";
import { supabase } from "@/db";
import type { TlsCommerceServicesRow, TlsTalosRow } from "@/lib/supabase/types";

// GET /api/services — Discover available services across all TALOS agents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category");
    const selfId = searchParams.get("self");
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 100);

    let categoryTalosIds: string[] | null = null;
    if (category) {
      const { data: matchingTalos } = await supabase
        .from("tls_talos")
        .select("id")
        .ilike("category", category);
      categoryTalosIds = (matchingTalos ?? []).map((t) => t.id);
      if (categoryTalosIds.length === 0) {
        return Response.json({ data: [], nextCursor: null });
      }
    }

    let query = supabase
      .from("tls_commerce_services")
      .select("*")
      .order("createdAt", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (selfId) {
      query = query.neq("talosId", selfId);
    }

    if (categoryTalosIds) {
      query = query.in("talosId", categoryTalosIds);
    }

    if (cursor) {
      const [cursorDate, cursorId] = cursor.split("|");
      if (cursorDate && cursorId) {
        query = query.or(
          `createdAt.lt.${cursorDate},and(createdAt.eq.${cursorDate},id.lt.${cursorId})`,
        );
      }
    }

    const { data: services, error } = await query;

    if (error) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    const serviceRows = (services ?? []) as TlsCommerceServicesRow[];
    const hasMore = serviceRows.length > limit;
    const page = hasMore ? serviceRows.slice(0, limit) : serviceRows;

    const talosIds = [...new Set(page.map((s) => s.talosId))];
    const { data: talosRows } = talosIds.length > 0
      ? await supabase.from("tls_talos").select("id, name, category").in("id", talosIds)
      : { data: [] as Pick<TlsTalosRow, "id" | "name" | "category">[] };

    const talosMap = new Map((talosRows ?? []).map((t) => [t.id, t]));
    const sellerUrl = (process.env.SELLER_PUBLIC_URL ?? "http://localhost:4021").replace(/\/$/, "");

    let results = page.map((s) => {
      const talos = talosMap.get(s.talosId);
      return {
        talosId: s.talosId,
        talosName: talos?.name ?? "Unknown",
        talosCategory: talos?.category ?? "",
        serviceName: s.serviceName,
        description: s.description,
        price: Number(s.price),
        currency: s.currency,
        chains: s.chains,
        serviceUrl: `${sellerUrl}/buy/${s.talosId}`,
      };
    });

    for (let i = results.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [results[i], results[j]] = [results[j], results[i]];
    }

    const lastItem = page[page.length - 1];
    const nextCursor = hasMore && lastItem
      ? `${lastItem.createdAt}|${lastItem.id}`
      : null;

    return Response.json({ data: results, nextCursor });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
