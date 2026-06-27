import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CeloBadge } from "../components/CeloBadge";
import { LanguageToggle } from "../components/LanguageToggle";
import { MatchCard } from "../components/MatchCard";
import {
  filterMatches,
  getCompetition,
  toApiMatch,
  type MatchFilter,
} from "../config/competitions";
import { useEspnScores } from "../hooks/useEspnScores";
import { useLiveWorldCupMatches } from "../hooks/useLiveWorldCupMatches";
import { useMiniPay } from "../hooks/useMiniPay";
import { useLanguage } from "../i18n";

function getFilter(value: string | null): MatchFilter {
  if (value === "live" || value === "schedule" || value === "all") return value;
  return "all";
}

export function AllMatches() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isConnected } = useMiniPay();
  const { language, copy } = useLanguage();

  const selectedCompetition = getCompetition(searchParams.get("cup"));
  const filter = getFilter(searchParams.get("filter"));
  const { matches: worldCupMatches, isLoading: worldCupLoading } = useLiveWorldCupMatches(language);
  const { matches: cupApiMatches, isLoading: cupApiLoading } = useEspnScores(
    selectedCompetition.league,
    undefined,
    language
  );

  const matches = useMemo(() => {
    if (selectedCompetition.current) return worldCupMatches;
    return cupApiMatches.map((match) => toApiMatch(selectedCompetition, match));
  }, [cupApiMatches, selectedCompetition, worldCupMatches]);

  const visibleMatches = filterMatches(matches, filter);
  const isLoading = selectedCompetition.current ? worldCupLoading : cupApiLoading;

  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-button" onClick={() => navigate(-1)} type="button" aria-label={copy.common.back}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="topbar-logo compact">
          <span>{copy.predictions.allMatches}</span>
        </span>

        <div className="topbar-actions">
          <LanguageToggle />
          <CeloBadge variant={isConnected ? "connected" : "network"} />
        </div>
      </div>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        <div className="match-list-heading">
          <div>
            <div className="section-title">{selectedCompetition.name}</div>
            <div className="source-note">{copy.predictions.nextMatches}</div>
          </div>
          <span className="count-pill">{visibleMatches.length}</span>
        </div>

        {isLoading && (
          <div className="card" style={{ marginBottom: 14 }}>
            {copy.predictions.loading}
          </div>
        )}

        {visibleMatches.length > 0 ? (
          visibleMatches.map((match) => <MatchCard key={match.id} match={match} />)
        ) : (
          <div className="card" style={{ textAlign: "center" }}>
            <strong>{copy.predictions.noMatches}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
