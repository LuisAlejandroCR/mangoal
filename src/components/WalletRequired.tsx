import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { usePrivy } from "@privy-io/react-auth";
import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { PrivyActiveContext } from "../App";
import { useMiniPay } from "../hooks/useMiniPay";
import { useLanguage } from "../i18n";

// ── Email / Privy login section (rendered only inside PrivyProvider) ───────────
function PrivyLoginSection({ copy }: { copy: ReturnType<typeof useCopy> }) {
  const { login, ready } = usePrivy();
  return (
    <>
      <button
        className="btn btn-primary"
        type="button"
        disabled={!ready}
        onClick={() => login()}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 9h20" />
        </svg>
        {!ready ? copy.pending : copy.email}
      </button>
      <div style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0" }}>
        {copy.or}
      </div>
      <button
        className="btn btn-secondary"
        type="button"
        disabled={!ready}
        onClick={() => login()}
      >
        {copy.wallet}
      </button>
    </>
  );
}

// ── Injected wallet section (rendered in standalone wagmi tree) ───────────────
function StandaloneLoginSection({ copy }: { copy: ReturnType<typeof useCopy> }) {
  const { connect, isPending } = useConnect();
  return (
    <button
      className="btn btn-primary"
      type="button"
      disabled={isPending}
      onClick={() => connect({ connector: injected() })}
    >
      {isPending ? copy.pending : copy.wallet}
    </button>
  );
}

// ── Copy helper ───────────────────────────────────────────────────────────────
function useCopy(language: "en" | "es") {
  return language === "es"
    ? {
        title: "Bienvenido a Mangooal",
        body: "Inicia sesión para ver tus picks, ranking y Coach Pass.",
        miniPay: "Abre Mangooal desde MiniPay para conectar automáticamente.",
        email: "Continuar con email",
        wallet: "Conectar wallet",
        pending: "Cargando…",
        or: "o",
        tour: "Ver tour demo",
      }
    : {
        title: "Welcome to Mangooal",
        body: "Sign in to see your picks, ranking, and Coach Pass.",
        miniPay: "Open Mangooal inside MiniPay to connect automatically.",
        email: "Continue with email",
        wallet: "Connect wallet",
        pending: "Loading…",
        or: "or",
        tour: "View demo tour",
      };
}

// ── Main component ────────────────────────────────────────────────────────────
export function WalletRequired() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isMiniPay } = useMiniPay();
  const privyActive = useContext(PrivyActiveContext);
  const copy = useCopy(language);

  return (
    <div className="screen-body locked-body">
      <div className="card wallet-required-card">
        <div className="brand-ball-icon large" aria-hidden="true" />
        <h1>{copy.title}</h1>
        <p>{isMiniPay ? copy.miniPay : copy.body}</p>

        {!isMiniPay && (
          privyActive
            ? <PrivyLoginSection copy={copy} />
            : <StandaloneLoginSection copy={copy} />
        )}

        <button className="btn btn-secondary" type="button" onClick={() => navigate("/demo")}>
          {copy.tour}
        </button>
      </div>
    </div>
  );
}
