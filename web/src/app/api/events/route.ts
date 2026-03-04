import { NextRequest } from "next/server";
import { supabase } from "@/db";

/**
 * GET /api/events?wallet=G...
 *
 * Server-Sent Events stream for real-time dashboard updates.
 * Replaces manual polling — the browser keeps one persistent connection.
 *
 * Events emitted:
 *   - "ping"      — keepalive every 15 s (prevents proxy timeouts)
 *   - "update"    — when new approvals or activities appear
 *   - "approval"  — when a pending approval is added/resolved
 *
 * The client calls refetch() on any "update" or "approval" event.
 */

const POLL_INTERVAL_MS = 8_000;
const KEEPALIVE_MS = 15_000;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return new Response("wallet parameter required", { status: 400 });
  }

  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        if (isClosed) return;
        try {
          controller.enqueue(
            `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
          );
        } catch {
          // Controller may already be closed
        }
      }

      send("ping", { ts: Date.now() });

      const walletAddr: string = wallet;

      async function getTalosIds(): Promise<string[]> {
        const { data: patronRows } = await supabase
          .from("tls_patrons")
          .select("talosId")
          .eq("stellarPublicKey", walletAddr);

        const patronIds = (patronRows ?? []).map((r) => r.talosId);

        const { data: ownerRows } = await supabase
          .from("tls_talos")
          .select("id")
          .or(
            `walletPublicKey.eq.${walletAddr},creatorPublicKey.eq.${walletAddr},investorPublicKey.eq.${walletAddr},treasuryPublicKey.eq.${walletAddr}`,
          );

        const ownerIds = (ownerRows ?? []).map((r) => r.id);
        return [...new Set([...patronIds, ...ownerIds])];
      }

      let lastApprovalAt = new Date();
      let lastActivityAt = new Date();
      let pingTimer: ReturnType<typeof setInterval> | null = null;
      let pollTimer: ReturnType<typeof setInterval> | null = null;

      async function poll() {
        if (isClosed) return;
        try {
          const talosIds = await getTalosIds();
          if (talosIds.length === 0) return;

          const approvalQuery = supabase
            .from("tls_approvals")
            .select("id, createdAt")
            .order("createdAt", { ascending: false })
            .limit(1);

          const activityQuery = supabase
            .from("tls_activities")
            .select("id, createdAt")
            .order("createdAt", { ascending: false })
            .limit(1);

          if (talosIds.length === 1) {
            approvalQuery.eq("talosId", talosIds[0]);
            activityQuery.eq("talosId", talosIds[0]);
          } else {
            approvalQuery.in("talosId", talosIds);
            activityQuery.in("talosId", talosIds);
          }

          const [{ data: newApprovals }, { data: newActivities }] = await Promise.all([
            approvalQuery,
            activityQuery,
          ]);

          if (newApprovals?.[0] && new Date(newApprovals[0].createdAt) > lastApprovalAt) {
            lastApprovalAt = new Date(newApprovals[0].createdAt);
            send("approval", { talosIds });
            send("update", { reason: "approval" });
          }

          if (newActivities?.[0] && new Date(newActivities[0].createdAt) > lastActivityAt) {
            lastActivityAt = new Date(newActivities[0].createdAt);
            send("update", { reason: "activity" });
          }
        } catch (err) {
          console.warn("[SSE] poll error:", err);
        }
      }

      pollTimer = setInterval(poll, POLL_INTERVAL_MS);

      pingTimer = setInterval(() => {
        send("ping", { ts: Date.now() });
      }, KEEPALIVE_MS);

      request.signal.addEventListener("abort", () => {
        isClosed = true;
        if (pollTimer) clearInterval(pollTimer);
        if (pingTimer) clearInterval(pingTimer);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
