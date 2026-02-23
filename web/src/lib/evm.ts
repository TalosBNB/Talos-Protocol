/**
 * EVM / BNB Smart Chain operations — account management, USDC payments, balances.
 *
 * Agent private keys are NEVER stored in the database. They are held
 * server-side in environment variables or a secret manager.
 *
 * BNB Smart Chain (BSC):
 *   chainId 56 · RPC https://bsc-dataseed.binance.org · gas BNB
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  getAddress,
  type Hex,
  type Address,
  type Chain,
} from "viem";
import { bsc } from "viem/chains";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { MITOS_ABI, MITOS_BYTECODE } from "./abi/mitos";

// ── Chain ─────────────────────────────────────────────────────────────

export const BSC_CHAIN_ID = Number(process.env.BSC_CHAIN_ID ?? 56);
const BSC_RPC_URL = process.env.BSC_RPC_URL ?? "https://bsc-dataseed.binance.org";
const EXPLORER = process.env.BSC_EXPLORER ?? "https://bscscan.com";

export const bscChain = {
  ...bsc,
  id: BSC_CHAIN_ID,
  rpcUrls: { default: { http: [BSC_RPC_URL] } },
  blockExplorers: { default: { name: "BscScan", url: EXPLORER } },
} satisfies Chain;

// ── USDC config ───────────────────────────────────────────────────────
// BSC USDC (Binance-Peg): 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d (18 decimals).
// Verify EIP-3009 support if using x402 exact-EVM settlement.
const USDC_ADDRESS = (process.env.USDC_ADDRESS ?? "") as Address;
const USDC_DECIMALS = Number(process.env.USDC_DECIMALS ?? 18);

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

// ── Clients ───────────────────────────────────────────────────────────

export function getPublicClient() {
  return createPublicClient({ chain: bscChain, transport: http(BSC_RPC_URL) });
}

function getWalletClient(privateKey: Hex) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({ account, chain: bscChain, transport: http(BSC_RPC_URL) });
}

// ── Accounts ──────────────────────────────────────────────────────────

/**
 * Create a new EVM keypair for an agent wallet (called during TALOS Genesis).
 * Store `address` in DB; store `privateKey` server-side ONLY.
 */
export function createAgentKeypair(): { address: Address; privateKey: Hex } {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { address: account.address, privateKey };
}

/**
 * Fund a new account with BNB for gas.
 * If BSC_FAUCET_URL is configured we best-effort POST to it; otherwise no-op.
 */
export async function fundTestnetAccount(address: string): Promise<void> {
  const faucetUrl = process.env.BSC_FAUCET_URL;
  if (!faucetUrl) {
    console.warn(`[evm] No BSC_FAUCET_URL set — fund ${address} with BNB manually.`);
    return;
  }
  try {
    const res = await fetch(faucetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    if (res.ok) console.log(`[evm] Faucet funded ${address}`);
    else console.warn(`[evm] Faucet returned ${res.status} for ${address}`);
  } catch (err) {
    console.warn("[evm] Faucet request failed:", err);
  }
}

// ── ERC-20 USDC ───────────────────────────────────────────────────────

/**
 * Send USDC from one account to another.
 * `amount` is human-readable USDC (e.g. "5.00" = 5 USDC).
 */
export async function sendUSDC(
  fromPrivateKey: Hex,
  to: string,
  amount: string,
): Promise<{ txHash: string }> {
  if (!USDC_ADDRESS) throw new Error("USDC_ADDRESS not configured");
  const wallet = getWalletClient(fromPrivateKey);
  const value = parseUnits(amount, USDC_DECIMALS);

  const txHash = await wallet.writeContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [getAddress(to), value],
  });
  return { txHash };
}

/** Operator (treasury) key + address used for Mitos/USDC settlement. */
export const OPERATOR_KEY = (process.env.BSC_OPERATOR_PRIVATE_KEY ?? "") as Hex;
export const OPERATOR_ADDRESS = (process.env.BSC_OPERATOR_ADDRESS ?? "") as Address;
/** Conventional burn sink (ERC-20 has no native burn on MitosToken). */
export const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD" as Address;

/**
 * Generic ERC-20 transfer. `amount` is human-readable; `decimals` defaults to
 * 18 (Mitos). For USDC pass the configured USDC_DECIMALS.
 */
