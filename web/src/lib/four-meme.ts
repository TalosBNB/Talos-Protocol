/**
 * four.meme token launch on BNB Smart Chain (TokenManager2.createToken).
 * Flow: API auth → upload image → create → on-chain tx.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  parseAbiItem,
  decodeEventLog,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscChain } from "./evm";

const API_BASE = "https://four.meme/meme-api/v1";
export const TOKEN_MANAGER2_BSC = (
  process.env.FOUR_MEME_TOKEN_MANAGER ?? "0x5c952063c7fc8610FFDB798152D69F0B9550762b"
) as Address;
const BSC_RPC = process.env.BSC_RPC_URL ?? "https://bsc-dataseed.binance.org";
const NETWORK_CODE = "BSC";

const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const TM2_ABI = parseAbi([
  "function createToken(bytes args, bytes signature) payable",
  "function _launchFee() view returns (uint256)",
  "function _tradingFeeRate() view returns (uint256)",
]);

const TOKEN_CREATE_EVENT = parseAbiItem(
  "event TokenCreate(address creator, address token, uint256 requestId, string name, string symbol, uint256 totalSupply, uint256 launchTime, uint256 launchFee)",
);

const VALID_LABELS = [
  "Meme",
  "AI",
  "Defi",
  "Games",
  "Infra",
  "De-Sci",
  "Social",
  "Depin",
  "Charity",
  "Others",
] as const;

export function fourMemeTradeUrl(tokenAddress: string): string {
  return `https://four.meme/en/token/${tokenAddress}`;
}

function apiOk(code: unknown): boolean {
  return code === "0" || code === 0;
}

function toHex(value: string): Hex {
  if (value.startsWith("0x")) return value as Hex;
  if (/^[0-9a-fA-F]+$/.test(value)) return (`0x${value}`) as Hex;
  const buf = Buffer.from(value, "base64");
  return (`0x${buf.toString("hex")}`) as Hex;
}

async function fourMemeLogin(
  privateKey: Hex,
): Promise<{ accessToken: string; address: Address }> {
  const account = privateKeyToAccount(privateKey);
  const address = account.address;

  const nonceRes = await fetch(`${API_BASE}/private/user/nonce/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accountAddress: address,
      verifyType: "LOGIN",
      networkCode: NETWORK_CODE,
    }),
  });
  const nonceData = (await nonceRes.json()) as { code: unknown; data?: string };
  if (!apiOk(nonceData.code) || !nonceData.data) {
    throw new Error(`four.meme nonce failed: ${JSON.stringify(nonceData)}`);
  }

  const message = `You are sign in Meme ${nonceData.data}`;
  const signature = await account.signMessage({ message });

  const loginRes = await fetch(`${API_BASE}/private/user/login/dex`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      region: "WEB",
      langType: "EN",
      loginIp: "",
      inviteCode: "",
      verifyInfo: {
        address,
        networkCode: NETWORK_CODE,
        signature,
        verifyType: "LOGIN",
      },
      walletName: "MetaMask",
    }),
  });
  const loginData = (await loginRes.json()) as { code: unknown; data?: string };
  if (!apiOk(loginData.code) || !loginData.data) {
    throw new Error(`four.meme login failed: ${JSON.stringify(loginData)}`);
  }

  return { accessToken: loginData.data, address };
}

async function uploadImage(accessToken: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([PLACEHOLDER_PNG], { type: "image/png" }), "talos.png");

  const uploadRes = await fetch(`${API_BASE}/private/token/upload`, {
    method: "POST",
    headers: { "meme-web-access": accessToken },
    body: form,
  });
  const uploadData = (await uploadRes.json()) as { code: unknown; data?: string };
  if (!apiOk(uploadData.code) || !uploadData.data) {
    throw new Error(`four.meme image upload failed: ${JSON.stringify(uploadData)}`);
  }
  return uploadData.data;
}

type RaisedToken = {
  symbol: string;
  totalAmount?: string | number;
  totalBAmount?: string | number;
  saleRate?: string | number;
  status?: string;
};

async function getRaisedToken(): Promise<RaisedToken> {
  const configRes = await fetch(`${API_BASE}/public/config`);
  if (!configRes.ok) {
    throw new Error(`four.meme public config failed: ${configRes.status}`);
  }
  const configData = (await configRes.json()) as { code: unknown; data?: RaisedToken[] };
  if (!apiOk(configData.code) || !Array.isArray(configData.data) || configData.data.length === 0) {
    throw new Error(`four.meme invalid public config: ${JSON.stringify(configData)}`);
  }
  const published = configData.data.filter((c) => c.status === "PUBLISH");
  const list = published.length > 0 ? published : configData.data;
  const raisedToken = list.find((c) => c.symbol === "BNB") ?? list[0];
  if (!raisedToken?.symbol) {
    throw new Error("four.meme public config missing raisedToken");
  }
  return raisedToken;
}

function normalizeLabel(label: string): (typeof VALID_LABELS)[number] {
  const match = VALID_LABELS.find((l) => l.toLowerCase() === label.toLowerCase());
  return match ?? "AI";
}

function parseTokenCreateAddress(receipt: { logs: readonly { address: Address; data: Hex; topics: readonly Hex[] }[] }): Address {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== TOKEN_MANAGER2_BSC.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: [TOKEN_CREATE_EVENT],
        data: log.data,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
      });
      if (decoded.eventName === "TokenCreate") {
        return decoded.args.token as Address;
      }
    } catch {
      // not TokenCreate
    }
  }
  throw new Error("four.meme TokenCreate event not found in receipt");
}

export async function launchFourMemeToken(opts: {
  privateKey: Hex;
  name: string;
  symbol: string;
  description: string;
  website?: string;
  /** Initial BNB pre-sale at launch (human-readable, e.g. "0.01"). Default 0. */
  preSaleBnb?: string;
  label?: string;
}): Promise<{ tokenAddress: Address; txHash: Hex; memeUrl: string; imgUrl: string }> {
  const account = privateKeyToAccount(opts.privateKey);
  const wallet = createWalletClient({ account, chain: bscChain, transport: http(BSC_RPC) });
  const publicClient = createPublicClient({ chain: bscChain, transport: http(BSC_RPC) });

  const { accessToken } = await fourMemeLogin(opts.privateKey);
  const imgUrl = await uploadImage(accessToken);
  const raisedToken = await getRaisedToken();

  const totalSupply =
    typeof raisedToken.totalAmount !== "undefined" ? Number(raisedToken.totalAmount) : 1_000_000_000;
  const raisedAmount =
    typeof raisedToken.totalBAmount !== "undefined" ? Number(raisedToken.totalBAmount) : 18;
  const saleRate =
    typeof raisedToken.saleRate !== "undefined" ? Number(raisedToken.saleRate) : 0.8;
  const preSale = opts.preSaleBnb ?? process.env.FOUR_MEME_LAUNCH_BNB ?? "0";
  const label = normalizeLabel(opts.label ?? process.env.FOUR_MEME_LABEL ?? "AI");

  const body: Record<string, unknown> = {
    name: opts.name,
    shortName: opts.symbol,
    desc: opts.description || `${opts.name} ($${opts.symbol}) — Talos agent token on four.meme`,
    totalSupply,
    raisedAmount,
    saleRate,
    reserveRate: 0,
    imgUrl,
    raisedToken,
    launchTime: Date.now(),
    funGroup: false,
    label,
    lpTradingFee: 0.0025,
    preSale,
    clickFun: false,
    symbol: raisedToken.symbol,
    dexType: "PANCAKE_SWAP",
    rushMode: false,
    onlyMPC: false,
    feePlan: false,
  };
  if (opts.website) body.webUrl = opts.website;

  const createRes = await fetch(`${API_BASE}/private/token/create`, {
    method: "POST",
    headers: {
      "meme-web-access": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const createData = (await createRes.json()) as {
    code: unknown;
    data?: { createArg: string; signature: string };
  };
  if (!apiOk(createData.code) || !createData.data) {
    throw new Error(`four.meme create API failed: ${JSON.stringify(createData)}`);
  }

  const createArgHex = toHex(createData.data.createArg);
  const signatureHex = toHex(createData.data.signature);

  const launchFee = await publicClient.readContract({
    address: TOKEN_MANAGER2_BSC,
    abi: TM2_ABI,
    functionName: "_launchFee",
  });
  const presaleWei = BigInt(Math.round(parseFloat(preSale || "0") * 1e18));
  const quoteIsBnb = raisedToken.symbol === "BNB";
  let valueWei = launchFee;
  if (presaleWei > BigInt(0) && quoteIsBnb) {
    const feeRate = await publicClient.readContract({
      address: TOKEN_MANAGER2_BSC,
      abi: TM2_ABI,
      functionName: "_tradingFeeRate",
    });
    const tradingFee = (presaleWei * feeRate) / BigInt(10000);
    valueWei = launchFee + presaleWei + tradingFee;
  }

  const hash = await wallet.writeContract({
    address: TOKEN_MANAGER2_BSC,
    abi: TM2_ABI,
    functionName: "createToken",
    args: [createArgHex, signatureHex],
    value: valueWei,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("four.meme createToken transaction reverted");
  }

  const tokenAddress = parseTokenCreateAddress(receipt);

  return {
    tokenAddress,
    txHash: hash,
    memeUrl: fourMemeTradeUrl(tokenAddress),
    imgUrl,
  };
}
