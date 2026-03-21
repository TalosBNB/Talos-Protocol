/**
 * Check BNB (native) + USDC (ERC-20) balances for addresses on BNB Smart Chain.
 *
 * Usage: tsx scripts/check-balances.ts 0xabc... 0xdef...
 */
import { createPublicClient, http, defineChain, formatUnits, getAddress } from "viem";

const RPC_URL = process.env.BSC_RPC_URL ?? "https://bsc-dataseed.binance.org";
const USDC_ADDRESS = process.env.USDC_ADDRESS as `0x${string}` | undefined;
const USDC_DECIMALS = Number(process.env.USDC_DECIMALS ?? 18);

const bscChain = defineChain({
  id: 56,
  name: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "a", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

async function main() {
  const addresses = process.argv.slice(2);
  if (addresses.length === 0) {
    console.error("Usage: tsx scripts/check-balances.ts <0xaddr> [<0xaddr> ...]");
    process.exit(1);
  }

  const client = createPublicClient({ chain: bscChain, transport: http(RPC_URL) });

  for (const raw of addresses) {
    const addr = getAddress(raw);
    const native = await client.getBalance({ address: addr });
    console.log(`\n${addr}`);
    console.log(`  BNB: ${formatUnits(native, 18)}`);

    if (USDC_ADDRESS) {
      const usdc = await client.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [addr],
      });
      console.log(`  USDC: ${formatUnits(usdc, USDC_DECIMALS)}`);
    } else {
      console.log("  USDC: (set USDC_ADDRESS to check)");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
