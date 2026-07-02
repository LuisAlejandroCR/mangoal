import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { analytics } from "../lib/analytics";

/**
 * Detects MiniPay environment and exposes connection state.
 * Auto-connect is handled by MiniPayAutoConnectPrivy / MiniPayAutoConnectStandalone
 * in App.tsx so the right provider hooks are called in the right tree.
 *
 * MiniPay rules (celopedia-skill / minipay-guide.md):
 *   - window.ethereum.isMiniPay === true → inside MiniPay WebView
 *   - Legacy tx only — do NOT set maxFeePerGas / maxPriorityFeePerGas
 *   - Only USDT / USDC / USDm are user-facing tokens
 *   - Never display CELO or raw 0x addresses as primary identifiers
 */
export function useMiniPay() {
  const [isMiniPay, setIsMiniPay] = useState(false);
  const { isConnected, address } = useAccount();

  useEffect(() => {
    setIsMiniPay(
      typeof window !== "undefined" &&
        window.ethereum !== undefined &&
        (window.ethereum as { isMiniPay?: boolean }).isMiniPay === true
    );
  }, []);

  useEffect(() => {
    if (address) analytics.identify(address as `0x${string}`);
  }, [address]);

  return { isMiniPay, address, isConnected };
}
