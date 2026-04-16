import { NextRequest } from "next/server";
import { supabase } from "@/db";
import { xIntegrationsSchema, parseBody } from "@/lib/schemas";
import { hasFlapToken, maskSecret } from "@/lib/talos-token";

function stripXSecrets(talos: Record<string, unknown>) {
  const {
    xApiKey,
    xApiKeySecret,
    xAccessToken,
    xAccessTokenSecret,
    ...rest
  } = talos;
  const configured = !!(xApiKey && xApiKeySecret && xAccessToken && xAccessTokenSecret);
  return {
    ...rest,
    xIntegration: {
      configured,
      apiKeyMasked: maskSecret(xApiKey as string | null),
      accessTokenMasked: maskSecret(xAccessToken as string | null),
    },
    hasFlapToken: hasFlapToken(talos.stellarAssetCode as string | null),
  };
}

function isCreatorWallet(talos: { creatorPublicKey?: string | null; walletPublicKey?: string | null }, wallet: string) {
  const w = wallet.toLowerCase();
  return (
    talos.creatorPublicKey?.toLowerCase() === w ||
    talos.walletPublicKey?.toLowerCase() === w
  );
}

// GET /api/talos/:id/integrations/x — status (public, secrets stripped)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data: talos, error } = await supabase.from("tls_talos").select("*").eq("id", id).maybeSingle();
  if (error || !talos) {
    return Response.json({ error: "TALOS not found" }, { status: 404 });
  }
  return Response.json(stripXSecrets(talos as Record<string, unknown>).xIntegration);
}

// PATCH /api/talos/:id/integrations/x — save X API credentials (creator wallet)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = await parseBody(request, xIntegrationsSchema);
  if (parsed.error) return parsed.error;

  const { walletAddress, xApiKey, xApiKeySecret, xAccessToken, xAccessTokenSecret } = parsed.data;

  const { data: talos, error } = await supabase.from("tls_talos").select("*").eq("id", id).maybeSingle();
  if (error || !talos) {
    return Response.json({ error: "TALOS not found" }, { status: 404 });
  }

  if (!isCreatorWallet(talos, walletAddress)) {
    return Response.json({ error: "Only the creator wallet can update X credentials" }, { status: 403 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("tls_talos")
    .update({
      xApiKey,
      xApiKeySecret,
      xAccessToken,
      xAccessTokenSecret,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    return Response.json({ error: updateError?.message ?? "Update failed" }, { status: 500 });
  }

  return Response.json({
    ok: true,
    xIntegration: stripXSecrets(updated as Record<string, unknown>).xIntegration,
  });
}

// POST alias for clients that prefer POST
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return PATCH(request, ctx);
}
