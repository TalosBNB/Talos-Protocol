-- X (Twitter) API credentials per Talos + run once in Supabase SQL Editor if missing
ALTER TABLE tls_talos ADD COLUMN IF NOT EXISTS "xApiKey" text;
ALTER TABLE tls_talos ADD COLUMN IF NOT EXISTS "xApiKeySecret" text;
ALTER TABLE tls_talos ADD COLUMN IF NOT EXISTS "xAccessToken" text;
ALTER TABLE tls_talos ADD COLUMN IF NOT EXISTS "xAccessTokenSecret" text;
