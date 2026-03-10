import { NextRequest } from "next/server";
import { supabase, createId } from "@/db";

// PATCH /api/playbooks/:id/apply — Mark a purchased playbook as applied
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await request.json();
    const { buyerPublicKey } = body;

    if (!buyerPublicKey) {
      return Response.json(
        { error: "buyerPublicKey is required" },
        { status: 400 }
      );
    }

    const { data: playbook } = await supabase
      .from("tls_playbooks")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!playbook) {
      return Response.json({ error: "Playbook not found" }, { status: 404 });
    }

    const { data: purchase } = await supabase
      .from("tls_playbook_purchases")
      .select("*")
      .eq("playbookId", id)
      .eq("buyerPublicKey", buyerPublicKey)
      .maybeSingle();

    if (!purchase) {
      return Response.json(
        { error: "No purchase found for this playbook and wallet" },
        { status: 404 }
      );
    }

    if (purchase.appliedAt) {
      return Response.json(
        { error: "Playbook already applied", appliedAt: purchase.appliedAt },
        { status: 409 }
      );
    }

    const { data: updated, error } = await supabase
      .from("tls_playbook_purchases")
      .update({ appliedAt: new Date().toISOString() })
      .eq("id", purchase.id)
      .select()
      .single();

    if (error || !updated) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    const content = playbook.content as Record<string, unknown> | null;
    const activitiesCreated: string[] = [];

    if (content) {
      const tactics = (content.tactics as string[]) ?? [];
      const templates = (content.templates as string[]) ?? [];
      const schedule = content.schedule as Record<string, unknown> | null;

      const activityRows: {
        id: string;
        talosId: string;
        type: string;
        content: string;
        channel: string;
        status: string;
      }[] = [];

      for (const tactic of tactics.slice(0, 5)) {
        activityRows.push({
          id: createId(),
          talosId: playbook.talosId,
          type: "post",
          content: `[Playbook: ${playbook.title}] ${tactic}`,
          channel: playbook.channel,
          status: "pending",
        });
      }

      for (const template of templates.slice(0, 3)) {
        activityRows.push({
          id: createId(),
          talosId: playbook.talosId,
          type: "post",
          content: `[Playbook template] ${template}`,
          channel: playbook.channel,
          status: "pending",
        });
      }

      if (schedule && typeof schedule.summary === "string") {
        activityRows.push({
          id: createId(),
          talosId: playbook.talosId,
          type: "research",
          content: `[Playbook schedule applied] ${schedule.summary}`,
          channel: "internal",
          status: "pending",
        });
      }

      if (activityRows.length > 0) {
        const { data: inserted } = await supabase
          .from("tls_activities")
          .insert(activityRows)
          .select("id");

        activitiesCreated.push(...(inserted ?? []).map((r) => r.id));
      }
    }

    return Response.json({
      ...updated,
      content: playbook.content,
      activitiesCreated,
      message: `Playbook "${playbook.title}" applied. ${activitiesCreated.length} tasks queued for the agent.`,
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
