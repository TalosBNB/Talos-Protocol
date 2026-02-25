-- Talos Protocol — Supabase / PostgreSQL schema
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

-- ─── tls_talos ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tls_talos (
  id text PRIMARY KEY,
  "onChainId" integer UNIQUE,
  "agentName" text UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  "stellarAssetCode" text,
  "tokenSymbol" text,
  "pulsePrice" numeric(18, 6) NOT NULL DEFAULT 0,
  "totalSupply" integer NOT NULL DEFAULT 1000000,
  "creatorShare" integer NOT NULL DEFAULT 60,
  "investorShare" integer NOT NULL DEFAULT 25,
  "treasuryShare" integer NOT NULL DEFAULT 15,
  "apiKey" text UNIQUE,
  persona text,
  "targetAudience" text,
  channels text[] NOT NULL DEFAULT ARRAY['bsc']::text[],
  "toneVoice" text,
  "approvalThreshold" numeric(18, 2) NOT NULL DEFAULT 10,
  "gtmBudget" numeric(18, 2) NOT NULL DEFAULT 200,
  "minPatronPulse" integer,
  "agentOnline" boolean NOT NULL DEFAULT false,
  "agentLastSeen" timestamptz,
  "walletPublicKey" text,
  "creatorPublicKey" text,
  "investorPublicKey" text,
  "treasuryPublicKey" text,
  "agentWalletId" text,
  "agentWalletAddress" text,
  "flapLaunchTxHash" text,
  "xApiKey" text,
  "xApiKeySecret" text,
  "xAccessToken" text,
  "xAccessTokenSecret" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- ─── tls_patrons ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tls_patrons (
  id text PRIMARY KEY,
  "talosId" text NOT NULL REFERENCES tls_talos(id) ON DELETE CASCADE,
  "stellarPublicKey" text NOT NULL,
  role text NOT NULL,
  "pulseAmount" integer NOT NULL DEFAULT 0,
  share numeric(5, 2) NOT NULL,
  status text NOT NULL DEFAULT 'active',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("talosId", "stellarPublicKey")
);

-- ─── tls_activities ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS tls_activities (
  id text PRIMARY KEY,
  "talosId" text NOT NULL REFERENCES tls_talos(id) ON DELETE CASCADE,
  type text NOT NULL,
  content text NOT NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tls_activities_talosId_createdAt_idx ON tls_activities ("talosId", "createdAt" DESC);

-- ─── tls_approvals ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS tls_approvals (
  id text PRIMARY KEY,
  "talosId" text NOT NULL REFERENCES tls_talos(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  amount numeric(18, 6),
  status text NOT NULL DEFAULT 'pending',
  "decidedAt" timestamptz,
  "decidedBy" text,
  "txHash" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tls_approvals_talosId_status_idx ON tls_approvals ("talosId", status);

-- ─── tls_revenues ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tls_revenues (
  id text PRIMARY KEY,
  "talosId" text NOT NULL REFERENCES tls_talos(id) ON DELETE CASCADE,
  amount numeric(18, 6) NOT NULL,
  currency text NOT NULL DEFAULT 'USDC',
  source text NOT NULL,
  "txHash" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tls_revenues_talosId_createdAt_idx ON tls_revenues ("talosId", "createdAt" DESC);

-- ─── tls_commerce_services ───────────────────────────────
CREATE TABLE IF NOT EXISTS tls_commerce_services (
  id text PRIMARY KEY,
  "talosId" text NOT NULL UNIQUE REFERENCES tls_talos(id) ON DELETE CASCADE,
  "serviceName" text NOT NULL,
  description text,
  price numeric(18, 6) NOT NULL,
  currency text NOT NULL DEFAULT 'USDC',
  "stellarPublicKey" text NOT NULL,
  chains text[] NOT NULL DEFAULT ARRAY['bsc']::text[],
  "fulfillmentMode" text NOT NULL DEFAULT 'async',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- ─── tls_commerce_jobs ───────────────────────────────────
CREATE TABLE IF NOT EXISTS tls_commerce_jobs (
  id text PRIMARY KEY,
  "talosId" text NOT NULL REFERENCES tls_talos(id) ON DELETE CASCADE,
  "requesterTalosId" text NOT NULL,
  "serviceName" text NOT NULL,
  payload jsonb,
  result jsonb,
  status text NOT NULL DEFAULT 'pending',
  "paymentSig" text UNIQUE,
  "txHash" text,
  amount numeric(18, 6) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tls_commerce_jobs_talosId_status_idx ON tls_commerce_jobs ("talosId", status);
CREATE UNIQUE INDEX IF NOT EXISTS tls_commerce_jobs_paymentSig_unique ON tls_commerce_jobs ("paymentSig") WHERE "paymentSig" IS NOT NULL;

-- ─── tls_playbooks ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS tls_playbooks (
  id text PRIMARY KEY,
  "talosId" text NOT NULL REFERENCES tls_talos(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL,
  channel text NOT NULL,
  description text NOT NULL,
  price numeric(18, 6) NOT NULL,
  currency text NOT NULL DEFAULT 'USDC',
  version integer NOT NULL DEFAULT 1,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'active',
  content jsonb,
  impressions integer NOT NULL DEFAULT 0,
  "engagementRate" numeric(5, 2) NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  "periodDays" integer NOT NULL DEFAULT 30,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tls_playbooks_talosId_idx ON tls_playbooks ("talosId");

-- ─── tls_playbook_purchases ──────────────────────────────
CREATE TABLE IF NOT EXISTS tls_playbook_purchases (
  id text PRIMARY KEY,
  "playbookId" text NOT NULL REFERENCES tls_playbooks(id) ON DELETE CASCADE,
  "buyerPublicKey" text NOT NULL,
  "appliedAt" timestamptz,
  "txHash" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("playbookId", "buyerPublicKey")
);

-- ─── tls_api_audit_logs ──────────────────────────────────
CREATE TABLE IF NOT EXISTS tls_api_audit_logs (
  id text PRIMARY KEY,
  "talosId" text NOT NULL REFERENCES tls_talos(id) ON DELETE CASCADE,
  method text NOT NULL,
  path text NOT NULL,
  "statusCode" integer NOT NULL,
  "ipAddress" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tls_api_audit_logs_talosId_createdAt_idx ON tls_api_audit_logs ("talosId", "createdAt" DESC);

-- ─── updatedAt trigger ───────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER tls_talos_updated_at BEFORE UPDATE ON tls_talos FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER tls_patrons_updated_at BEFORE UPDATE ON tls_patrons FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER tls_approvals_updated_at BEFORE UPDATE ON tls_approvals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER tls_commerce_services_updated_at BEFORE UPDATE ON tls_commerce_services FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER tls_commerce_jobs_updated_at BEFORE UPDATE ON tls_commerce_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER tls_playbooks_updated_at BEFORE UPDATE ON tls_playbooks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
