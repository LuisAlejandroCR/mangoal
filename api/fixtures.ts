export const config = {
  runtime: "edge",
};

declare const process: {
  env: Record<string, string | undefined>;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const FOOTBALL_DATA_COMPETITIONS: Record<string, string> = {
  "world-cup": "WC",
  champions: "CL",
  euro: "EC",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}

function isDate(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

async function fetchFootballData(competition: string, dateFrom: string | null, dateTo: string | null) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  const code = FOOTBALL_DATA_COMPETITIONS[competition];

  if (!apiKey || !code || !isDate(dateFrom) || !isDate(dateTo)) {
    return null;
  }

  const url = new URL(`https://api.football-data.org/v4/competitions/${code}/matches`);
  url.searchParams.set("dateFrom", dateFrom!);
  url.searchParams.set("dateTo", dateTo!);

  const response = await fetch(url.toString(), {
    headers: { "X-Auth-Token": apiKey },
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) return null;
  return response.json();
}

async function fetchSportmonks(dateFrom: string | null, dateTo: string | null) {
  const apiKey = process.env.SPORTMONKS_API_KEY;

  if (!apiKey || !isDate(dateFrom) || !isDate(dateTo)) {
    return null;
  }

  const url = new URL(`https://api.sportmonks.com/v3/football/fixtures/between/${dateFrom}/${dateTo}`);
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("include", "participants;scores;venue;state");

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) return null;
  return response.json();
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (request.method !== "GET") {
    return jsonResponse({ error: "method not allowed" }, 405);
  }

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider") ?? "football-data";
  const competition = searchParams.get("competition") ?? "world-cup";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  try {
    if (provider === "football-data") {
      const data = await fetchFootballData(competition, dateFrom, dateTo);
      return jsonResponse({ provider, data });
    }

    if (provider === "sportmonks") {
      const data = await fetchSportmonks(dateFrom, dateTo);
      return jsonResponse({ provider, data });
    }

    return jsonResponse({ error: "unknown provider", data: null }, 400);
  } catch {
    return jsonResponse({ provider, data: null });
  }
}
