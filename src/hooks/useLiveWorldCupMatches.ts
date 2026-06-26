import { useMemo } from "react";

import type { MatchData } from "../components/MatchCard";
import {
  CAMPAIGN_ID,
  COPA_MATCHES,
  matchStatus,
  type MatchConfig,
} from "../config/matches";
import { useEspnScores, type EspnMatch } from "./useEspnScores";

const ESPN_LEAGUE = "fifa.world";
const LOCK_MINUTES_BEFORE_KICKOFF = 30;
const SCHEDULE_LOOKAHEAD_DAYS = 10;

function toEspnDateUTC(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function buildScheduleDates(days: number) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return toEspnDateUTC(date);
  });
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

function findRegisteredMatch(
  live: EspnMatch,
  usedLocalIds: Set<string>
): MatchConfig | null {
  const byTeams = COPA_MATCHES.find(
    (match) => !usedLocalIds.has(match.id) && teamsMatch(match, live)
  );

  if (byTeams) {
    return byTeams;
  }

  const closeByKickoff = COPA_MATCHES.filter((match) => {
    if (usedLocalIds.has(match.id)) return false;

    const diff = Math.abs(match.kickoffAt - live.kickoffAt);
    return diff <= 31 * 60 * 1000;
  });

  if (closeByKickoff.length === 1) {
    return closeByKickoff[0];
  }

  return null;
}

function mapLiveStatus(
  live: EspnMatch,
  lockedAt: number,
  kickoffAt: number
): MatchData["status"] {
  if (live.status === "in_progress") return "live";
  if (live.status === "final") return "finished";

  const now = Date.now();

  if (now < lockedAt) return "open";
  if (now < kickoffAt) return "locked";

  return "live";
}

function staticToMatchData(match: MatchConfig): MatchData {
  return {
    id: match.id,
    campaignId: match.campaignId,
    home: match.home,
    away: match.away,
    homeFlag: match.homeFlag,
    awayFlag: match.awayFlag,
    competition: match.competition,
    kickoff: new Date(match.kickoffAt),
    lockedAt: new Date(match.lockedAt),
    status: matchStatus(match),
    source: "local",
    canPredict: true,
  };
}

function liveToMatchData(
  live: EspnMatch,
  registeredMatch: MatchConfig | null
): MatchData {
  const kickoffAt = live.kickoffAt;
  const lockedAt =
    registeredMatch?.lockedAt ??
    kickoffAt - LOCK_MINUTES_BEFORE_KICKOFF * 60 * 1000;

  return {
    id: registeredMatch?.id ?? `espn-${live.espnId}`,
    campaignId: registeredMatch?.campaignId ?? CAMPAIGN_ID,

    home: live.home,
    away: live.away,
    homeFlag: registeredMatch?.homeFlag ?? "",
    awayFlag: registeredMatch?.awayFlag ?? "",

    competition: registeredMatch?.competition ?? "FIFA World Cup 2026",
    kickoff: new Date(kickoffAt),
    lockedAt: new Date(lockedAt),
    status: mapLiveStatus(live, lockedAt, kickoffAt),

    source: "espn",
    espnId: live.espnId,
    venue: live.venue,
    clock: live.clock,
    statusText: live.statusText,
    homeScore: live.homeScore,
    awayScore: live.awayScore,
    canPredict: Boolean(registeredMatch),
  };
}

export function useLiveWorldCupMatches() {
  const dates = useMemo(
    () => buildScheduleDates(SCHEDULE_LOOKAHEAD_DAYS),
    []
  );

  const {
    matches: espnMatches,
    isLoading,
    error,
  } = useEspnScores(ESPN_LEAGUE, dates);

  const matches = useMemo(() => {
    if (espnMatches.length === 0) {
      return COPA_MATCHES.map(staticToMatchData);
    }

    const usedLocalIds = new Set<string>();

    const liveCards = espnMatches.map((live) => {
      const registeredMatch = findRegisteredMatch(live, usedLocalIds);

      if (registeredMatch) {
        usedLocalIds.add(registeredMatch.id);
      }

      return liveToMatchData(live, registeredMatch);
    });

    const localOnlyCards = COPA_MATCHES.filter(
      (match) => !usedLocalIds.has(match.id)
    ).map(staticToMatchData);

    return [...liveCards, ...localOnlyCards].sort(
      (a, b) => a.kickoff.getTime() - b.kickoff.getTime()
    );
  }, [espnMatches]);

  return {
    matches,
    isLoading,
    error,
    hasLiveData: espnMatches.length > 0,
  };
}