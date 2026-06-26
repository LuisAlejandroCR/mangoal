import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { CeloBadge } from "../components/CeloBadge";
import {
  FEATURED_TOKENS,
  type StablecoinInfo,
} from "../config/stablecoins";
import {
  PASS_AMOUNTS,
  usePurchaseCoachPass,
} from "../hooks/useMangoalLedger";
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

function detectMiniPayRuntime() {
  if (typeof window === "undefined") return false;

  const ethereum = (
    window as typeof window & {
      ethereum?: {
        isMiniPay?: boolean;
      };
    }
  ).ethereum;

  return Boolean(ethereum?.isMiniPay);
}

function getPreferredMiniPayToken() {
  return (
    FEATURED_TOKENS.find((token) => token.symbol === "USDC") ??
    FEATURED_TOKENS.find((token) => token.symbol === "USDm") ??
    FEATURED_TOKENS.find((token) => token.miniPayCore) ??
    FEATURED_TOKENS[0]
  );
}

const DEFAULT_MINIPAY_TOKEN = getPreferredMiniPayToken();

export function CoachPass() {
  const [selectedPass, setSelectedPass] = useState("weekly");
  const [selectedToken, setSelectedToken] =
    useState<StablecoinInfo>(DEFAULT_MINIPAY_TOKEN);

  const { isConnected, address } = useAccount();
  const { purchase, step, txHash, isPending, error, reset } =
    usePurchaseCoachPass();
  const { rawBalances } = useTokenBalances(
    address as `0x${string}` | undefined
  );

  const isMiniPay = useMemo(() => detectMiniPayRuntime(), []);

  const paymentTokens = useMemo(() => {
    if (isMiniPay) {
      return FEATURED_TOKENS.filter((token) => token.miniPayCore);
    }

    return FEATURED_TOKENS;
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

  const explorerUrl = txHash ? `https://celoscan.io/tx/${txHash}` : undefined;

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
      // The hook stores and exposes the error state.
    }
  }

  if (step === "done" && txHash) {
    return (
      <PassSuccessView
        txHash={txHash}
        explorerUrl={explorerUrl}
        onClose={reset}
      />
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100 p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Coach Pass
            </p>
            <h1 className="mt-1 text-3xl font-black text-stone-950">
              Mangooal Coach Pass
            </h1>
          </div>

          <CeloBadge />
        </div>

        <p className="max-w-2xl text-base text-stone-700">
          Unlock deeper match insights from Mangooal Coach. Predictions stay
          free for everyone.
        </p>

        <div className="mt-5 rounded-2xl border border-amber-300 bg-white/75 p-4 text-sm text-stone-700">
          <strong className="text-stone-950">Fair-play note:</strong> Coach
          Pass does not affect points, ranking, or promotional rewards. It is
          optional and non-competitive.
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-stone-950">
            What you unlock
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PERKS.map((perk) => (
              <div
                key={perk}
                className="rounded-2xl border border-stone-100 bg-stone-50 p-3 text-sm text-stone-700"
              >
                <span className="mr-2 font-bold text-emerald-600">✓</span>
                {perk}
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-stone-950">
            Choose your pass
          </h2>

          <div className="mt-4 flex flex-col gap-3">
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
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-amber-500 bg-amber-50"
                      : "border-stone-200 bg-white hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-stone-950">{pass.label}</p>
                      <p className="text-sm text-stone-500">{pass.duration}</p>
                    </div>

                    <p className="text-sm font-bold text-amber-700">
                      {pass.price[selectedToken.symbol]}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-stone-950">Pay with</h3>

              {isMiniPay && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  MiniPay-safe
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {paymentTokens.map((token) => {
                const active = selectedToken.symbol === token.symbol;

                return (
                  <button
                    key={token.symbol}
                    type="button"
                    onClick={() => {
                      setSelectedToken(token);
                      reset();
                    }}
                    className={`rounded-2xl border px-3 py-3 text-sm font-bold transition ${
                      active
                        ? "border-amber-500 bg-amber-50 text-amber-800"
                        : "border-stone-200 bg-white text-stone-700 hover:border-amber-300"
                    }`}
                  >
                    <span className="mr-1">{token.flagEmoji}</span>
                    {token.symbol}
                  </button>
                );
              })}
            </div>

            {!isMiniPay && (
              <p className="mt-3 text-xs text-stone-500">
                COPm is available as a Celo Mainnet option outside MiniPay. For
                MiniPay users, Mangooal prioritizes USDC, USDT, and USDm.
              </p>
            )}
          </div>

          {isLowBalance && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Not enough {selectedToken.symbol}.{" "}
              <a
                href={ADD_CASH_URL}
                target="_blank"
                rel="noreferrer"
                className="font-bold underline"
              >
                Add funds in MiniPay
              </a>
            </div>
          )}

          {step === "error" && error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error.message || "Transaction failed. Please try again."}
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-stone-500">Total</span>
              <span className="text-lg font-black text-stone-950">
                {currentPass.price[selectedToken.symbol]}
              </span>
            </div>

            <p className="mt-1 text-xs text-stone-500">
              Payment processed on Celo Mainnet.
            </p>
          </div>

          <button
            type="button"
            onClick={handleUnlock}
            disabled={isPending || isLowBalance}
            className="mt-4 w-full rounded-2xl bg-stone-950 px-5 py-4 text-sm font-black text-white shadow-sm transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {step === "approving"
              ? "Approving spend..."
              : step === "purchasing"
                ? "Processing Coach Pass..."
                : `Unlock Coach Pass · ${currentPass.price[selectedToken.symbol]}`}
          </button>

          <p className="mt-3 text-center text-xs text-stone-500">
            Coach Pass gives deeper match context. It does not affect points,
            rankings, or rewards.
          </p>
        </aside>
      </section>
    </main>
  );
}

function PassSuccessView({
  txHash,
  explorerUrl,
  onClose,
}: {
  txHash: `0x${string}`;
  explorerUrl?: string;
  onClose: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-8">
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white">
          ✓
        </div>

        <h1 className="mt-4 text-2xl font-black text-stone-950">
          Coach Pass active!
        </h1>

        <p className="mt-2 text-sm text-stone-700">
          Your Coach Pass is now live on Celo Mainnet. Deeper match insights are
          now unlocked.
        </p>

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-white p-4 text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
            Recorded on Celo Mainnet
          </p>

          <p className="mt-2 break-all font-mono text-xs text-stone-700">
            {txHash}
          </p>

          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-sm font-bold text-emerald-700 underline"
            >
              View on Celoscan
            </a>
          )}
        </div>

        <p className="mt-4 text-xs text-stone-500">
          Coach Pass does not affect your points, ranking, or promotional reward
          eligibility.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-stone-950 px-5 py-4 text-sm font-black text-white"
        >
          Done
        </button>
      </section>
    </main>
  );
}