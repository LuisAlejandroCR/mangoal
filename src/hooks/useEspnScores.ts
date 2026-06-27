import { useEffect, useMemo, useState } from "react";

export type EspnStatus = "scheduled" | "in_progress" | "final" | "postponed";
export type ScoreLanguage = "en" | "es";

export type EspnMatch = {
  espnId: string;
  date: string;
  kickoffAt: number;
  home: string;
  homeAbbr: string;
  homeLogo: string | null;
  away: string;
  awayAbbr: string;
  awayLogo: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: EspnStatus;
  clock: string;
  statusText: string;
  venue: string | null;
  city: string | null;
  country: string | null;
  homeRecord: string | null;
  awayRecord: string | null;
};

type EspnApiResponse = {
  events?: unknown[];
};

function parseStatus(comp: any): EspnStatus {
  const type = comp?.status?.type;
  const name = type?.name ?? "";
  const state = type?.state ?? "";
  const completed = Boolean(type?.completed);

  if (completed || state === "post" || name === "STATUS_FINAL") {
    return "final";
  }

  if (
    state === "in" ||
    name === "STATUS_IN_PROGRESS" ||
    name === "STATUS_HALFTIME"
  ) {
    return "in_progress";
  }

  if (
    name === "STATUS_POSTPONED" ||
    name === "STATUS_CANCELED" ||
    name === "STATUS_CANCELLED"
  ) {
    return "postponed";
  }

  return "scheduled";
}

function parseClock(comp: any): string {
  const type = comp?.status?.type;
  const name = type?.name ?? "";

  if (name === "STATUS_HALFTIME") return "HT";
  if (name === "STATUS_FINAL") return "FT";

  const displayClock = comp?.status?.displayClock;
  if (displayClock && displayClock !== "0:00") return displayClock;

  return type?.shortDetail ?? type?.detail ?? "";
}

function parseRecord(competitor: any): string | null {
  const records: any[] = competitor?.records ?? [];
  const overall = records.find(
    (record) => record.type === "total" || record.type === "overall"
  );

  return overall?.summary ?? null;
}

function parseScore(competitor: any): number | null {
  if (competitor?.score === undefined || competitor?.score === null) {
    return null;
  }

  const score = Number(competitor.score);
  return Number.isFinite(score) ? score : null;
}

function normalizeEvents(events: unknown[]): EspnMatch[] {
  return events
    .map((event: any): EspnMatch | null => {
      const comp = event?.competitions?.[0];
      const competitors: any[] = comp?.competitors ?? [];

      if (!event?.id || !event?.date || competitors.length < 2) {
        return null;
      }

      const home =
        competitors.find((competitor) => competitor.homeAway === "home") ??
        competitors[0];

      const away =
        competitors.find((competitor) => competitor.homeAway === "away") ??
        competitors[1];

      const venue = comp?.venue;
      const address = venue?.address;

      return {
        espnId: String(event.id),
        date: String(event.date),
        kickoffAt: new Date(event.date).getTime(),

        home: home?.team?.displayName ?? home?.team?.shortDisplayName ?? "?",
        homeAbbr: home?.team?.abbreviation ?? "",
        homeLogo: home?.team?.logo ?? null,

        away: away?.team?.displayName ?? away?.team?.shortDisplayName ?? "?",
        awayAbbr: away?.team?.abbreviation ?? "",
        awayLogo: away?.team?.logo ?? null,

        homeScore: parseScore(home),
        awayScore: parseScore(away),

        status: parseStatus(comp),
        clock: parseClock(comp),
        statusText:
          comp?.status?.type?.shortDetail ??
          comp?.status?.type?.detail ??
          "",

        venue: venue?.fullName ?? null,
        city: address?.city ?? null,
        country: address?.country ?? null,

        homeRecord: parseRecord(home),
        awayRecord: parseRecord(away),
      };
    })
    .filter((match): match is EspnMatch => match !== null)
    .sort((a, b) => a.kickoffAt - b.kickoffAt);
}

async function fetchEspnDate(league: string, date?: string, language: ScoreLanguage = "en") {
  const params = new URLSearchParams({ league });

  if (date) {
    params.set("date", date);
  }

  params.set("lang", language);

  const response = await fetch(`/api/scores?${params.toString()}`);

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as EspnApiResponse;
  return normalizeEvents(data.events ?? []);
}

export function useEspnScores(
  league: string,
  date?: string | string[],
  language: ScoreLanguage = "en"
): {
  matches: EspnMatch[];
  isLoading: boolean;
  error: Error | null;
} {
  const [matches, setMatches] = useState<EspnMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const dateKey = useMemo(() => {
    if (Array.isArray(date)) return date.join(",");
    return date ?? "";
  }, [date]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);

      try {
        const dates = Array.isArray(date)
          ? date
          : date
            ? [date]
            : [undefined];

        const results = await Promise.all(
          dates.map((singleDate) => fetchEspnDate(league, singleDate, language))
        );

        const deduped = new Map<string, EspnMatch>();

        results.flat().forEach((match) => {
          deduped.set(match.espnId, match);
        });

        if (!cancelled) {
          setMatches(
            Array.from(deduped.values()).sort(
              (a, b) => a.kickoffAt - b.kickoffAt
            )
          );
        }
      } catch (err) {
        if (!cancelled) {
          setMatches([]);
          setError(err instanceof Error ? err : new Error("ESPN fetch failed"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [league, dateKey, language]);

  return { matches, isLoading, error };
}

export function findMatch(
  matches: EspnMatch[],
  homeHint: string,
  awayHint: string
): EspnMatch | null {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const home = normalize(homeHint);
  const away = normalize(awayHint);

  return (
    matches.find((match) => {
      const matchHome = normalize(match.home);
      const matchAway = normalize(match.away);

      return (
        (matchHome.includes(home) || home.includes(matchHome)) &&
        (matchAway.includes(away) || away.includes(matchAway))
      );
    }) ?? null
  );
}