export async function sendErc20(
  fromPrivateKey: Hex,
  token: string,
  to: string,
  amount: string,
  decimals = 18,
): Promise<{ txHash: string }> {
  const wallet = getWalletClient(fromPrivateKey);
  const value = parseUnits(amount, decimals);
  const txHash = await wallet.writeContract({
    address: getAddress(token),
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [getAddress(to), value],
  });
  return { txHash };
}

/** Generic ERC-20 balance (human-readable). `decimals` defaults to 18. */
export async function getErc20Balance(
  token: string,
  holder: string,
  decimals = 18,
): Promise<string> {
  try {
    const client = getPublicClient();
    const bal = await client.readContract({
      address: getAddress(token),
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [getAddress(holder)],
    });
    return formatUnits(bal, decimals);
  } catch {
    return "0";
  }
}

/**
 * Deploy a per-Talos Mitos ERC-20 (operator-funded) at Genesis. Mints the full
 * supply to the treasury. Returns the new token contract address.
 */
export async function deployMitosToken(opts: {
  name: string;
  symbol: string;
  talosId: number;
  treasury: string;
  wholeSupply: number;
}): Promise<{ address: Address; txHash: string }> {
  if (!OPERATOR_KEY) throw new Error("BSC_OPERATOR_PRIVATE_KEY not configured");
  const wallet = getWalletClient(OPERATOR_KEY);
  const hash = await wallet.deployContract({
    abi: MITOS_ABI,
    bytecode: MITOS_BYTECODE,
    args: [
      opts.name,
      opts.symbol,
      BigInt(opts.talosId),
      getAddress(opts.treasury),
      BigInt(opts.wholeSupply),
    ],
  });
  const client = getPublicClient();
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error("Mitos deploy: no contractAddress in receipt");
  return { address: receipt.contractAddress, txHash: hash };
}

/** Get USDC balance for an account (human-readable string). */
export async function getUSDCBalance(address: string): Promise<string> {
  if (!USDC_ADDRESS) return "0";
  try {
    const client = getPublicClient();
    const bal = await client.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [getAddress(address)],
    });
    return formatUnits(bal, USDC_DECIMALS);
  } catch {
    return "0";
  }
}

/** Get native BNB balance for an account (human-readable string). */
export async function getNativeBalance(address: string): Promise<string> {
  try {
    const client = getPublicClient();
    const bal = await client.getBalance({ address: getAddress(address) });
    return formatUnits(bal, 18);
  } catch {
    return "0";
  }
}

// ── On-chain record (approval audit) ──────────────────────────────────

/**
 * Record an approval decision on-chain as a self-transaction carrying the
 * decision in calldata (EVM has no memo field). Returns null if the operator
 * key is not configured.
 */
export async function recordApprovalOnChain(
  approvalId: string,
  talosId: string,
  status: "approved" | "rejected",
  decidedBy: string,
): Promise<{ txHash: string } | null> {
  const operatorKey = process.env.BSC_OPERATOR_PRIVATE_KEY as Hex | undefined;
  if (!operatorKey) {
    console.warn("[evm] BSC_OPERATOR_PRIVATE_KEY not set, skipping on-chain record");
    return null;
  }
  try {
    const wallet = getWalletClient(operatorKey);
    const payload = JSON.stringify({ approvalId, talosId, status, decidedBy });
    const data = ("0x" +
      Buffer.from(payload, "utf8").toString("hex")) as Hex;

    const txHash = await wallet.sendTransaction({
      to: wallet.account.address,
      value: BigInt(0),
      data,
    });
    return { txHash };
  } catch (err) {
    console.error("[evm] Failed to record approval on-chain:", err);
    return null;
  }
}

// ── Account info ──────────────────────────────────────────────────────

export async function getAccountInfo(
  address: string,
): Promise<{ exists: boolean; nativeBalance: string; usdcBalance: string }> {
  try {
    const native = await getNativeBalance(address);
    const usdc = await getUSDCBalance(address);
    return { exists: true, nativeBalance: native, usdcBalance: usdc };
  } catch {
    return { exists: false, nativeBalance: "0", usdcBalance: "0" };
  }
}

/** Validate an EVM address (0x + 40 hex). */
export function isValidEvmAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}
