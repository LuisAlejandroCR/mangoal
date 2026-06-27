import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CeloBadge } from "../components/CeloBadge";
import { LanguageToggle } from "../components/LanguageToggle";
import { MatchCard } from "../components/MatchCard";
import {
  COMPETITIONS,
  MAX_VISIBLE_MATCHES,
  filterMatches,
  getNextCompetition,
  toApiMatch,
  type CompetitionId,
  type MatchFilter,
} from "../config/competitions";
import { useEspnScores } from "../hooks/useEspnScores";
import { useLiveWorldCupMatches } from "../hooks/useLiveWorldCupMatches";
import { useMiniPay } from "../hooks/useMiniPay";
import { useLanguage } from "../i18n";

export function Predictions() {
  const { isMiniPay, isConnected, address } = useMiniPay();
  const { language, copy } = useLanguage();
  const navigate = useNavigate();
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

  const selectedMatches = useMemo(() => {
    if (selectedCompetition.current) return worldCupMatches;
    return cupApiMatches.map((match) => toApiMatch(selectedCompetition, match));
  }, [cupApiMatches, selectedCompetition, worldCupMatches]);

  const isLoading = selectedCompetition.current ? worldCupLoading : cupApiLoading;
  const error = selectedCompetition.current ? worldCupError : cupApiError;

  const filteredMatches = filterMatches(selectedMatches, filter);
  const visibleMatches = filteredMatches.slice(0, MAX_VISIBLE_MATCHES);
  const liveCount = selectedMatches.filter((match) => match.status === "live").length;
  const scheduleCount = filterMatches(selectedMatches, "schedule").length;
  const predictionReadyCount = selectedMatches.filter((match) => match.canPredict !== false).length;

  function switchCup() {
    const nextCompetition = getNextCompetition(selectedCompetitionId);
    setSelectedCompetitionId(nextCompetition.id);
    setFilter(nextCompetition.current ? "schedule" : "all");
  }

  return (
    <div className="screen">
      <div className="topbar">
        <span className="topbar-logo">
          <span>Mangoo</span>al
        </span>

        <div className="topbar-actions">
          <LanguageToggle />
          <CeloBadge variant={isConnected ? "connected" : "network"} />
        </div>
      </div>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        {isConnected && (
          <div className="wallet-bar">
            <span>{isMiniPay ? copy.predictions.minipayConnected : copy.predictions.walletConnected}</span>

            {address && !isMiniPay && (
              <span>
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            )}
          </div>
        )}

        <button
          className="campaign-banner campaign-banner-button"
          onClick={switchCup}
          type="button"
        >
          <div className="campaign-eyebrow">{copy.predictions.currentCup}</div>
          <div className="campaign-title">
            {copy.predictions.now}: {selectedCompetition.name}
          </div>
          <div className="campaign-meta">{selectedCompetition.description[language]}</div>
          <div className="campaign-next">{copy.predictions.tapBannerToSwitch}</div>
          <div className="campaign-pills">
            <span>{predictionReadyCount} {copy.predictions.freePredictions}</span>
            <span>{scheduleCount} {copy.predictions.open}</span>
            <span>{copy.predictions.promoRewards}</span>
          </div>
        </button>

        <div className="action-filter" aria-label="Match view">
          {([
            ["live", `${copy.predictions.live} (${liveCount})`],
            ["schedule", `${copy.predictions.schedule} (${scheduleCount})`],
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

        <div className="match-list-heading">
          <div>
            <div className="section-title">{selectedCompetition.name}</div>
            <div className="source-note">{copy.predictions.nextMatches}</div>
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

        {visibleMatches.length > 0 ? (
          visibleMatches.map((match) => <MatchCard key={match.id} match={match} />)
        ) : (
          <div className="card" style={{ textAlign: "center" }}>
            <strong>{copy.predictions.noMatches}</strong>
          </div>
        )}

        <div className="compliance-note">
          {copy.predictions.complianceLine1}
          <br />
          {copy.predictions.complianceLine2}
        </div>
      </div>
    </div>
  );
}
