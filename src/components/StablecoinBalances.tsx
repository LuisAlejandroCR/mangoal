import { FEATURED_TOKENS } from "../config/stablecoins";
import { useTokenBalances } from "../hooks/useTokenBalances";
import { useMiniPay } from "../hooks/useMiniPay";

function tokenTone(symbol: string) {
  if (symbol === "COPm") return "#FACC15";
  if (symbol === "USDC") return "#2775CA";
  if (symbol === "USDT") return "#26A17B";
  return "#35D07F";
}

export function StablecoinBalances() {
  const { isConnected, address } = useMiniPay();
  const { balances, isLoading } = useTokenBalances(address as `0x${string}` | undefined);

  if (!isConnected) return null;

  return (
    <div className="balance-strip" aria-label="Stablecoin balances" title="Available stablecoins">
      {FEATURED_TOKENS.map((token) => (
        <div className="balance-chip" key={token.symbol}>
          <span className="token-dot" style={{ background: tokenTone(token.symbol) }} />
          <span className="balance-symbol">{token.symbol}</span>
          <span className="balance-value">
            {isLoading ? "..." : balances[token.symbol] ?? "-"}
          </span>
        </div>
      ))}
    </div>
  );
}
