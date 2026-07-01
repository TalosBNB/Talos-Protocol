/** True when a flap.sh community token was launched (EVM contract address on BSC). */
export function hasCommunityToken(stellarAssetCode: string | null | undefined): boolean {
  return !!stellarAssetCode?.startsWith("0x") && stellarAssetCode.length === 42;
}

/** @deprecated Use hasCommunityToken */
export const hasFlapToken = hasCommunityToken;

export function maskSecret(key: string | null | undefined): string | null {
  if (!key || key.length < 8) return null;
  return `${key.slice(0, 4)}${"*".repeat(Math.min(key.length - 8, 20))}${key.slice(-4)}`;
}
