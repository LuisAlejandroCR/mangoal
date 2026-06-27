import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LanguageToggle } from "../components/LanguageToggle";
import { useLanguage } from "../i18n";
import { FEATURED_TOKENS, type StablecoinInfo } from "../config/stablecoins";
import {
  PASS_AMOUNTS,
  useCoachPassHistory,
  useHasActiveCoachPass,
  usePurchaseCoachPass,
} from "../hooks/useMangoalLedger";
import { useMiniPay } from "../hooks/useMiniPay";
import { useTokenBalances } from "../hooks/useTokenBalances";

const ADD_CASH_URL = "https://link.minipay.xyz/add_cash?tokens=USDm,USDC,USDT";
const PASS_DURATIONS_MS: Record<number, number> = {
  1: 24 * 60 * 60 * 1000,
  2: 7 * 24 * 60 * 60 * 1000,
  3: 30 * 24 * 60 * 60 * 1000,
  4: 180 * 24 * 60 * 60 * 1000,
};

type PassOption = {
  id: string;
  type: number;
  label: Record<"en" | "es", string>;
  duration: Record<"en" | "es", string>;
  price: Record<string, string>;
};

const PASS_OPTIONS: PassOption[] = [
  { id: "daily", type: 1, label: { en: "Daily", es: "Diario" }, duration: { en: "24 hours", es: "24 horas" }, price: { COPm: "500 COPm", USDC: "0.10 USDC", USDT: "0.10 USDT", USDm: "0.10 USDm" } },
  { id: "weekly", type: 2, label: { en: "Weekly", es: "Semanal" }, duration: { en: "7 days", es: "7 dias" }, price: { COPm: "2,500 COPm", USDC: "0.50 USDC", USDT: "0.50 USDT", USDm: "0.50 USDm" } },
  { id: "campaign", type: 3, label: { en: "Campaign", es: "Campana" }, duration: { en: "Campaign period", es: "Periodo de campana" }, price: { COPm: "8,000 COPm", USDC: "1.50 USDC", USDT: "1.50 USDT", USDm: "1.50 USDm" } },
  { id: "season", type: 4, label: { en: "Season", es: "Temporada" }, duration: { en: "6 months", es: "6 meses" }, price: { COPm: "40,000 COPm", USDC: "7.00 USDC", USDT: "7.00 USDT", USDm: "7.00 USDm" } },
];

const DEFAULT_MINIPAY_TOKEN =
  FEATURED_TOKENS.find((token) => token.symbol === "USDC") ??
  FEATURED_TOKENS.find((token) => token.symbol === "USDm") ??
  FEATURED_TOKENS.find((token) => token.miniPayCore) ??
  FEATURED_TOKENS[0];

function getPurchaseErrorMessage(error: Error, language: "en" | "es") {
  const message = error.message.toLowerCase();
  if (message.includes("user rejected") || message.includes("rejected the request")) {
    return language === "es" ? "Solicitud cancelada. No se cobro nada." : "Request cancelled. Nothing was charged.";
  }
  if (message.includes("chain")) {
    return language === "es" ? "Cambia tu billetera a Celo e intenta de nuevo." : "Switch your wallet to Celo and try again.";
  }
  return language === "es" ? "La compra de Coach Pass fallo. Intenta de nuevo." : "Coach Pass transaction failed. Please try again.";
}

function hasActiveHistoryPass(history: { passType: number; purchasedAt: number }[]) {
  return history.some((item) => Date.now() < item.purchasedAt + (PASS_DURATIONS_MS[item.passType] ?? PASS_DURATIONS_MS[1]));
}

