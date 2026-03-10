import { NextRequest } from "next/server";
import { supabase, createId } from "@/db";
import type { TlsPlaybooksRow, TlsTalosRow } from "@/lib/supabase/types";

const VALID_CATEGORIES = [
  "Channel Strategy",
  "Content Templates",
  "Targeting",
  "Response",
  "Growth Hacks",
];
const VALID_CHANNELS = ["X", "LinkedIn", "Reddit", "Product Hunt"];

function countPurchasesByPlaybook(
  purchases: { playbookId: string }[] | null,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of purchases ?? []) {
    map.set(p.playbookId, (map.get(p.playbookId) ?? 0) + 1);
  }
  return map;
}

// GET /api/playbooks — List playbooks (with optional filters and cursor pagination)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category");
    const channel = searchParams.get("channel");
    const search = searchParams.get("search");
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 100);

    let query = supabase
      .from("tls_playbooks")
      .select("*")
      .eq("status", "active")
      .order("createdAt", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (category && category !== "All") {
      query = query.eq("category", category);
    }
    if (channel && channel !== "All") {
      query = query.eq("channel", channel);
    }
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`,
      );
    }
    if (cursor) {
      const [cursorDate, cursorId] = cursor.split("|");
      if (cursorDate && cursorId) {
        query = query.or(
          `createdAt.lt.${cursorDate},and(createdAt.eq.${cursorDate},id.lt.${cursorId})`,
        );
      }
    }

    const [{ data: playbooks }, { data: allPurchases }] = await Promise.all([
      query,
      supabase.from("tls_playbook_purchases").select("playbookId"),
    ]);

    const rows = (playbooks ?? []) as TlsPlaybooksRow[];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const talosIds = [...new Set(page.map((p) => p.talosId))];
    const { data: talosRows } = talosIds.length > 0
      ? await supabase.from("tls_talos").select("id, name").in("id", talosIds)
      : { data: [] as Pick<TlsTalosRow, "id" | "name">[] };

    const talosMap = new Map((talosRows ?? []).map((t) => [t.id, t.name]));
    const purchaseCounts = countPurchasesByPlaybook(allPurchases);

    const data = page.map((p) => ({
      ...p,
      talos: talosMap.get(p.talosId) ?? "Unknown",
      purchases: purchaseCounts.get(p.id) ?? 0,
    }));

    const lastItem = page[page.length - 1];
    const nextCursor = hasMore && lastItem
      ? `${lastItem.createdAt}|${lastItem.id}`
      : null;

    return Response.json({ data, nextCursor });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/playbooks — Create a playbook (requires TALOS apiKey)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json(
        { error: "Missing Authorization header. Use: Bearer <api_key>" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const { data: talos } = await supabase
      .from("tls_talos")
      .select("id, apiKey")
      .eq("apiKey", token)
      .maybeSingle();

    if (!talos) {
      return Response.json({ error: "Invalid API key" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      category,
      channel,
      description,
      price,
      tags,
      content,
      impressions,
      engagementRate,
      conversions,
      periodDays,
    } = body;

    if (!title || !category || !channel || !description || price == null) {
      return Response.json(
        { error: "title, category, channel, description, price are required" },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return Response.json(
        { error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!VALID_CHANNELS.includes(channel)) {
      return Response.json(
        { error: `channel must be one of: ${VALID_CHANNELS.join(", ")}` },
        { status: 400 }
      );
    }

    if (typeof price !== "number" || price <= 0) {
      return Response.json(
        { error: "price must be a positive number" },
        { status: 400 }
      );
    }

    const { data: playbook, error } = await supabase
      .from("tls_playbooks")
      .insert({
        id: createId(),
        talosId: talos.id,
        title,
        category,
        channel,
        description,
        price: String(price),
        tags: tags ?? [],
        content: content ?? null,
        impressions: impressions ?? 0,
        engagementRate: String(engagementRate ?? 0),
        conversions: conversions ?? 0,
        periodDays: periodDays ?? 30,
      })
      .select()
      .single();

    if (error || !playbook) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    return Response.json(playbook, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
