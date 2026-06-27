import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAccount } from "wagmi";
import { CeloBadge } from "../components/CeloBadge";
import type { MatchData } from "../components/MatchCard";
import { useCommitPrediction, useHasActiveCoachPass } from "../hooks/useMangoalLedger";
import { getMatchById, matchStatus } from "../config/matches";
import { findMatch, useEspnScores } from "../hooks/useEspnScores";
import { useLanguage } from "../i18n";
import { getLocalPicks, saveLocalPick } from "../utils/localPicks";

function toEspnDateUTC(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function isInsufficientFunds(err: Error | null): boolean {
  if (!err) return false;
  const msg = err.message.toLowerCase();
  return msg.includes("insufficient") || msg.includes("not enough") || msg.includes("balance");
}

function TeamMark({ value }: { value?: string | null }) {
  if (!value) return null;
  if (value.startsWith("http")) {
    return <img className="team-logo detail-logo" src={value} alt="" aria-hidden="true" loading="lazy" />;
  }
  if (value.length > 4 && !/^[A-Z]{2,4}$/.test(value)) {
    return <span className="team-emoji" aria-hidden="true">{value}</span>;
  }
  return null;
}

const DETAIL_COPY = {
  en: {
    notFound: "Match not found",
    closed: "Predictions are closed",
    live: "Match in progress",
    finished: "Match finished",
    locked: "Window locked",
    coachLabel: "Mangooal Coach insight",
    coachTitle: "Data-based pick - Recent-form analysis",
    coachHelp: "Tap for suggested score and match context",
    finishedTitle: "Final result",
    finishedNoPick: "This match is finished. You did not record a pick for it.",
    yourForecast: "Your forecast",
    submit: "Submit prediction - Free",
    update: "Update pick - Free",
    coachActiveTitle: "Coach Pass active",
    coachActiveBody: "Coach suggests this score from public match data. You can still edit until 30 minutes before kickoff.",
    coachLockedTitle: "Want a sharper pick?",
    coachLockedBody: "Coach Pass unlocks recent form, match context, and a suggested score before you submit.",
    unlockCoach: "Unlock Coach Pass",
    connect: "Connect wallet to submit",
    waiting: "Waiting for confirmation...",
    openMiniPay: "Open in MiniPay or connect a Celo wallet",
    auditNote1: "Your prediction will be recorded on Celo for audit transparency.",
    auditNote2: "It is not a bet. No entry fee. No prize pool.",
    savedTitle: "Prediction saved!",
    recordedTitle: "Prediction recorded!",
    savedStatus: "Saved for My Picks",
    recordedStatus: "Recorded on Celo",
    savedBody: "Your pick is saved on this device and appears in My Picks.",
    recordedBody: "Your pick is committed on-chain. It cannot be edited after the prediction window closes.",
    kickoff: "Match time",
    deadline: "Pick deadline",
    timezone: "Timezone",
    viewAudit: "View on-chain audit",
    viewPicks: "View My Picks",
  },
  es: {
    notFound: "Partido no encontrado",
    closed: "Predicciones cerradas",
    live: "Partido en vivo",
    finished: "Partido finalizado",
    locked: "Ventana cerrada",
    coachLabel: "Insight de Mangooal Coach",
    coachTitle: "Pick con datos - Analisis de forma reciente",
    coachHelp: "Toca para ver marcador sugerido y contexto",
    finishedTitle: "Resultado final",
    finishedNoPick: "Este partido ya termino. No registraste un pick para este partido.",
    yourForecast: "Tu pronostico",
    submit: "Enviar prediccion - Gratis",
    update: "Actualizar pick - Gratis",
    coachActiveTitle: "Coach Pass activo",
    coachActiveBody: "Coach sugiere este marcador con datos publicos del partido. Puedes editar hasta 30 minutos antes del partido.",
    coachLockedTitle: "Quieres un pick mas claro?",
    coachLockedBody: "Coach Pass desbloquea forma reciente, contexto y marcador sugerido antes de enviar.",
    unlockCoach: "Desbloquear Coach Pass",
    connect: "Conecta wallet para enviar",
    waiting: "Esperando confirmacion...",
    openMiniPay: "Abre en MiniPay o conecta una wallet de Celo",
    auditNote1: "Tu prediccion se registra en Celo para transparencia.",
    auditNote2: "No es apuesta. Sin pago de entrada. Sin pozo de premios.",
    savedTitle: "Prediccion guardada!",
    recordedTitle: "Prediccion registrada!",
    savedStatus: "Guardada en Mis Picks",
    recordedStatus: "Registrada en Celo",
    savedBody: "Tu pick queda guardado en este dispositivo y aparece en Mis Picks.",
    recordedBody: "Tu pick queda registrado on-chain. No se puede editar al cerrar la ventana.",
    kickoff: "Hora del partido",
    deadline: "Cierre de picks",
    timezone: "Zona horaria",
    viewAudit: "Ver auditoria on-chain",
    viewPicks: "Ver Mis Picks",
  },
};

function formatDateTime(value: number, locale: string) {
  return new Date(value).toLocaleString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function PredictionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected, address } = useAccount();
  const { language } = useLanguage();
  const copy = DETAIL_COPY[language];
  const locale = language === "es" ? "es" : "en";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedTxHash, setSubmittedTxHash] = useState<`0x${string}` | undefined>();
  const [submittedPreview, setSubmittedPreview] = useState(false);
  const { commit, isPending, error } = useCommitPrediction();
  const { hasPass } = useHasActiveCoachPass(address);

  const registeredMatch = getMatchById(id ?? "");
  const stateMatch = (location.state as { match?: MatchData } | null)?.match;
  const activeMatch = registeredMatch ?? stateMatch;
  const activeKickoffAt = registeredMatch?.kickoffAt ?? stateMatch?.kickoff.getTime() ?? 0;
  const activeLockedAt = registeredMatch?.lockedAt ?? stateMatch?.lockedAt.getTime() ?? 0;
  const matchDate = activeMatch ? toEspnDateUTC(new Date(activeKickoffAt)) : undefined;
  const { matches: espnMatches } = useEspnScores("fifa.world", matchDate, language);
  const liveMatch = activeMatch ? findMatch(espnMatches, activeMatch.home, activeMatch.away) : null;
  const status = registeredMatch ? matchStatus(registeredMatch) : stateMatch?.status ?? null;
  const isOpen = activeMatch ? Date.now() < activeLockedAt : false;
  const homeName = liveMatch?.home ?? activeMatch?.home ?? "";
  const awayName = liveMatch?.away ?? activeMatch?.away ?? "";
  const homeMark = liveMatch?.homeLogo ?? activeMatch?.homeFlag;
  const awayMark = liveMatch?.awayLogo ?? activeMatch?.awayFlag;
  const hasResult = liveMatch?.homeScore !== null && liveMatch?.homeScore !== undefined && liveMatch?.awayScore !== null && liveMatch?.awayScore !== undefined;
  const savedPick = useMemo(
    () => activeMatch ? getLocalPicks().find((pick) => pick.id === activeMatch.id) : undefined,
    [activeMatch],
  );
  const isEditing = Boolean(savedPick && Date.now() < activeLockedAt);

  useEffect(() => {
    if (!savedPick || submitted) return;
    setHome(String(savedPick.homeScore));
    setAway(String(savedPick.awayScore));
  }, [savedPick, submitted]);

  function goMyPicks() {
    window.localStorage.setItem("mangooal:root-tab", "my-picks");
    window.dispatchEvent(new Event("mangooal:tab"));
    navigate("/");
  }

  if (!activeMatch) {
    return (
      <div className="screen">
        <div className="topbar">
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }} aria-label="Back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <CeloBadge variant="network" />
        </div>
        <div className="screen-body" style={{ paddingTop: 40, textAlign: "center", color: "var(--text-muted)" }}>
          {copy.notFound}
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    if (!home || !away || !activeMatch) return;

    const localEntry = {
      id: activeMatch.id,
      competition: activeMatch.competition,
      home: homeName,
      away: awayName,
      homeMark,
      awayMark,
      homeScore: Number(home),
      awayScore: Number(away),
      kickoffAt: activeKickoffAt,
      lockedAt: activeLockedAt,
      savedAt: Date.now(),
      source: registeredMatch ? "celo" as const : "preview" as const,
    };

    if (!registeredMatch) {
      localStorage.setItem(
        `mangooal:preview-pick:${activeMatch.id}`,
        JSON.stringify({ homeScore: Number(home), awayScore: Number(away), savedAt: Date.now() })
      );
      saveLocalPick(localEntry);
      setSubmittedPreview(true);
      setSubmitted(true);
      return;
    }

    try {
      const result = await commit({
        campaignId: registeredMatch.campaignId,
        matchId: registeredMatch.matchId,
        homeScore: Number(home),
        awayScore: Number(away),
      });
      saveLocalPick({ ...localEntry, txHash: result.hash });
      setSubmittedTxHash(result.hash);
      setSubmittedPreview(false);
      setSubmitted(true);
    } catch {
      // error surfaces through the hook state
    }
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button
          onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}
          aria-label="Back"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="topbar-logo" style={{ fontSize: 17 }}>{activeMatch.competition}</span>
        <span />
      </div>

      <div className="screen-body" style={{ paddingTop: 20 }}>
        {submitted ? (
          <SubmittedView
            match={{ id: activeMatch.id, home: homeName, away: awayName }}
            home={Number(home)}
            away={Number(away)}
            txHash={submittedTxHash}
            isPreview={submittedPreview}
            kickoffAt={activeKickoffAt}
            lockedAt={activeLockedAt}
            locale={locale}
            timezone={timezone}
            copy={copy}
            onAudit={() => registeredMatch ? navigate(`/audit/${registeredMatch.id}`) : goMyPicks()}
            onMyPicks={goMyPicks}
          />
        ) : (
          <>
            <div className="forecast-match-card">
              <div className="forecast-date">
                {activeMatch.competition} - {formatDateTime(activeKickoffAt, locale)}
              </div>
              <div className="forecast-timezone">{copy.timezone}: {timezone}</div>
              <div className="match-teams">
                <div className="team-name">
                  <TeamMark value={homeMark} />
                  {homeName}
                </div>
                <div className="score-vs">vs</div>
                <div className="team-name">
                  <TeamMark value={awayMark} />
                  {awayName}
                </div>
              </div>

              {!isOpen && (
                <div className="forecast-lock-note">
                  {copy.closed} - {status === "live" ? copy.live : status === "finished" ? copy.finished : copy.locked}
                </div>
              )}
            </div>

            {status === "finished" && (
              <div className="finished-detail-card">
                <div>
                  <span>{copy.finishedTitle}</span>
                  <strong>{hasResult ? `${liveMatch?.homeScore} - ${liveMatch?.awayScore}` : "FT"}</strong>
                </div>
                <p>{copy.finishedNoPick}</p>
              </div>
            )}

            {registeredMatch && status !== "finished" && (
              <button
                className="coach-card coach-compact-link"
                onClick={() => navigate(`/coach/${registeredMatch.id}`)}
                type="button"
              >
                <div className="coach-label">{copy.coachLabel}</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 6 }}>
                  {copy.coachTitle}
                </div>
                <div style={{ fontSize: 13, opacity: 0.82, marginTop: 4 }}>
                  {copy.coachHelp}
                </div>
              </button>
            )}

            {isOpen && (
              <>
                <div className="section-title">{copy.yourForecast}</div>
                <div className="card forecast-input-card">
                  <div className={`coach-pass-advice ${hasPass ? "" : "locked"}`}>
                    <strong>{hasPass ? copy.coachActiveTitle : copy.coachLockedTitle}</strong>
                    <span>{hasPass ? copy.coachActiveBody : copy.coachLockedBody}</span>
                    {!hasPass && (
                      <button className="coach-inline-action" type="button" onClick={() => navigate("/coach-pass")}>
                        {copy.unlockCoach}
                      </button>
                    )}
                  </div>
                  <div className="forecast-teams-line">
                    <span>{homeName}</span>
                    <span>{awayName}</span>
                  </div>

                  <div className="score-input-row">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      className="score-input"
                      value={home}
                      onChange={(e) => setHome(e.target.value)}
                      placeholder="0"
                    />
                    <span className="score-vs">-</span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      className="score-input"
                      value={away}
                      onChange={(e) => setAway(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  {error && (
                    <div className="hint-card error">
                      {error.message || "Transaction failed. Please try again."}
                      {isInsufficientFunds(error) && (
                        <div style={{ marginTop: 6 }}>
                          <a href="https://link.minipay.xyz/add_cash?tokens=USDm,USDC,USDT" target="_blank" rel="noopener noreferrer">
                            Add funds in MiniPay
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={!home || !away || isPending || !isConnected}
                  >
                    {!isConnected
                      ? copy.connect
                      : isPending
                        ? copy.waiting
                        : isEditing ? copy.update : copy.submit}
                  </button>

                  {!isConnected && (
                    <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                      {copy.openMiniPay}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 12, lineHeight: 1.6 }}>
                  {copy.auditNote1}
                  <br />{copy.auditNote2}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SubmittedView({
  match, home, away, txHash, isPreview, kickoffAt, lockedAt, locale, timezone, copy, onAudit, onMyPicks,
}: {
  match: { home: string; away: string; id: string };
  home: number;
  away: number;
  txHash?: `0x${string}`;
  isPreview: boolean;
  kickoffAt: number;
  lockedAt: number;
  locale: string;
  timezone: string;
  copy: typeof DETAIL_COPY.en;
  onAudit: () => void;
  onMyPicks: () => void;
}) {
  return (
    <div className="prediction-recorded">
      <div className="record-ball" aria-hidden="true" />
      <h2>{isPreview ? copy.savedTitle : copy.recordedTitle}</h2>
      <p className="record-score">
        {match.home} {home} - {away} {match.away}
      </p>

      <div className="card record-card">
        <div className="wallet-bar record-status">
          <span className="status-dot dot-green" />
          {isPreview ? copy.savedStatus : copy.recordedStatus}
        </div>
        {txHash && (
          <div className="record-hash">
            {txHash}
          </div>
        )}
        <div className="record-copy">
          {isPreview ? copy.savedBody : copy.recordedBody}
        </div>

        <div className="record-grid">
          <span>{copy.kickoff}</span>
          <strong>{formatDateTime(kickoffAt, locale)}</strong>
          <span>{copy.deadline}</span>
          <strong>{formatDateTime(lockedAt, locale)}</strong>
          <span>{copy.timezone}</span>
          <strong>{timezone}</strong>
        </div>
      </div>

      {!isPreview && (
        <button className="btn btn-secondary" onClick={onAudit} style={{ marginBottom: 10 }}>
          {copy.viewAudit}
        </button>
      )}
      <button className="btn btn-primary" onClick={onMyPicks}>
        {copy.viewPicks}
      </button>
    </div>
  );
}
