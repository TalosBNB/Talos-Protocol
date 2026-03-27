import { bsc, type Chain } from "viem/chains";

const RPC_URL = process.env.BSC_RPC_URL ?? "https://bsc-dataseed.binance.org";
const EXPLORER = process.env.BSC_EXPLORER ?? "https://bscscan.com";
const CHAIN_ID = Number(process.env.BSC_CHAIN_ID ?? 56);

/** BNB Smart Chain (chainId 56, native BNB). */
export const bscChain = {
  ...bsc,
  id: CHAIN_ID,
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: "BscScan", url: EXPLORER } },
} satisfies Chain;
