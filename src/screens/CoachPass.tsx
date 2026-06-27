import { useEffect, useMemo, useState } from "react";
import { CeloBadge } from "../components/CeloBadge";
import {
  FEATURED_TOKENS,
  type StablecoinInfo,
} from "../config/stablecoins";
import {
  PASS_AMOUNTS,
  usePurchaseCoachPass,
} from "../hooks/useMangoalLedger";
import { useMiniPay } from "../hooks/useMiniPay";
import { useTokenBalances } from "../hooks/useTokenBalances";

const ADD_CASH_URL = "https://link.minipay.xyz/add_cash?tokens=USDm,USDC,USDT";

type PassOption = {
  id: string;
  type: number;
  label: string;
  duration: string;
  price: Record<string, string>;
};

const PASS_OPTIONS: PassOption[] = [
  {
    id: "daily",
    type: 1,
    label: "Daily Coach Pass",
    duration: "24 hours",
    price: {
      COPm: "500 COPm",
      USDC: "0.10 USDC",
      USDT: "0.10 USDT",
      USDm: "0.10 USDm",
    },
  },
  {
    id: "weekly",
    type: 2,
    label: "Weekly Coach Pass",
    duration: "7 days",
    price: {
      COPm: "2,500 COPm",
      USDC: "0.50 USDC",
      USDT: "0.50 USDT",
      USDm: "0.50 USDm",
    },
  },
  {
    id: "campaign",
    type: 3,
    label: "Campaign Coach Pass",
    duration: "Campaign period",
    price: {
      COPm: "8,000 COPm",
      USDC: "1.50 USDC",
      USDT: "1.50 USDT",
      USDm: "1.50 USDm",
    },
  },
  {
    id: "season",
    type: 4,
    label: "Season Coach Pass",
    duration: "6 months",
    price: {
      COPm: "40,000 COPm",
      USDC: "7.00 USDC",
      USDT: "7.00 USDT",
      USDm: "7.00 USDm",
    },
  },
];

const PERKS = [
  "Advanced match context from Mangooal Coach",
  "Deeper team recent-form analysis",
  "Head-to-head summaries",
  "Reminders before prediction lock",
  "Private leagues: create your own leaderboard",
  "Custom profile themes and cosmetic badges",
  "Shareable prediction cards",
  "Historical performance dashboard",
];

function getPurchaseErrorMessage(error: Error) {
  const message = error.message.toLowerCase();

  if (message.includes("user rejected") || message.includes("rejected the request")) {
    return "Request cancelled in your wallet. Nothing was charged.";
  }

  if (
    message.includes("different chain") ||
    message.includes("not on this chain") ||
    message.includes("unsupported chain") ||
    message.includes("chain mismatch")
  ) {
    return "Switch your wallet to Celo and try again.";
  }

  return "Coach Pass transaction failed. Please check your wallet and try again.";
}

function getDefaultMiniPayToken() {
  return (
    FEATURED_TOKENS.find((token) => token.symbol === "USDC") ??
    FEATURED_TOKENS.find((token) => token.symbol === "USDm") ??
    FEATURED_TOKENS.find((token) => token.miniPayCore) ??
    FEATURED_TOKENS[0]
  );
}

const DEFAULT_MINIPAY_TOKEN = getDefaultMiniPayToken();

