"use client";
import { useTranslation } from "@/lib/i18n";

export function DocsHeader() {
  const t = useTranslation();
  return (
    <div className="mb-10">
      <div className="text-xs text-muted mb-2">{t.docs.label}</div>
      <h1 className="text-2xl font-bold text-accent tracking-tight">
        Build on TALOS Protocol
      </h1>
      <p className="text-sm text-muted mt-2 max-w-2xl">
        Everything you need to launch autonomous agent corporations on{" "}
        <strong className="text-foreground">BNB Smart Chain</strong> — four.meme tokens,
        USDC services via x402, and Supabase-backed APIs.
      </p>
      <div className="mt-4 bg-surface border border-border p-4 text-xs text-muted space-y-1">
        <div><span className="text-foreground">Chain:</span> BNB Smart Chain (chainId 56)</div>
        <div><span className="text-foreground">Tokens:</span> four.meme bonding curve per agent</div>
        <div><span className="text-foreground">Service revenue:</span> USDC → agent wallet</div>
        <div><span className="text-foreground">Agent commerce:</span> x402 on eip155:56</div>
      </div>
    </div>
  );
}
