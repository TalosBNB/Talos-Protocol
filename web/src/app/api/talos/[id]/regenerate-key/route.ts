import { NextRequest } from "next/server";
import { supabase } from "@/db";
import { randomBytes } from "crypto";
import { recoverMessageAddress, type Hex } from "viem";
import { regenerateKeySchema, parseBody } from "@/lib/schemas";

// POST /api/talos/:id/regenerate-key — Regenerate API key (invalidates old key)
// Requires an EVM (EIP-191 personal_sign) signature proving wallet ownership.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const parsed = await parseBody(request, regenerateKeySchema);
    if (parsed.error) return parsed.error;

    const { stellarPublicKey, signature, message } = parsed.data;

    if (!message.includes(id)) {
      return Response.json(
        { error: "Signature message must contain the TALOS ID" },
        { status: 400 }
      );
    }

    const { data: talos, error: talosError } = await supabase
      .from("tls_talos")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (talosError || !talos) {
      return Response.json({ error: "TALOS not found" }, { status: 404 });
    }

    if (
      talos.walletPublicKey !== stellarPublicKey &&
      talos.creatorPublicKey !== stellarPublicKey
    ) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
      const recovered = await recoverMessageAddress({
        message,
        signature: signature as Hex,
      });
      if (recovered.toLowerCase() !== stellarPublicKey.toLowerCase()) {
        return Response.json({ error: "Invalid signature" }, { status: 403 });
      }
    } catch {
      return Response.json({ error: "Invalid signature" }, { status: 403 });
    }

    const newApiKey = `tlk_${randomBytes(24).toString("hex")}`;

    const { error } = await supabase
      .from("tls_talos")
      .update({ apiKey: newApiKey })
      .eq("id", id);

    if (error) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    return Response.json({ apiKey: newApiKey });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