export function CoachPass() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [view, setView] = useState<"overview" | "buy">("overview");
  const [selectedPass, setSelectedPass] = useState("weekly");
  const [selectedToken, setSelectedToken] = useState<StablecoinInfo>(DEFAULT_MINIPAY_TOKEN);
  const { isMiniPay, isConnected, address } = useMiniPay();
  const { hasPass } = useHasActiveCoachPass(address as `0x${string}` | undefined);
  const { items: history } = useCoachPassHistory(address as `0x${string}` | undefined);
  const activePass = hasPass || hasActiveHistoryPass(history);
  const { purchase, step, txHash, isPending, error, reset } = usePurchaseCoachPass();
  const { rawBalances } = useTokenBalances(address as `0x${string}` | undefined);

  const c = language === "es" ? {
    title: "Coach Pass",
    active: "Coach Pass activo",
    activeBody: "Tu contexto avanzado esta desbloqueado.",
    receipt: "Ver recibo",
    history: "Historial",
    overviewTitle: "Decide con mas contexto",
    overviewBody: "Coach Pass agrega forma reciente, duelos directos, notas clave y recordatorios. Los picks siguen gratis y no cambia tu ranking.",
    perks: ["Forma reciente", "Duelos directos", "Notas de partido", "Recordatorios"],
    choose: "Elegir pase",
    buy: "Pagar pase",
    payWith: "Paga con",
    addFunds: "Agregar fondos",
    noFunds: "Saldo insuficiente",
    unlock: "Desbloquear",
    approving: "Aprobando...",
    processing: "Procesando...",
    back: "Volver",
    notRanked: "No afecta puntos, ranking ni recompensas promocionales.",
  } : {
    title: "Coach Pass",
    active: "Coach Pass active",
    activeBody: "Advanced match context is unlocked.",
    receipt: "View receipt",
    history: "History",
    overviewTitle: "Decide with more context",
    overviewBody: "Coach Pass adds recent form, head-to-head notes, key match context, and reminders. Picks stay free and your ranking does not change.",
    perks: ["Recent form", "Head-to-head", "Match notes", "Reminders"],
    choose: "Choose pass",
    buy: "Pay pass",
    payWith: "Pay with",
    addFunds: "Add funds",
    noFunds: "Not enough",
    unlock: "Unlock",
    approving: "Approving...",
    processing: "Processing...",
    back: "Back",
    notRanked: "Does not affect points, ranking, or promotional rewards.",
  };

  const paymentTokens = useMemo(
    () => (isMiniPay ? FEATURED_TOKENS.filter((token) => token.miniPayCore) : FEATURED_TOKENS),
    [isMiniPay]
  );

  useEffect(() => {
    if (isMiniPay && !selectedToken.miniPayCore) {
      setSelectedToken(DEFAULT_MINIPAY_TOKEN);
      reset();
    }
  }, [isMiniPay, selectedToken.miniPayCore, reset]);

  const currentPass = PASS_OPTIONS.find((pass) => pass.id === selectedPass) ?? PASS_OPTIONS[1];
  const requiredAmount = PASS_AMOUNTS[currentPass.type]?.[selectedToken.symbol] ?? 0n;
  const userBalance = rawBalances[selectedToken.symbol] ?? 0n;
  const isLowBalance = isConnected && requiredAmount > 0n && userBalance < requiredAmount;

  async function handleUnlock() {
    if (!isConnected) {
      alert(language === "es" ? "Abre Mangooal en MiniPay o conecta una billetera Celo." : "Open Mangooal inside MiniPay or connect a Celo wallet.");
      return;
    }
    if (isMiniPay && !selectedToken.miniPayCore) {
      alert(language === "es" ? "MiniPay usa USDC, USDT o USDm para pagos." : "MiniPay payments use USDC, USDT, or USDm.");
      return;
    }
    if (isLowBalance) {
      alert(`${c.noFunds} ${selectedToken.symbol}.`);
      return;
    }
    try {
      await purchase({ passType: currentPass.type, token: selectedToken });
    } catch {
      // Hook state renders the user-safe message.
    }
  }

  if (step === "done" && txHash) {
    return <PassSuccessView />;
  }

  return (
    <div className="screen">
      <div className="topbar">
        {view === "buy" ? (
          <button className="icon-button" onClick={() => setView("overview")} type="button" aria-label={c.back}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <span className="topbar-logo"><span className="brand-ball-icon" aria-hidden="true" /> <span>Mangoo</span>al</span>
        )}
        <div className="topbar-actions">
          <a className="icon-button" href="/support" aria-label="Legal and support">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.1 9a3 3 0 1 1 5.8 1c-.4.9-1.2 1.4-2 2-.6.4-.9.8-.9 1.6" />
              <path d="M12 17h.01" />
            </svg>
          </a>
          <button className="icon-button" type="button" aria-label="Notifications" onClick={() => navigate("/support")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <LanguageToggle />
        </div>
      </div>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        {activePass && view === "overview" ? (
          <div className="card coach-active-card">
            <div className="success-mark">OK</div>
            <h1>{c.active}</h1>
            <p>{c.activeBody}</p>
            <div className="mini-perks">
              {c.perks.slice(0, 3).map((perk) => (
                <div key={perk}><span className="status-dot dot-green" />{perk}</div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={() => navigate("/coach-pass/history")} type="button">
              {c.history}
            </button>
          </div>
        ) : view === "overview" ? (
          <>
            <div className="coach-card compact-card">
              <div className="coach-label">Mangooal Coach</div>
              <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.05 }}>{c.overviewTitle}</div>
              <p style={{ fontSize: 14, lineHeight: 1.55, marginTop: 10 }}>{c.overviewBody}</p>
            </div>
            <div className="mini-perks coach-perks-grid">
              {c.perks.map((perk) => (
                <div key={perk}><span className="status-dot dot-green" />{perk}</div>
              ))}
            </div>
            <div className="card coach-pass-summary">
              <div>
                <strong>{PASS_OPTIONS[1].label[language]} Pass</strong>
                <small>{PASS_OPTIONS[1].duration[language]}</small>
              </div>
              <strong>{PASS_OPTIONS[1].price[selectedToken.symbol]}</strong>
            </div>
            <p className="compliance-note">{c.notRanked}</p>
            <button className="btn btn-primary" onClick={() => setView("buy")} type="button">
              {c.choose}
            </button>
          </>
        ) : (
          <>
            <div className="section-title">{c.choose}</div>
            <label className="pass-select-card">
              <span>{c.choose}</span>
              <strong>{currentPass.label[language]} Pass</strong>
              <small>{currentPass.duration[language]} - {currentPass.price[selectedToken.symbol]}</small>
              <select
                value={selectedPass}
                onChange={(event) => {
                  setSelectedPass(event.target.value);
                  reset();
                }}
              >
                {PASS_OPTIONS.map((pass) => (
                  <option key={pass.id} value={pass.id}>
                    {pass.label[language]} Pass - {pass.price[selectedToken.symbol]}
                  </option>
                ))}
              </select>
            </label>

            <div className="section-title">{c.payWith}</div>
            <div className="token-pills">
              {paymentTokens.map((token) => (
                <button
                  key={token.symbol}
                  type="button"
                  className={`token-pill ${selectedToken.symbol === token.symbol ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedToken(token);
                    reset();
                  }}
                >
                  <span className="token-dot" />
                  <span>{token.symbol}</span>
                </button>
              ))}
            </div>

            {isLowBalance && (
              <div className="hint-card error">
                {c.noFunds} {selectedToken.symbol}.{" "}
                <a href={ADD_CASH_URL} target="_blank" rel="noreferrer">{c.addFunds}</a>
              </div>
            )}

            {step === "error" && error && <div className="hint-card error">{getPurchaseErrorMessage(error, language)}</div>}

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUnlock}
              disabled={isPending || isLowBalance}
              style={{ opacity: isPending || isLowBalance ? 0.6 : 1 }}
            >
              {step === "approving"
                ? c.approving
                : step === "purchasing"
                  ? c.processing
                  : `${c.unlock} - ${currentPass.price[selectedToken.symbol]}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PassSuccessView() {
  const { language } = useLanguage();
  const c = language === "es"
    ? { active: "Coach Pass activo", body: "Contexto de partidos desbloqueado." }
    : { active: "Coach Pass active", body: "Deeper match insights are unlocked." };
  const navigate = useNavigate();

  return (
    <div className="screen">
      <div className="topbar">
        <span className="topbar-logo"><span className="brand-ball-icon" aria-hidden="true" /> <span>Mangoo</span>al</span>
        <LanguageToggle />
      </div>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        <div className="card coach-active-card">
          <div className="success-mark">OK</div>
          <h1>{c.active}</h1>
          <p>{c.body}</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/coach-pass/history")}>
            {language === "es" ? "Historial" : "History"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/")}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}