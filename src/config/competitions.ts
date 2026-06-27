import { keccak256, toHex } from "viem";
import type { MatchData } from "../components/MatchCard";
import type { Language } from "../i18n";
import { CAMPAIGN_DISPLAY_NAME } from "./matches";

export type CompetitionId = "world-cup" | "champions" | "copa-america" | "afcon";
export type MatchFilter = "live" | "schedule" | "finished" | "all";

type ApiMatch = {
  espnId: string;
  kickoffAt: number;
  home: string;
  away: string;
  homeLogo: string | null;
  awayLogo: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: "scheduled" | "in_progress" | "final" | "postponed";
  clock: string;
  statusText: string;
  venue: string | null;
};

export type Competition = {
  id: CompetitionId;
  marker: string;
  name: string;
  league: string;
  color: string;
  current: boolean;
  description: Record<Language, string>;
};

export const MAX_VISIBLE_MATCHES = 6;

export const COMPETITIONS: Competition[] = [
  {
    id: "world-cup",
    marker: "FIFA",
    name: CAMPAIGN_DISPLAY_NAME,
    league: "fifa.world",
    color: "#176B3A",
    current: true,
    description: {
      en: "Live scores, finished matches, and the upcoming schedule.",
      es: "Marcadores en vivo, finalizados y proximos partidos.",
    },
  },
  {
    id: "champions",
    marker: "UEFA",
    name: "UEFA Champions League",
    league: "uefa.champions",
    color: "#1B3A8A",
    current: false,
    description: {
      en: "European club football. Upcoming matches load from the schedule API.",
      es: "Futbol europeo de clubes. Los partidos vienen del calendario API.",
    },
  },
  {
    id: "copa-america",
    marker: "CONMEBOL",
    name: "Copa America",
    league: "conmebol.america",
    color: "#176B3A",
    current: false,
    description: {
      en: "South American football for LatAm fans.",
      es: "Futbol sudamericano para fans de Latam.",
    },
  },
  {
    id: "afcon",
    marker: "CAF",
    name: "Africa Cup of Nations",
    league: "caf.nations",
    color: "#7C3AED",
    current: false,
    description: {
      en: "African national teams for fans in and outside MiniPay.",
      es: "Selecciones africanas para fans dentro y fuera de MiniPay.",
    },
  },
];

export function getCompetition(id?: string | null) {
  return COMPETITIONS.find((competition) => competition.id === id) ?? COMPETITIONS[0];
}

export function getNextCompetition(id: CompetitionId) {
  const currentIndex = COMPETITIONS.findIndex((competition) => competition.id === id);
  return COMPETITIONS[(currentIndex + 1) % COMPETITIONS.length];
}

function mapApiStatus(status: ApiMatch["status"]): MatchData["status"] {
  if (status === "in_progress") return "live";
  if (status === "final") return "finished";
  return "open";
}

export function toApiMatch(competition: Competition, item: ApiMatch): MatchData {
  return {
    id: `${competition.id}-${item.espnId}`,
    campaignId: keccak256(toHex(competition.id)),
    home: item.home,
    away: item.away,
    homeFlag: item.homeLogo ?? "",
    awayFlag: item.awayLogo ?? "",
    competition: competition.name,
    kickoff: new Date(item.kickoffAt),
    lockedAt: new Date(item.kickoffAt - 30 * 60 * 1000),
    status: mapApiStatus(item.status),
    source: "espn",
    espnId: item.espnId,
    venue: item.venue,
    clock: item.clock,
    statusText: item.statusText,
    homeScore: item.homeScore,
    awayScore: item.awayScore,
    canPredict: competition.current,
  };
}

export function filterMatches(matches: MatchData[], filter: MatchFilter) {
  if (filter === "live") return matches.filter((match) => match.status === "live");
  if (filter === "finished") {
    const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
    return matches.filter(
      (match) => match.status === "finished" && match.kickoff.getTime() >= cutoff
    );
  }
  if (filter === "schedule") {
    return matches.filter((match) => match.status === "open" || match.status === "locked");
  }
  return matches;
}
