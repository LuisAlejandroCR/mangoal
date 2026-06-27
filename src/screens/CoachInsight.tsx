import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { LanguageToggle } from "../components/LanguageToggle";
import { useHasActiveCoachPass } from "../hooks/useMangoalLedger";
import { getMatchById } from "../config/matches";
import { useEspnScores, findMatch } from "../hooks/useEspnScores";
import { useLanguage } from "../i18n";

function getCoachContext(
  home: string,
  away: string,
  language: "en" | "es",
  homeRecord?: string | null,
  awayRecord?: string | null
) {
  const pending = language === "es" ? "forma pendiente" : "form pending";
  const homeText = homeRecord ? `${home}: ${homeRecord}` : `${home}: ${pending}`;
  const awayText = awayRecord ? `${away}: ${awayRecord}` : `${away}: ${pending}`;
  const summary = language === "es"
    ? `${homeText}. ${awayText}. Espera un partido equilibrado hasta que haya mas datos publicos de forma reciente.`
    : `${homeText}. ${awayText}. Expect a balanced match until fresher public form data is available.`;

  return {
    suggestedScore: "1 - 1",
    summary,
  };
}

export function CoachInsight() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address } = useAccount();
  const { language } = useLanguage();
  const c = language === "es"
    ? { notFound: "Partido no encontrado", publicContext: "Contexto con datos publicos de futbol", disclaimer: "Solo contexto del partido. Sin cuotas. Sin resultado garantizado.", context: "Contexto del partido", locked: "Insight de Coach Pass bloqueado", lockedBody: "Desbloquea contexto adicional: duelos directos, notas de alineacion, descanso y forma de jugadores clave.", unlock: "Desbloquear Coach" }
    : { notFound: "Match not found", publicContext: "Public football data context", disclaimer: "Match context only. No odds. No guaranteed result.", context: "Match context", locked: "Coach Pass insight locked", lockedBody: "Unlock deeper context: head-to-head, lineup notes, rest-day impact, and key player form.", unlock: "Unlock Coach" };
  const { hasPass } = useHasActiveCoachPass(address);
  const match = getMatchById(id ?? "");

  const matchDate = match
    ? new Date(match.kickoffAt).toISOString().slice(0, 10).replace(/-/g, "")
    : undefined;
  const { matches: espnMatches, isLoading: liveLoading } = useEspnScores("fifa.world", matchDate, language);
  const live = match ? findMatch(espnMatches, match.home, match.away) : null;

  const coach = useMemo(
    () => getCoachContext(live?.home ?? match?.home ?? "", live?.away ?? match?.away ?? "", language, live?.homeRecord, live?.awayRecord),
    [language, live, match]
  );

  if (!match) {
    return (
      <div className="screen">
        <div className="topbar">
          <button className="icon-button" onClick={() => navigate(-1)} type="button" aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="topbar-logo compact"><span>Mangooal Coach</span></span>
          <LanguageToggle />
        </div>
        <div className="screen-body" style={{ paddingTop: 40, textAlign: "center", color: "var(--text-muted)" }}>
          {c.notFound}
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-button" onClick={() => navigate(-1)} type="button" aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="topbar-logo compact"><span>Mangooal Coach</span></span>
        <LanguageToggle />
      </div>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>
            {live?.home ?? match.home} vs {live?.away ?? match.away}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            {match.competition}
          </div>
        </div>

        {!liveLoading && live && (live.status === "in_progress" || live.status === "final") && (
          <div className="live-score-card">
            <div>
              <small>{live.home}</small>
              <strong>{live.homeScore ?? "-"}</strong>
            </div>
            <span>{live.status === "in_progress" ? "LIVE" : "FT"}</span>
            <div>
              <small>{live.away}</small>
              <strong>{live.awayScore ?? "-"}</strong>
            </div>
          </div>
        )}

        <div className="coach-card">
          <div className="coach-label">Mangooal Coach</div>
          <div className="coach-score">{coach.suggestedScore}</div>
          <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>
            {c.publicContext}
          </div>
          <div className="coach-disclaimer">
            {c.disclaimer}
          </div>
        </div>

        <div className="section-title">{c.context}</div>
        <div className="card" style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
            {coach.summary}
          </p>
        </div>

        {!hasPass && (
          <div className="card" style={{ border: "2px solid var(--yellow)", background: "#FFFDF0", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>{c.locked}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 14 }}>
              {c.lockedBody}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/coach-pass")} style={{ width: "100%" }}>
              {c.unlock}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
