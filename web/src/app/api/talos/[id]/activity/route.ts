import { NextRequest } from "next/server";
import { supabase, createId } from "@/db";
import { verifyAgentApiKey } from "@/lib/auth";

// GET /api/talos/:id/activity — Get activities
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { data: talos, error: talosError } = await supabase
      .from("tls_talos")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (talosError || !talos) {
      return Response.json({ error: "TALOS not found" }, { status: 404 });
    }

    const { data: activities, error } = await supabase
      .from("tls_activities")
      .select("*")
      .eq("talosId", id)
      .order("createdAt", { ascending: false })
      .limit(50);

    if (error) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    return Response.json(activities ?? []);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/talos/:id/activity — Report activity (from Local Agent)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const auth = await verifyAgentApiKey(request, id);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { type, content, channel, status } = body;

    const validTypes = ["post", "research", "reply", "commerce", "approval"];
    const validStatuses = ["completed", "pending", "failed"];

    if (!type || !content || !channel) {
      return Response.json(
        { error: "type, content, channel are required" },
        { status: 400 }
      );
    }

    if (!validTypes.includes(type)) {
      return Response.json(
        { error: `type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (status && !validStatuses.includes(status)) {
      return Response.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const { data: activity, error } = await supabase
      .from("tls_activities")
      .insert({
        id: createId(),
        talosId: id,
        type,
        content,
        channel,
        status: status ?? "completed",
      })
      .select()
      .single();

    if (error || !activity) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    return Response.json(activity, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
