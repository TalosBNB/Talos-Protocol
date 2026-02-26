import { NextRequest } from "next/server";
import { supabase } from "@/db";
import { isNameAvailableOnChain } from "@/lib/contracts";

// GET /api/talos/check-name?name=foo
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.toLowerCase().trim();

  if (!name || name.length < 3) {
    return Response.json({ available: false, reason: "Name must be at least 3 characters" });
  }

  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name) || /--/.test(name)) {
    return Response.json({ available: false, reason: "Invalid format" });
  }

  const { data: existing } = await supabase
    .from("tls_talos")
    .select("id")
    .eq("agentName", name)
    .maybeSingle();

  if (existing) {
    return Response.json({ available: false, reason: "Name already taken" });
  }

  try {
    const onChainAvailable = await isNameAvailableOnChain(name);
    if (!onChainAvailable) {
      return Response.json({ available: false, reason: "Name already registered on-chain" });
    }
  } catch {
    // On-chain check failed — fall back to DB result
  }

  return Response.json({ available: true });
}
