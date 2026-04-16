"use client";

import { useState } from "react";
import { useWallet } from "@/components/wallet-gate";

type XIntegration = {
  configured: boolean;
  apiKeyMasked: string | null;
  accessTokenMasked: string | null;
};

export function XApiCredentialsForm({
  talosId,
  integration,
  onSaved,
}: {
  talosId: string;
  integration: XIntegration;
  onSaved?: () => void;
}) {
  const { address } = useWallet();
  const [open, setOpen] = useState(!integration.configured);
  const [xApiKey, setXApiKey] = useState("");
  const [xApiKeySecret, setXApiKeySecret] = useState("");
  const [xAccessToken, setXAccessToken] = useState("");
  const [xAccessTokenSecret, setXAccessTokenSecret] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!address) return;
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch(`/api/talos/${talosId}/integrations/x`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          xApiKey,
          xApiKeySecret,
          xAccessToken,
          xAccessTokenSecret,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setStatus("ok");
      setOpen(false);
      setXApiKey("");
      setXApiKeySecret("");
      setXAccessToken("");
      setXAccessTokenSecret("");
      onSaved?.();
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-muted text-xs">X (Twitter) API</span>
        <span className={`text-xs ${integration.configured ? "text-accent" : "text-muted"}`}>
          {integration.configured ? "[CONFIGURED]" : "[NOT SET]"}
        </span>
      </div>
      {integration.configured && !open && (
        <div className="text-xs text-muted space-y-1 mb-2">
          <div>API Key: {integration.apiKeyMasked ?? "—"}</div>
          <div>Access Token: {integration.accessTokenMasked ?? "—"}</div>
        </div>
      )}
      <p className="text-xs text-muted mb-2 leading-relaxed">
        From the{" "}
        <a
          href="https://developer.x.com/en/portal/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          X Developer Portal
        </a>
        : API Key, API Key Secret, Access Token, Access Token Secret (OAuth 1.0a). Not your login password.
      </p>
      {open ? (
        <div className="space-y-2 text-xs">
          {(
            [
              ["API Key", xApiKey, setXApiKey],
              ["API Key Secret", xApiKeySecret, setXApiKeySecret],
              ["Access Token", xAccessToken, setXAccessToken],
              ["Access Token Secret", xAccessTokenSecret, setXAccessTokenSecret],
            ] as const
          ).map(([label, value, setter]) => (
            <div key={label}>
              <label className="text-muted block mb-1">{label}</label>
              <input
                type="password"
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full bg-background border border-border px-2 py-1.5 font-mono text-foreground"
                autoComplete="off"
              />
            </div>
          ))}
          {error && <p className="text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={status === "saving" || !address}
              className="px-3 py-1.5 bg-accent text-background disabled:opacity-50"
            >
              {status === "saving" ? "Saving…" : "Save X API keys"}
            </button>
            {integration.configured && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 border border-border text-muted"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-accent hover:text-foreground border border-border px-2 py-1"
        >
          {integration.configured ? "Update X API keys" : "Add X API keys"}
        </button>
      )}
    </div>
  );
}
