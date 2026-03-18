"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  createWalletClient,
  custom,
  getAddress,
  type WalletClient,
  type Address,
} from "viem";
import { bscChain, BSC_CHAIN_ID } from "@/lib/evm";

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

const BSC_RPC_URL =
  process.env.NEXT_PUBLIC_BSC_RPC_URL ?? "https://bsc-dataseed.binance.org";
const BSC_EXPLORER =
  process.env.NEXT_PUBLIC_BSC_EXPLORER ?? "https://bscscan.com";

const CHAIN_ID_HEX = `0x${BSC_CHAIN_ID.toString(16)}`;

function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

async function ensureBscChain(provider: Eip1193Provider): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code === 4902 || code === -32603) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_ID_HEX,
            chainName: "BNB Smart Chain",
            nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
            rpcUrls: [BSC_RPC_URL],
            blockExplorerUrls: [BSC_EXPLORER],
          },
        ],
      });
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_ID_HEX }],
      });
    } else {
      throw err;
    }
  }
}

interface WalletContextValue {
  address: Address | null;
  isConnected: boolean;
  chainId: number | null;
  isCorrectChain: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: () => Promise<void>;
  getWalletClient: () => Promise<WalletClient>;
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  isConnected: false,
  chainId: null,
  isCorrectChain: false,
  connect: async () => {},
  disconnect: () => {},
  switchChain: async () => {},
  getWalletClient: async () => {
    throw new Error("Wallet not connected");
  },
});

export function useEvmWallet(): WalletContextValue {
  return useContext(WalletContext);
}

export function Providers({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    const provider = getInjectedProvider();
    if (!provider) return;

    provider
      .request({ method: "eth_accounts" })
      .then((accs) => {
        const list = accs as string[];
        if (list && list.length > 0) setAddress(getAddress(list[0]));
      })
      .catch(() => {});

    provider
      .request({ method: "eth_chainId" })
      .then((id) => setChainId(Number(id as string)))
      .catch(() => {});

    const onAccountsChanged = (...args: unknown[]) => {
      const accs = args[0] as string[];
      setAddress(accs && accs.length > 0 ? getAddress(accs[0]) : null);
    };
    const onChainChanged = (...args: unknown[]) => {
      setChainId(Number(args[0] as string));
    };
    provider.on?.("accountsChanged", onAccountsChanged);
    provider.on?.("chainChanged", onChainChanged);
    return () => {
      provider.removeListener?.("accountsChanged", onAccountsChanged);
      provider.removeListener?.("chainChanged", onChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    const provider = getInjectedProvider();
    if (!provider) {
      throw new Error(
        "No EVM wallet detected. Install MetaMask (or another injected wallet).",
      );
    }
    const accs = (await provider.request({
      method: "eth_requestAccounts",
    })) as string[];
    if (!accs || accs.length === 0) throw new Error("No account authorized.");

    await ensureBscChain(provider);

    setAddress(getAddress(accs[0]));
    const id = (await provider.request({ method: "eth_chainId" })) as string;
    setChainId(Number(id));
  }, []);

  const switchChain = useCallback(async () => {
    const provider = getInjectedProvider();
    if (!provider) throw new Error("No EVM wallet detected.");
    await ensureBscChain(provider);
    const id = (await provider.request({ method: "eth_chainId" })) as string;
    setChainId(Number(id));
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
  }, []);

  const getWalletClient = useCallback(async (): Promise<WalletClient> => {
    const provider = getInjectedProvider();
    if (!provider) throw new Error("No EVM wallet detected.");
    const accs = (await provider.request({
      method: "eth_requestAccounts",
    })) as string[];
    if (!accs || accs.length === 0) throw new Error("No account authorized.");
    await ensureBscChain(provider);
    return createWalletClient({
      account: getAddress(accs[0]),
      chain: bscChain,
      transport: custom(provider),
    });
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: !!address,
        chainId,
        isCorrectChain: chainId === BSC_CHAIN_ID,
        connect,
        disconnect,
        switchChain,
        getWalletClient,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
