import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { LanguageToggle } from "../components/LanguageToggle";
import { MatchCard } from "../components/MatchCard";
import { StablecoinBalances } from "../components/StablecoinBalances";
import {
  COMPETITIONS,
  MAX_VISIBLE_MATCHES,
  filterMatches,
  toApiMatch,
  type CompetitionId,
  type MatchFilter,
} from "../config/competitions";
import { useEspnScores } from "../hooks/useEspnScores";
import { useLiveWorldCupMatches } from "../hooks/useLiveWorldCupMatches";
import { useLanguage } from "../i18n";
import { useMiniPay } from "../hooks/useMiniPay";
import { getLocalPicks, type LocalPick } from "../utils/localPicks";

export function Predictions() {
  const { language, copy } = useLanguage();
  const navigate = useNavigate();
  const { isMiniPay, isConnected } = useMiniPay();
  const { connect, isPending: isConnecting } = useConnect();
  const [localPicks, setLocalPicks] = useState<LocalPick[]>(() => getLocalPicks());
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<CompetitionId>("world-cup");
  const [filter, setFilter] = useState<MatchFilter>("schedule");

  const selectedCompetition =
    COMPETITIONS.find((competition) => competition.id === selectedCompetitionId) ?? COMPETITIONS[0];

  const { matches: worldCupMatches, isLoading: worldCupLoading, error: worldCupError } =
    useLiveWorldCupMatches(language);
  const {
    matches: cupApiMatches,
    isLoading: cupApiLoading,
    error: cupApiError,
  } = useEspnScores(selectedCompetition.league, undefined, language);

  useEffect(() => {
    const refresh = () => setLocalPicks(getLocalPicks());
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const selectedMatches = useMemo(() => {
    const baseMatches = selectedCompetition.current
      ? worldCupMatches
      : cupApiMatches.map((match) => toApiMatch(selectedCompetition, match));
    const pickById = new Map(localPicks.map((pick) => [pick.id, pick]));

    return baseMatches.map((match) => {
      const savedPick = pickById.get(match.id);
      if (!savedPick) return match;
      return {
        ...match,
        userPick: {
          home: savedPick.homeScore,
          away: savedPick.awayScore,
        },
      };
    });
  }, [cupApiMatches, localPicks, selectedCompetition, worldCupMatches]);

  const isLoading = selectedCompetition.current ? worldCupLoading : cupApiLoading;
  const error = selectedCompetition.current ? worldCupError : cupApiError;

  const filteredMatches = filterMatches(selectedMatches, filter);
  const visibleMatches = filteredMatches.slice(0, MAX_VISIBLE_MATCHES);
  const liveCount = selectedMatches.filter((match) => match.status === "live").length;
  const scheduleCount = filterMatches(selectedMatches, "schedule").length;
  const finishedCount = filterMatches(selectedMatches, "finished").length;

  function selectCup(id: CompetitionId) {
    const nextCompetition = COMPETITIONS.find((competition) => competition.id === id) ?? COMPETITIONS[0];
    setSelectedCompetitionId(nextCompetition.id);
    setFilter(nextCompetition.current ? "schedule" : "all");
  }

  return (
    <div className="screen">
      <div className="topbar">
        <span className="topbar-logo">
          <span className="brand-ball-icon" aria-hidden="true" /> <span>Mangoo</span>al
        </span>

        <div className="topbar-actions">
          <LanguageToggle />
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
          {!isMiniPay && (
            <button
              className="icon-button"
              type="button"
              aria-label={isConnected ? "Wallet ready" : "Connect wallet"}
              onClick={() => setShowWalletModal(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Z" />
                <path d="M16 12h.01" />
                <path d="M18 7V5a2 2 0 0 0-2-2H6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="screen-body picks-body">
        <div className="picks-control-grid">
          <StablecoinBalances />

          <label className="cup-select-card">
            <span className="select-card-label">{language === "es" ? "Seleccionar copa" : "Select cup"}</span>
            <strong>{selectedCompetition.marker}</strong>
            <small>{language === "es" ? "Toca para cambiar" : "Tap to change"}</small>
            <select
              value={selectedCompetitionId}
              onChange={(event) => selectCup(event.target.value as CompetitionId)}
              aria-label="Cup selector"
            >
              {COMPETITIONS.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.marker} - {competition.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="campaign-banner compact-cup-banner">
          <div className="campaign-eyebrow">{copy.predictions.currentCup}</div>
          <div className="campaign-title">{selectedCompetition.name}</div>
          <div className="campaign-meta">{selectedCompetition.description[language]}</div>
        </div>

        <div className="action-filter" aria-label="Match view">
          {([
            ["live", `${copy.predictions.live} (${liveCount})`],
            ["schedule", `${copy.predictions.schedule} (${scheduleCount})`],
            ["finished", `${copy.predictions.finished} (${finishedCount})`],
            ["all", `${copy.predictions.actionAll} (${selectedMatches.length})`],
          ] as const).map(([value, label]) => (
            <button
              className={filter === value ? "active" : ""}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="hint-card error">{copy.predictions.scheduleFallback}</div>
        )}

        {isLoading && (
          <div className="card" style={{ marginBottom: 14 }}>
            {copy.predictions.loading}
          </div>
        )}

        <div className="matches-panel">
          <div className="match-list-heading">
            <div>
              <div className="section-title">{copy.predictions.nextMatches}</div>
              <div className="source-note">{selectedCompetition.description[language]}</div>
            </div>

            {filteredMatches.length > MAX_VISIBLE_MATCHES && (
              <button
                className="text-action"
                onClick={() => navigate(`/matches?cup=${selectedCompetition.id}&filter=${filter}`)}
                type="button"
              >
                {copy.predictions.seeAll}
              </button>
            )}
          </div>

          <div className="matches-scroll">
            {visibleMatches.length > 0 ? (
              visibleMatches.map((match) => <MatchCard key={match.id} match={match} />)
            ) : (
              <div className="card" style={{ textAlign: "center" }}>
                <strong>{copy.predictions.noMatches}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {showWalletModal && !isMiniPay && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Connect wallet">
          <div className="wallet-modal card">
            <button className="modal-close" type="button" onClick={() => setShowWalletModal(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
            <div className="brand-ball-icon large" aria-hidden="true" />
            <h2>{isConnected ? "Wallet ready" : "Connect wallet"}</h2>
            <p>{isConnected ? "Your wallet is ready for free picks and Coach Pass." : "Connect a Celo wallet to record picks and unlock Coach Pass outside MiniPay."}</p>
            {!isConnected && (
              <button
                className="btn btn-primary"
                type="button"
                disabled={isConnecting}
                onClick={() => connect({ connector: injected() })}
              >
                {isConnecting ? "Connecting..." : "Connect wallet"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
