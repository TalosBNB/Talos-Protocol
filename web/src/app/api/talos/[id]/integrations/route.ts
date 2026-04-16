import { NextRequest } from "next/server";
import { supabase } from "@/db";
import { verifyAgentApiKey } from "@/lib/auth";

// GET /api/talos/:id/integrations — agent-only; returns channel API credentials
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await verifyAgentApiKey(request, id);
  if (!auth.ok) return auth.response;

  const { data: talos, error } = await supabase
    .from("tls_talos")
    .select("xApiKey, xApiKeySecret, xAccessToken, xAccessTokenSecret, channels")
    .eq("id", id)
    .maybeSingle();

  if (error || !talos) {
    return Response.json({ error: "TALOS not found" }, { status: 404 });
  }

  const xConfigured = !!(
    talos.xApiKey &&
    talos.xApiKeySecret &&
    talos.xAccessToken &&
    talos.xAccessTokenSecret
  );

  return Response.json({
    x: xConfigured
      ? {
          apiKey: talos.xApiKey,
          apiKeySecret: talos.xApiKeySecret,
          accessToken: talos.xAccessToken,
          accessTokenSecret: talos.xAccessTokenSecret,
        }
      : null,
    channels: talos.channels ?? [],
  });
}
