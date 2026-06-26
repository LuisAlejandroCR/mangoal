export const config = {
  runtime: "edge",
};

const ALLOWED_LEAGUES = new Set([
  "fifa.world",
  "uefa.champions",
  "conmebol.america",
  "caf.nations",
  "uefa.euro",
  "concacaf.gold",
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(
  body: unknown,
  status = 200,
  cacheControl = "public, s-maxage=30"
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": cacheControl,
    },
  });
}

function isValidEspnDate(date: string) {
  return /^\d{8}$/.test(date);
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

  const league = searchParams.get("league") ?? "fifa.world";
  const date = searchParams.get("date") ?? searchParams.get("dates");

  if (!ALLOWED_LEAGUES.has(league)) {
    return jsonResponse({ error: "unknown league", events: [] }, 400);
  }

  if (date && !isValidEspnDate(date)) {
    return jsonResponse(
      { error: "invalid date. Use YYYYMMDD.", events: [] },
      400
    );
  }

  const espnUrl = new URL(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`
  );

  if (date) {
    espnUrl.searchParams.set("dates", date);
  }

  espnUrl.searchParams.set("limit", "300");

  try {
    const upstream = await fetch(espnUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Mangooal/1.0; +https://mangooal.vercel.app)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5_000),
    });

    if (!upstream.ok) {
      return jsonResponse(
        { events: [] },
        200,
        "public, s-maxage=15, stale-while-revalidate=15"
      );
    }

    const body = await upstream.text();

    return new Response(body, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch {
    return jsonResponse(
      { events: [] },
      200,
      "public, s-maxage=10, stale-while-revalidate=10"
    );
  }
}