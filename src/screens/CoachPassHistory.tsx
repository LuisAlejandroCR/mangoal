import { useNavigate } from "react-router-dom";
import { LanguageToggle } from "../components/LanguageToggle";
import { useLanguage } from "../i18n";
import { useCoachPassHistory } from "../hooks/useMangoalLedger";
import { useMiniPay } from "../hooks/useMiniPay";

const PASS_LABELS = {
  en: { 1: "Daily", 2: "Weekly", 3: "Campaign", 4: "Season" },
  es: { 1: "Diario", 2: "Semanal", 3: "Campana", 4: "Temporada" },
} as const;

function shortHash(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function proofUrl(txHash: string) {
  return `https://celoscan.io/tx/${txHash}`;
}

export function CoachPassHistory() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const labels = PASS_LABELS[language];
  const { address } = useMiniPay();
  const { items: history, isLoading } = useCoachPassHistory(address as `0x${string}` | undefined);
  const c = language === "es"
    ? { title: "Historial", loading: "Cargando...", empty: "Aun no hay compras de Coach Pass para esta cuenta.", proof: "Prueba", qr: "QR del recibo", token: "Pago", tx: "Transaccion" }
    : { title: "History", loading: "Loading...", empty: "No Coach Pass purchases for this account yet.", proof: "Proof", qr: "Receipt QR", token: "Paid with", tx: "Transaction" };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-button" onClick={() => navigate(-1)} type="button" aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="topbar-logo compact"><span>Coach Pass</span></span>
        <LanguageToggle />
      </div>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        <div className="section-title">{c.title}</div>
        {isLoading && <div className="card" style={{ marginBottom: 12 }}>{c.loading}</div>}
        {history.length > 0 ? (
          history.map((item) => {
            const url = proofUrl(item.txHash);
            const passLabel = labels[item.passType as keyof typeof labels] ?? "Coach";
            return (
              <div className="history-card" key={item.txHash}>
                <div className="history-main">
                  <div>
                    <strong>{passLabel} Pass</strong>
                    <small>{new Date(item.purchasedAt).toLocaleString()}</small>
                  </div>
                  <span>{item.tokenSymbol}</span>
                </div>
                <div className="history-detail-row">
                  <span>{c.token}</span>
                  <strong>{item.tokenSymbol}</strong>
                </div>
                <div className="history-detail-row">
                  <span>{c.tx}</span>
                  <code>{shortHash(item.txHash)}</code>
                </div>
                <div className="history-proof-row">
                  <img
                    alt={c.qr}
                    className="history-qr"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(url)}`}
                  />
                  <a className="btn btn-secondary btn-sm" href={url} rel="noreferrer" target="_blank">
                    {c.proof}
                  </a>
                </div>
              </div>
            );
          })
        ) : (
          <div className="card" style={{ textAlign: "center" }}>
            <strong>{c.empty}</strong>
          </div>
        )}
      </div>
    </div>
  );
}