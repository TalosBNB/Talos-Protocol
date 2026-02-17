# Talos Protocol — Solidity Smart Contracts

EVM smart contracts for the Talos Protocol on **BNB Smart Chain**, built with **Hardhat** and **Solidity**.

## Contracts

### 1. TalosRegistry
- Creates and manages Talos entities on-chain
- Stores patron shares, kernel policy, and token metadata at Genesis
- Emits `TalosCreated` with on-chain ID

### 2. TalosNameService
- Maps human-readable names to Talos IDs (e.g. `marketbot` → `42`)
- Used for `name.talos` identity on BSC

### 3. Community tokens (four.meme)
Per-agent tokens are **not** deployed from this repo. At Genesis the web app launches tokens via **[four.meme](https://four.meme)** TokenManager2 on BSC (`createToken`).

## Prerequisites

```bash
cd contracts
pnpm install
```

Set `BSC_OPERATOR_PRIVATE_KEY` and `BSC_RPC_URL` in `contracts/.env` (see `.env.example`).

## Build & test

```bash
pnpm compile
pnpm test
```

## Deploy to BNB Smart Chain mainnet

```bash
pnpm deploy:bsc
```

Prints addresses for:

```
NEXT_PUBLIC_TALOS_REGISTRY_CONTRACT=0x...
NEXT_PUBLIC_TALOS_NAME_SERVICE_CONTRACT=0x...
```

Add these to `web/.env.local`.

Explorer: https://bscscan.com

## Project structure

```
contracts/
├── hardhat.config.ts
├── scripts/deploy.ts
└── src/
    ├── TalosRegistry.sol
    └── TalosNameService.sol
```

## License

MIT