export function CoachPass() {
  const [selectedPass, setSelectedPass] = useState("weekly");
  const [selectedToken, setSelectedToken] =
    useState<StablecoinInfo>(DEFAULT_MINIPAY_TOKEN);

  const { isMiniPay, isConnected, address } = useMiniPay();
  const { purchase, step, txHash, isPending, error, reset } =
    usePurchaseCoachPass();

  const { rawBalances } = useTokenBalances(
    address as `0x${string}` | undefined
  );

  const paymentTokens = useMemo(() => {
    return isMiniPay
      ? FEATURED_TOKENS.filter((token) => token.miniPayCore)
      : FEATURED_TOKENS;
  }, [isMiniPay]);

  useEffect(() => {
    if (isMiniPay && !selectedToken.miniPayCore) {
      setSelectedToken(DEFAULT_MINIPAY_TOKEN);
      reset();
    }
  }, [isMiniPay, selectedToken.miniPayCore, reset]);

  const currentPass =
    PASS_OPTIONS.find((pass) => pass.id === selectedPass) ?? PASS_OPTIONS[1];

  const requiredAmount =
    PASS_AMOUNTS[currentPass.type]?.[selectedToken.symbol] ?? 0n;

  const userBalance = rawBalances[selectedToken.symbol] ?? 0n;

  const isLowBalance =
    isConnected && requiredAmount > 0n && userBalance < requiredAmount;

  async function handleUnlock() {
    if (!isConnected) {
      alert("Please open Mangooal inside MiniPay or connect a Celo wallet.");
      return;
    }

    if (isMiniPay && !selectedToken.miniPayCore) {
      alert("MiniPay payments should use USDC, USDT, or USDm.");
      return;
    }

    if (isLowBalance) {
      alert(`Not enough ${selectedToken.symbol}. Add funds and try again.`);
      return;
    }

    try {
      await purchase({
        passType: currentPass.type,
        token: selectedToken,
      });
    } catch {
      // Error is displayed from hook state.
    }
  }

  if (step === "done" && txHash) {
    return <PassSuccessView txHash={txHash} onClose={reset} />;
  }

  return (
    <div className="screen">
      <div className="topbar">
        <span className="topbar-logo">
          ⚽ <span>Mangoo</span>al
        </span>

        <CeloBadge variant={isConnected ? "connected" : "network"} />
      </div>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        <div className="coach-card">
          <div className="coach-label">Coach Pass</div>

          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
            }}
          >
            Mangooal Coach Pass
          </div>

          <p style={{ fontSize: 14, lineHeight: 1.55, marginTop: 10 }}>
            Unlock deeper match insights from Mangooal Coach. Predictions stay
            free for everyone.
          </p>

          <p className="coach-disclaimer">
            Fair-play note: Coach Pass does not affect points, ranking, or
            promotional rewards. It is optional and non-competitive.
          </p>
        </div>

        <div className="section-title">What you unlock</div>

        <div className="card" style={{ marginBottom: 14 }}>
          {PERKS.map((perk, index) => (
            <div
              key={perk}
              style={{
                display: "flex",
                gap: 8,
                padding: "9px 0",
                borderBottom:
                  index < PERKS.length - 1 ? "1px solid var(--border)" : "none",
                fontSize: 14,
                lineHeight: 1.35,
              }}
            >
              <span style={{ color: "var(--green)", fontWeight: 900 }}>✓</span>
              <span>{perk}</span>
            </div>
          ))}
        </div>

        <div className="section-title">Choose your pass</div>

        {PASS_OPTIONS.map((pass) => {
          const active = selectedPass === pass.id;

          return (
            <button
              key={pass.id}
              type="button"
              onClick={() => {
                setSelectedPass(pass.id);
                reset();
              }}
              className={`pass-card ${active ? "selected" : ""}`}
              style={{
                width: "100%",
                background: active ? "#FFF9EC" : "var(--card)",
                textAlign: "left",
              }}
            >
              <div className="pass-card-header">
                <div>
                  <div className="pass-type">{pass.label}</div>
                  <div className="pass-perks">{pass.duration}</div>
                </div>

                <div className="pass-price">
                  {pass.price[selectedToken.symbol]}
                </div>
              </div>
            </button>
          );
        })}

        <div className="section-title">Pay with</div>

        {isMiniPay && (
          <div className="badge badge-celo" style={{ marginBottom: 10 }}>
            MiniPay-safe tokens
          </div>
        )}

        <div className="token-pills">
          {paymentTokens.map((token) => {
            const active = selectedToken.symbol === token.symbol;

            return (
              <button
                key={token.symbol}
                type="button"
                className={`token-pill ${active ? "selected" : ""}`}
                onClick={() => {
                  setSelectedToken(token);
                  reset();
                }}
              >
                <span>{token.flagEmoji}</span>
                <span>{token.symbol}</span>
              </button>
            );
          })}
        </div>

        {!isMiniPay && (
          <div
            className="card"
            style={{
              marginBottom: 14,
              fontSize: 12,
              color: "var(--text-muted)",
              lineHeight: 1.55,
            }}
          >
            Outside MiniPay, COPm is also available. Inside MiniPay, Mangooal
            prioritizes USDC, USDT, and USDm.
          </div>
        )}

        {isLowBalance && (
          <div
            className="card"
            style={{
              marginBottom: 14,
              borderColor: "#FCA5A5",
              background: "#FEF2F2",
              color: "#991B1B",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Not enough {selectedToken.symbol}.{" "}
            <a
              href={ADD_CASH_URL}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#991B1B", fontWeight: 800 }}
            >
              Add funds in MiniPay
            </a>
          </div>
        )}

        {step === "error" && error && (
          <div
            className="card"
            style={{
              marginBottom: 14,
              borderColor: "#FCA5A5",
              background: "#FEF2F2",
              color: "#991B1B",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {getPurchaseErrorMessage(error)}
          </div>
        )}

        <div className="card" style={{ marginBottom: 14 }}>
          <div className="audit-row">
            <span className="audit-label">Total</span>
            <span className="audit-value">
              {currentPass.price[selectedToken.symbol]}
            </span>
          </div>

        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleUnlock}
          disabled={isPending || isLowBalance}
          style={{
            opacity: isPending || isLowBalance ? 0.6 : 1,
            cursor: isPending || isLowBalance ? "not-allowed" : "pointer",
          }}
        >
          {step === "approving"
            ? "Approving spend..."
            : step === "purchasing"
              ? "Processing Coach Pass..."
              : `Unlock Coach Pass - ${currentPass.price[selectedToken.symbol]}`}
        </button>

        <div className="compliance-note">
          Coach Pass gives deeper match context. It does not affect points,
          rankings, or rewards.
          <br />
          Predictions remain free for everyone.
        </div>
      </div>
    </div>
  );
}

function PassSuccessView({
  txHash,
  onClose,
}: {
  txHash: `0x${string}`;
  onClose: () => void;
}) {
  const explorerUrl = `https://celoscan.io/tx/${txHash}`;

  return (
    <div className="screen">
      <div className="topbar">
        <span className="topbar-logo">
          ⚽ <span>Mangoo</span>al
        </span>

        <CeloBadge variant="connected" />
      </div>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        <div className="card" style={{ textAlign: "center" }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: "var(--success)",
              color: "white",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 900,
              marginBottom: 16,
            }}
          >
            ✓
          </div>

          <h1
            style={{
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              marginBottom: 8,
            }}
          >
            Coach Pass active!
          </h1>

          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.55,
              marginBottom: 16,
            }}
          >
            Your Coach Pass is ready. Deeper match insights are now unlocked.
          </p>

          <div
            className="card"
            style={{
              textAlign: "left",
              marginBottom: 16,
              boxShadow: "none",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Receipt
            </div>

            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "var(--green)",
                fontSize: 13,
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              View receipt
            </a>
          </div>

          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              lineHeight: 1.5,
              marginBottom: 16,
            }}
          >
            Coach Pass does not affect your points, ranking, or promotional
            reward eligibility.
          </p>

          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
