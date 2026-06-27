import { useMemo } from "react";

import type { MatchData } from "../components/MatchCard";
import {
  CAMPAIGN_ID,
  COPA_MATCHES,
  CAMPAIGN_DISPLAY_NAME,
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

function buildScoreboardDates() {
  const dates = new Set<string>();
  const today = new Date();

  for (let offset = -2; offset <= 8; offset += 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + offset);
    dates.add(toEspnDateUTC(date));
  }

  COPA_MATCHES.forEach((match) => {
    dates.add(toEspnDateUTC(new Date(match.kickoffAt)));
  });

  return Array.from(dates);
}

function cleanDisplayTeam(value: string) {
  return value
    .replace(/\bThird Place Group\b(?:\s+[A-Z](?:\/[A-Z])*)?/gi, "To define")
    .replace(/\bTPG(?:\s+[A-Z](?:\/[A-Z])*)?/gi, "To define")
    .replace(/^TBD$/i, "To define")
    .trim();
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

  if (localHome === "tbd" || localAway === "tbd") return false;

  return (
    (liveHome.includes(localHome) || localHome.includes(liveHome)) &&
    (liveAway.includes(localAway) || localAway.includes(liveAway))
  );
}

function findEspnMatchForRegisteredMatch(
  registeredMatch: MatchConfig,
  espnMatches: EspnMatch[]
) {
  const byTeams = espnMatches.find((live) => teamsMatch(registeredMatch, live));
  if (byTeams) return byTeams;

  const byKickoff = espnMatches.filter((live) => {
    const diff = Math.abs(registeredMatch.kickoffAt - live.kickoffAt);
    return diff <= 31 * 60 * 1000;
  });

  if (byKickoff.length === 1) return byKickoff[0];
  return null;
}

function mapLiveStatus(liveMatch: EspnMatch): MatchData["status"] {
  if (liveMatch.status === "in_progress") return "live";
  if (liveMatch.status === "final") return "finished";
  return "open";
}

function mapRegisteredStatus(
  registeredMatch: MatchConfig,
  liveMatch: EspnMatch | null
): MatchData["status"] {
  if (liveMatch) return mapLiveStatus(liveMatch);
  return matchStatus(registeredMatch);
}

function toConfirmedMatchData(
  registeredMatch: MatchConfig,
  liveMatch: EspnMatch | null
): MatchData {
  return {
    id: registeredMatch.id,
    campaignId: registeredMatch.campaignId,
    home: cleanDisplayTeam(liveMatch?.home ?? registeredMatch.home),
    away: cleanDisplayTeam(liveMatch?.away ?? registeredMatch.away),
    homeFlag: liveMatch?.homeLogo ?? registeredMatch.homeFlag,
    awayFlag: liveMatch?.awayLogo ?? registeredMatch.awayFlag,
    competition: registeredMatch.competition,
    kickoff: new Date(liveMatch?.kickoffAt ?? registeredMatch.kickoffAt),
    lockedAt: new Date(registeredMatch.lockedAt),
    status: mapRegisteredStatus(registeredMatch, liveMatch),
    source: liveMatch ? "espn" : "local",
    espnId: liveMatch?.espnId,
    venue: liveMatch?.venue ?? null,
    clock: liveMatch?.clock,
    statusText: liveMatch?.statusText ?? "",
    homeScore: liveMatch?.homeScore ?? null,
    awayScore: liveMatch?.awayScore ?? null,
    canPredict: true,
  };
}

function toPreviewMatchData(liveMatch: EspnMatch): MatchData {
  return {
    id: `world-cup-${liveMatch.espnId}`,
    campaignId: CAMPAIGN_ID,
    home: cleanDisplayTeam(liveMatch.home),
    away: cleanDisplayTeam(liveMatch.away),
    homeFlag: liveMatch.homeLogo ?? "",
    awayFlag: liveMatch.awayLogo ?? "",
    competition: CAMPAIGN_DISPLAY_NAME,
    kickoff: new Date(liveMatch.kickoffAt),
    lockedAt: new Date(liveMatch.kickoffAt - 30 * 60 * 1000),
    status: mapLiveStatus(liveMatch),
    source: "espn",
    espnId: liveMatch.espnId,
    venue: liveMatch.venue,
    clock: liveMatch.clock,
    statusText: liveMatch.statusText,
    homeScore: liveMatch.homeScore,
    awayScore: liveMatch.awayScore,
    canPredict: false,
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
  const dates = useMemo(() => buildScoreboardDates(), []);

  const {
    matches: espnMatches,
    isLoading,
    error,
  } = useEspnScores(ESPN_LEAGUE, dates, language);

  const matches = useMemo(() => {
    const usedEspnIds = new Set<string>();
    const registered = COPA_MATCHES.map((registeredMatch) => {
      const liveMatch = findEspnMatchForRegisteredMatch(registeredMatch, espnMatches);
      if (liveMatch) usedEspnIds.add(liveMatch.espnId);
      return toConfirmedMatchData(registeredMatch, liveMatch);
    });

    const previews = espnMatches
      .filter((liveMatch) => !usedEspnIds.has(liveMatch.espnId))
      .map(toPreviewMatchData);

    return [...registered, ...previews].sort(sortMatches);
  }, [espnMatches]);

  return {
    matches,
    isLoading,
    error,
    hasLiveData: espnMatches.length > 0,
  };
}