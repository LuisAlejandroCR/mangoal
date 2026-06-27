import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { LanguageToggle } from "../components/LanguageToggle";
import { useHasActiveCoachPass } from "../hooks/useMangoalLedger";
import { getMatchById } from "../config/matches";
import { useEspnScores, findMatch } from "../hooks/useEspnScores";
import { useLanguage } from "../i18n";

function parseRecordPoints(record?: string | null) {
  if (!record) return null;
  const parts = record.match(/(\d+)\s*-\s*(\d+)(?:\s*-\s*(\d+))?/);
  if (!parts) return null;

  const wins = Number(parts[1] ?? 0);
  const losses = Number(parts[2] ?? 0);
  const draws = Number(parts[3] ?? 0);
  const games = Math.max(1, wins + losses + draws);
  return {
    wins,
    losses,
    draws,
    games,
    pointsPerGame: (wins * 3 + draws) / games,
  };
}

function getCoachContext(
  home: string,
  away: string,
  language: "en" | "es",
  homeRecord?: string | null,
  awayRecord?: string | null,
  liveStatus?: string,
  homeScore?: number | null,
  awayScore?: number | null,
) {
  const homeForm = parseRecordPoints(homeRecord);
  const awayForm = parseRecordPoints(awayRecord);
  const formDelta = (homeForm?.pointsPerGame ?? 1.35) - (awayForm?.pointsPerGame ?? 1.35);
  const liveBias = liveStatus === "in_progress" && homeScore !== null && awayScore !== null
    ? Math.max(-1, Math.min(1, (homeScore ?? 0) - (awayScore ?? 0)))
    : 0;
  const advantage = formDelta + liveBias * 0.45 + 0.18;

  let homeGoals = 1;
  let awayGoals = 1;
  if (advantage > 0.85) {
    homeGoals = 2;
    awayGoals = 0;
  } else if (advantage > 0.35) {
    homeGoals = 2;
    awayGoals = 1;
  } else if (advantage < -0.85) {
    homeGoals = 0;
    awayGoals = 2;
  } else if (advantage < -0.35) {
    homeGoals = 1;
    awayGoals = 2;
  }

  const confidenceValue = Math.min(78, Math.max(54, Math.round(58 + Math.abs(advantage) * 16)));
  const pending = language === "es" ? "sin forma publica reciente" : "no recent public form";
  const homeText = homeRecord ? `${home}: ${homeRecord}` : `${home}: ${pending}`;
  const awayText = awayRecord ? `${away}: ${awayRecord}` : `${away}: ${pending}`;
  const leader = advantage > 0.2 ? home : advantage < -0.2 ? away : language === "es" ? "partido equilibrado" : "balanced match";
  const summary = language === "es"
    ? `${homeText}. ${awayText}. El modelo favorece a ${leader} por forma publica, localia y estado del partido.`
    : `${homeText}. ${awayText}. The model leans ${leader} using public form, venue context, and current match state.`;

  const homeWin = Math.min(68, Math.max(22, Math.round(40 + advantage * 22)));
  const awayWin = Math.min(68, Math.max(22, Math.round(40 - advantage * 22)));
  const draw = Math.max(16, 100 - homeWin - awayWin);

  return {
    suggestedScore: `${homeGoals} - ${awayGoals}`,
    confidence: `${confidenceValue}%`,
    winModel: { home: homeWin, draw, away: awayWin },
    summary,
    drivers: language === "es"
      ? ["Forma ESPN", "Localia", "Estado en vivo", "Volatilidad baja"]
      : ["ESPN form", "Venue edge", "Live state", "Low volatility"],
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
    () => getCoachContext(
      live?.home ?? match?.home ?? "",
      live?.away ?? match?.away ?? "",
      language,
      live?.homeRecord,
      live?.awayRecord,
      live?.status,
      live?.homeScore,
      live?.awayScore,
    ),
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
          <span className="topbar-logo compact"><span className="brand-ball-icon" aria-hidden="true" /> <span>Mangooal Coach</span></span>
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
        <span className="topbar-logo compact"><span className="brand-ball-icon" aria-hidden="true" /> <span>Mangooal Coach</span></span>
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
            {c.publicContext} - Confidence {coach.confidence}
          </div>
          <div className="coach-win-model">
            <span>{live?.home ?? match.home}: {coach.winModel.home}%</span>
            <span>Draw: {coach.winModel.draw}%</span>
            <span>{live?.away ?? match.away}: {coach.winModel.away}%</span>
          </div>
          <div className="coach-driver-list">
            {coach.drivers.map((driver) => <span key={driver}>{driver}</span>)}
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
