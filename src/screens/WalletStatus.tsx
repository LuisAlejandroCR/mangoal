import { useConnect, useDisconnect } from "wagmi";
import { useMiniPay } from "../hooks/useMiniPay";
import { injected } from "wagmi/connectors";
import { CeloBadge } from "../components/CeloBadge";
import { FEATURED_TOKENS } from "../config/stablecoins";

// Mock balances — replace with useReadContracts balanceOf calls
const MOCK_BALANCES: Record<string, string> = {
  COPm: "12,500 COPm",
  USDC: "8.40 USDC",
  USDT: "3.20 USDT",
  USDm: "5.00 USDm",
};

export function WalletStatus() {
  const { isMiniPay, isConnected, address } = useMiniPay();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <div className="screen">
      <div className="topbar">
        <span className="topbar-logo">⚽ <span>Mango</span>al</span>
        <CeloBadge variant="network" />
      </div>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        {/* Network */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
            Network
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="16" fill="#35D07F" />
              <circle cx="16" cy="16" r="8" fill="white" />
            </svg>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Celo Mainnet</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Chain ID 42220 · L2 (OP Stack)</div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} />
            </div>
          </div>
        </div>

        {/* Connection status */}
        {isConnected ? (
          <>
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
                {isMiniPay ? "MiniPay wallet connected" : "Celo wallet connected"}
              </div>
              <div style={{ fontSize: 13, wordBreak: "break-all", fontFamily: "monospace", color: "var(--text-muted)", marginBottom: 10 }}>
                {address}
              </div>
              {isMiniPay && (
                <div className="badge badge-celo" style={{ marginBottom: 10 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="6" fill="#35D07F" />
                    <circle cx="6" cy="6" r="3" fill="white" />
                  </svg>
                  MiniPay · Auto-connected
                </div>
              )}
              {!isMiniPay && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: 4 }}
                  onClick={() => disconnect()}
                >
                  Disconnect
                </button>
              )}
            </div>

            {/* Stablecoin balances */}
            <div className="section-title">Stablecoin balances · Celo Mainnet</div>
            <div className="card" style={{ marginBottom: 14 }}>
              {FEATURED_TOKENS.map((token, i) => (
                <div
                  key={token.symbol}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 0",
                    borderBottom: i < FEATURED_TOKENS.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{token.flagEmoji}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{token.symbol}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{token.name}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>
                    {MOCK_BALANCES[token.symbol] ?? "—"}
                  </div>
                </div>
              ))}
            </div>

            {/* Powered by Celo stablecoins */}
            <div className="wallet-bar">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="7" fill="#35D07F" />
                <circle cx="7" cy="7" r="3.5" fill="white" />
              </svg>
              Powered by Celo stablecoins
            </div>
          </>
        ) : (
          /* Browser wallet picker — never shown inside MiniPay (auto-connected) */
          <div>
            <div className="section-title">Connect your wallet</div>
            <div className="card" style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
                Connect a Celo Mainnet wallet to submit predictions and access Coach Pass.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => connect({ connector: injected() })}
                style={{ marginBottom: 10 }}
              >
                MetaMask / Rabby / Injected
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => connect({ connector: injected({ target: "metaMask" }) })}
              >
                Other wallet
              </button>
            </div>
            <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Celo Mainnet only · Chain ID 42220
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
