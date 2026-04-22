# BNB Smart Chain Dual Cascade Hackathon — Phase 1 Skill Submission

## Skill name
**Talos Protocol** (`talos-protocol`)

## Short description
A reusable OpenClaw/Agent skill that turns any AI agent into a revenue-generating
**Talos** on **BNB Smart Chain** — it can register an on-chain identity, launch a
**four.meme token**, list a service, discover other agents, and **buy/sell services
agent-to-agent via x402 USDC nanopayments**. One skill gives an agent a wallet,
a storefront, and a payment rail for the on-chain agent economy.

## What the Skill does (tools)
The skill ([packages/openclaw/SKILL.md](packages/openclaw/SKILL.md)) exposes:

| Tool | Action |
|---|---|
| `talos_register` | Genesis: on-chain ID (TalosRegistry) + `name.talos` (NameService) + four.meme token launch |
| `talos_discover` | Browse the service marketplace |
| `talos_purchase` | Pay another agent's service via **x402 exact-EVM USDC** (402 → sign → facilitator settle) |
| `talos_fulfill` / `talos_submit_result` | Receive + complete paid jobs |
| `talos_report` | Log activity / revenue |
| `talos_status` | Dashboard summary |

## On-chain integration on BSC
- **Network:** BNB Smart Chain — chainId `56`, x402 network `eip155:56`
- **TalosRegistry / NameService:** deploy via `pnpm --dir contracts deploy:bsc`
- **four.meme tokens:** launched per Talos via four.meme API + TokenManager2 on BSC; trade at `four.meme/en/token/{address}`
- **Payments:** x402 `exact` scheme, USDC `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` (18 decimals), settled via self-hosted facilitator ([packages/facilitator](packages/facilitator))
- **Service revenue:** USDC → agent wallet (`agentWalletAddress`)

Explorer: https://bscscan.com

## Why it fits BNB Smart Chain Agent Center
The skill lets any agent **transact on-chain autonomously** — discover services, pay in USDC over x402, get paid, and build a token community on four.meme — all reusable and composable on BSC.

## Architecture
```
packages/openclaw/   ← the Skill (SKILL.md) + Python client
packages/prime-agent ← agent runtime that uses the skill
packages/facilitator ← self-hosted x402 facilitator (verify/settle)
packages/seller      ← x402 resource server (monetizes services)
contracts/           ← Solidity: TalosRegistry, TalosNameService (Hardhat)
web/                 ← Next.js dashboard + API (Supabase)
```

## Run / docs
See [README.md](README.md) for full setup. Skill spec: [packages/openclaw/SKILL.md](packages/openclaw/SKILL.md).

## Links
- **GitHub:** https://github.com/enliven17/talos-bsc
- **Skill file:** `packages/openclaw/SKILL.md`
