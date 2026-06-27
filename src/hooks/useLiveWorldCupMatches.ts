import { useMemo } from "react";

import type { MatchData } from "../components/MatchCard";
import {
  COPA_MATCHES,
  matchStatus,
  type MatchConfig,
} from "../config/matches";
import { useEspnScores, type EspnMatch, type ScoreLanguage } from "./useEspnScores";

const ESPN_LEAGUE = "fifa.world";

function toEspnDateUTC(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function buildDatesFromRegisteredMatches() {
  const dates = new Set<string>();

  COPA_MATCHES.forEach((match) => {
    dates.add(toEspnDateUTC(new Date(match.kickoffAt)));
  });

  return Array.from(dates);
}

function normalizeTeamName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function teamsMatch(local: MatchConfig, live: EspnMatch) {
  const localHome = normalizeTeamName(local.home);
  const localAway = normalizeTeamName(local.away);
  const liveHome = normalizeTeamName(live.home);
  const liveAway = normalizeTeamName(live.away);

  if (localHome === "tbd" || localAway === "tbd") {
    return false;
  }

  return (
    (liveHome.includes(localHome) || localHome.includes(liveHome)) &&
    (liveAway.includes(localAway) || localAway.includes(liveAway))
  );
}

function getLiveEspnId(live: EspnMatch) {
  return live.espnId;
}

function getLiveKickoffAt(live: EspnMatch) {
  return live.kickoffAt;
}

function getLiveVenue(live: EspnMatch) {
  return live.venue;
}

function getLiveStatusText(live: EspnMatch) {
  return live.statusText;
}

function findEspnMatchForRegisteredMatch(
  registeredMatch: MatchConfig,
  espnMatches: EspnMatch[]
) {
  const byTeams = espnMatches.find((live) =>
    teamsMatch(registeredMatch, live)
  );

  if (byTeams) return byTeams;

  const byKickoff = espnMatches.filter((live) => {
    const diff = Math.abs(registeredMatch.kickoffAt - getLiveKickoffAt(live));
    return diff <= 31 * 60 * 1000;
  });

  if (byKickoff.length === 1) return byKickoff[0];

  return null;
}

function mapStatus(
  registeredMatch: MatchConfig,
  liveMatch: EspnMatch | null
): MatchData["status"] {
  if (liveMatch?.status === "in_progress") return "live";
  if (liveMatch?.status === "final") return "finished";

  return matchStatus(registeredMatch);
}

function toConfirmedMatchData(
  registeredMatch: MatchConfig,
  liveMatch: EspnMatch | null
): MatchData {
  return {
    id: registeredMatch.id,
    campaignId: registeredMatch.campaignId,

    home: liveMatch?.home ?? registeredMatch.home,
    away: liveMatch?.away ?? registeredMatch.away,

    homeFlag: registeredMatch.homeFlag,
    awayFlag: registeredMatch.awayFlag,

    competition: registeredMatch.competition,
    kickoff: new Date(registeredMatch.kickoffAt),
    lockedAt: new Date(registeredMatch.lockedAt),

    status: mapStatus(registeredMatch, liveMatch),

    source: liveMatch ? "espn" : "local",
    espnId: liveMatch ? getLiveEspnId(liveMatch) : undefined,
    venue: liveMatch ? getLiveVenue(liveMatch) : null,
    clock: liveMatch?.clock,
    statusText: liveMatch ? getLiveStatusText(liveMatch) : "",

    homeScore: liveMatch?.homeScore ?? null,
    awayScore: liveMatch?.awayScore ?? null,

    canPredict: true,
  };
}

function sortMatches(a: MatchData, b: MatchData) {
  const priority: Record<MatchData["status"], number> = {
    live: 0,
    open: 1,
    locked: 2,
    finished: 3,
  };

  const statusDiff = priority[a.status] - priority[b.status];

  if (statusDiff !== 0) return statusDiff;

  return a.kickoff.getTime() - b.kickoff.getTime();
}

export function useLiveWorldCupMatches(language: ScoreLanguage = "en") {
  const dates = useMemo(() => buildDatesFromRegisteredMatches(), []);

  const {
    matches: espnMatches,
    isLoading,
    error,
  } = useEspnScores(ESPN_LEAGUE, dates, language);

  const matches = useMemo(() => {
    return COPA_MATCHES.map((registeredMatch) => {
      const liveMatch = findEspnMatchForRegisteredMatch(
        registeredMatch,
        espnMatches
      );

      return toConfirmedMatchData(registeredMatch, liveMatch);
    }).sort(sortMatches);
  }, [espnMatches]);

  return {
    matches,
    isLoading,
    error,
    hasLiveData: espnMatches.length > 0,
  };
}
