/**
 * One-off test: launch a token via flap.sh API + on-chain tx.
 * Usage: npx tsx scripts/test-four-meme-launch.ts
 * Requires BSC_OPERATOR_PRIVATE_KEY in .env.local
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local without dotenv dependency
const envPath = resolve(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

import { launchFourMemeToken } from "../src/lib/four-meme";
import type { Hex } from "viem";

async function main() {
  const pk = process.env.BSC_OPERATOR_PRIVATE_KEY;
  if (!pk) {
    console.error("BSC_OPERATOR_PRIVATE_KEY missing in .env.local");
    process.exit(1);
  }

  const ts = Date.now().toString().slice(-6);
  console.log("Launching test token on flap.sh...");

  const result = await launchFourMemeToken({
    privateKey: pk as Hex,
    name: `Talos Test ${ts}`,
    symbol: `T${ts.slice(0, 5)}`.slice(0, 8),
    description: "Talos Protocol flap.sh integration test — safe to ignore",
    label: "AI",
    preSaleBnb: "0",
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("Launch failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
