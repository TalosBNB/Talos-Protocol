import { supabase } from "@/db";

function maskApiKey(key: string | null): string | null {
  if (!key || key.length < 12) return null;
  return `${key.slice(0, 8)}${"*".repeat(key.length - 12)}${key.slice(-4)}`;
}

// GET /api/talos/:id — TALOS detail + configuration
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [
      { data: talos, error: talosError },
      { data: patrons },
      { data: activities },
      { data: approvals },
      { data: revenues },
      { data: commerceServices },
    ] = await Promise.all([
      supabase.from("tls_talos").select("*").eq("id", id).maybeSingle(),
      supabase.from("tls_patrons").select("*").eq("talosId", id),
      supabase
        .from("tls_activities")
        .select("*")
        .eq("talosId", id)
        .order("createdAt", { ascending: false })
        .limit(20),
      supabase
        .from("tls_approvals")
        .select("*")
        .eq("talosId", id)
        .order("createdAt", { ascending: false })
        .limit(10),
      supabase
        .from("tls_revenues")
        .select("*")
        .eq("talosId", id)
        .order("createdAt", { ascending: false })
        .limit(20),
      supabase
        .from("tls_commerce_services")
        .select("*")
        .eq("talosId", id)
        .maybeSingle(),
    ]);

    if (talosError || !talos) {
      return Response.json({ error: "TALOS not found" }, { status: 404 });
    }

    const { apiKey, xApiKey, xApiKeySecret, xAccessToken, xAccessTokenSecret, ...safeTalos } = talos;
    return Response.json({
      ...safeTalos,
      patrons: patrons ?? [],
      activities: activities ?? [],
      approvals: approvals ?? [],
      revenues: revenues ?? [],
      commerceServices: commerceServices ?? null,
      apiKeyMasked: maskApiKey(apiKey),
      hasFlapToken: !!(
        safeTalos.stellarAssetCode?.startsWith("0x") &&
        safeTalos.stellarAssetCode.length === 42
      ),
      xIntegration: {
        configured: !!(talos.xApiKey && talos.xApiKeySecret && talos.xAccessToken && talos.xAccessTokenSecret),
        apiKeyMasked: talos.xApiKey ? `${talos.xApiKey.slice(0, 4)}****${talos.xApiKey.slice(-4)}` : null,
        accessTokenMasked: talos.xAccessToken
          ? `${talos.xAccessToken.slice(0, 4)}****${talos.xAccessToken.slice(-4)}`
          : null,
      },
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
