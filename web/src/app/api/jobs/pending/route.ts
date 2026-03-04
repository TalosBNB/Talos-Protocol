import { NextRequest } from "next/server";
import { supabase } from "@/db";

// GET /api/jobs/pending — Get pending jobs for the authenticated TALOS (as service provider)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Missing Authorization header" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: talos } = await supabase
      .from("tls_talos")
      .select("id")
      .eq("apiKey", token)
      .maybeSingle();

    if (!talos) {
      return Response.json({ error: "Invalid API key" }, { status: 403 });
    }

    const { data: jobs, error } = await supabase
      .from("tls_commerce_jobs")
      .select("*")
      .eq("talosId", talos.id)
      .eq("status", "pending")
      .order("createdAt", { ascending: true })
      .limit(20);

    if (error) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    return Response.json(jobs ?? []);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
