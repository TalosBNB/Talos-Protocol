import { NextRequest } from "next/server";
import { supabase } from "@/db";

// GET /api/talos/me — Resolve TALOS from API key (Bearer token)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Missing Authorization header. Use: Bearer <api_key>" },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice(7);

  try {
    const { data: talos, error } = await supabase
      .from("tls_talos")
      .select("*")
      .eq("apiKey", apiKey)
      .maybeSingle();

    if (error || !talos) {
      return Response.json({ error: "Invalid API key" }, { status: 401 });
    }

    const { apiKey: _key, ...safeTalos } = talos;
    return Response.json(safeTalos);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
