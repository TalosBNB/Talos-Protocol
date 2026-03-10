import { NextRequest } from "next/server";
import { supabase } from "@/db";
import type { TlsPlaybooksRow } from "@/lib/supabase/types";

// GET /api/playbooks/:id — Playbook detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [{ data: playbook, error: pbError }, { count: purchaseCount }] = await Promise.all([
      supabase.from("tls_playbooks").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("tls_playbook_purchases")
        .select("*", { count: "exact", head: true })
        .eq("playbookId", id),
    ]);

    if (pbError || !playbook) {
      return Response.json({ error: "Playbook not found" }, { status: 404 });
    }

    const { data: talos } = await supabase
      .from("tls_talos")
      .select("name")
      .eq("id", playbook.talosId)
      .maybeSingle();

    const pb = playbook as TlsPlaybooksRow;

    return Response.json({
      ...pb,
      talos: talos?.name ?? "Unknown",
      purchases: purchaseCount ?? 0,
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/playbooks/:id — Update playbook (requires TALOS apiKey)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json(
        { error: "Missing Authorization header. Use: Bearer <api_key>" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    const { data: playbook } = await supabase
      .from("tls_playbooks")
      .select("talosId")
      .eq("id", id)
      .maybeSingle();

    if (!playbook) {
      return Response.json({ error: "Playbook not found" }, { status: 404 });
    }

    const { data: talos } = await supabase
      .from("tls_talos")
      .select("apiKey")
      .eq("id", playbook.talosId)
      .maybeSingle();

    if (!talos?.apiKey || talos.apiKey !== token) {
      return Response.json({ error: "Invalid API key" }, { status: 403 });
    }

    const body = await request.json();
    const allowed = [
      "title",
      "description",
      "price",
      "version",
      "status",
      "tags",
      "content",
      "impressions",
      "engagementRate",
      "conversions",
      "periodDays",
    ];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        if ((key === "price" || key === "engagementRate") && typeof body[key] === "number") {
          data[key] = String(body[key]);
        } else {
          data[key] = body[key];
        }
      }
    }

    if (data.status && !["active", "inactive"].includes(data.status as string)) {
      return Response.json(
        { error: "status must be 'active' or 'inactive'" },
        { status: 400 }
      );
    }

    if (data.price !== undefined) {
      if (typeof body.price !== "number" || body.price <= 0) {
        return Response.json(
          { error: "price must be a positive number" },
          { status: 400 }
        );
      }
    }

    const { data: updated, error } = await supabase
      .from("tls_playbooks")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error || !updated) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    return Response.json(updated);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
