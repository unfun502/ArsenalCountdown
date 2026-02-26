// Cloudflare Workers entry point.
// The Express server in server/ is used for local Replit development only.
// This file handles API routes in Workers and falls through to static assets for everything else.

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface Env {
  ASSETS: Fetcher;
  FOOTBALL_DATA_API_KEY: string;
  SPORTSDB_API_KEY: string;
}

interface MatchData {
  id: number;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  kickoff: string; // ISO date string
  broadcasts: Record<string, string>;
}

const ARSENAL_FOOTBALL_DATA_ID = "57";
const ARSENAL_SPORTSDB_ID = "133604";
const FA_CUP_LEAGUE_ID = "4482";
const LEAGUE_CUP_ID = "4570";
const NO_MATCHES_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Module-level cache — persists for the lifetime of a Worker instance
let cachedMatch: MatchData | null = null;
let noMatchesCache: { timestamp: number } | null = null;
let matchIdCounter = 1;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleNextMatch(env: Env): Promise<Response> {
  // Return cached match if it's still in the future
  if (cachedMatch && new Date(cachedMatch.kickoff) > new Date()) {
    console.log("Returning cached match data");
    return jsonResponse(cachedMatch);
  }
  cachedMatch = null;

  // Return no-matches cache if still valid
  if (
    noMatchesCache &&
    Date.now() - noMatchesCache.timestamp < NO_MATCHES_CACHE_DURATION
  ) {
    console.log("Using cached 'no matches' response");
    return jsonResponse(
      { message: "No upcoming matches found", seasonStatus: "off-season" },
      404
    );
  }

  console.log("Fetching new match data from APIs");
  const allMatches: any[] = [];
  const now = new Date();

  // Football Data API (Premier League + Champions League)
  try {
    const response = await fetch(
      `https://api.football-data.org/v4/teams/${ARSENAL_FOOTBALL_DATA_ID}/matches?status=SCHEDULED&limit=50`,
      {
        headers: { "X-Auth-Token": env.FOOTBALL_DATA_API_KEY },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (response.ok) {
      const data: any = await response.json();
      const futureMatches = (data.matches || [])
        .filter((m: any) => new Date(m.utcDate) > now)
        .map((m: any) => ({
          competition: m.competition.name,
          homeTeam: m.homeTeam.name,
          awayTeam: m.awayTeam.name,
          venue: m.venue || "Emirates Stadium",
          utcDate: m.utcDate,
        }));
      allMatches.push(...futureMatches);
      console.log(`Football Data API: ${futureMatches.length} matches found`);
    }
  } catch (e: any) {
    console.log("Football Data API failed:", e?.message ?? e);
  }

  // TheSportsDB API (FA Cup + League Cup)
  try {
    const response = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${env.SPORTSDB_API_KEY}/eventsnext.php?id=${ARSENAL_SPORTSDB_ID}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (response.ok) {
      const data: any = await response.json();
      if (data.events) {
        const cupMatches = data.events
          .filter((e: any) => {
            const isRelevant =
              e.idLeague === FA_CUP_LEAGUE_ID ||
              e.idLeague === LEAGUE_CUP_ID;
            const eventDate = new Date(`${e.dateEvent}T${e.strTime}`);
            return isRelevant && eventDate > now;
          })
          .map((e: any) => ({
            competition: e.strLeague,
            homeTeam: e.strHomeTeam,
            awayTeam: e.strAwayTeam,
            venue: e.strVenue || "Emirates Stadium",
            utcDate: `${e.dateEvent}T${e.strTime}`,
          }));
        allMatches.push(...cupMatches);
        console.log(
          `TheSportsDB API: ${cupMatches.length} FA Cup/League Cup matches found`
        );
      }
    }
  } catch (e: any) {
    console.log("TheSportsDB API failed:", e?.message ?? e);
  }

  allMatches.sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  );

  console.log(`Total matches from all sources: ${allMatches.length}`);

  const nextMatch = allMatches[0];

  if (!nextMatch) {
    console.log("No upcoming matches found");
    noMatchesCache = { timestamp: Date.now() };
    return jsonResponse(
      { message: "No upcoming matches found", seasonStatus: "off-season" },
      404
    );
  }

  console.log(
    `Next match: ${nextMatch.homeTeam} vs ${nextMatch.awayTeam} (${nextMatch.competition})`
  );

  cachedMatch = {
    id: matchIdCounter++,
    competition: nextMatch.competition,
    homeTeam: nextMatch.homeTeam,
    awayTeam: nextMatch.awayTeam,
    venue: nextMatch.venue,
    kickoff: nextMatch.utcDate,
    broadcasts: {},
  };

  return jsonResponse(cachedMatch);
}

async function handleClearCache(): Promise<Response> {
  cachedMatch = null;
  noMatchesCache = null;
  console.log("All caches cleared");
  return jsonResponse({ message: "Cache cleared successfully" });
}

async function handleEspnTvProvider(url: URL): Promise<Response> {
  const date = url.searchParams.get("date");
  if (!date) {
    return jsonResponse(
      { message: "Date parameter required (YYYYMMDD format)" },
      400
    );
  }

  try {
    const espnUrl = `https://www.espn.com/soccer/schedule/_/date/${date}`;
    console.log(`Fetching ESPN for TV provider: ${espnUrl}`);

    const response = await fetch(espnUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return jsonResponse({ tvProvider: null });
    }

    const html = await response.text();

    // Find Arsenal's TV provider via string matching (cheerio is Node-only)
    const arsenalIdx = html.indexOf("Arsenal");
    if (arsenalIdx === -1) {
      return jsonResponse({ tvProvider: null });
    }

    const snippet = html.slice(
      Math.max(0, arsenalIdx - 500),
      arsenalIdx + 500
    );
    const networkMatch = snippet.match(/network-name[^>]*>([^<]+)</);
    const tvProvider = networkMatch ? networkMatch[1].trim() : null;

    if (tvProvider) {
      console.log(`Found TV provider for Arsenal: ${tvProvider}`);
    }

    return jsonResponse({ tvProvider });
  } catch (e) {
    console.error("Error fetching ESPN:", e);
    return jsonResponse({ message: "Failed to fetch ESPN" }, 500);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/next-match") {
      return handleNextMatch(env);
    }

    if (url.pathname === "/api/clear-cache" && request.method === "POST") {
      return handleClearCache();
    }

    if (url.pathname === "/api/espn-tv-provider") {
      return handleEspnTvProvider(url);
    }

    // Pass everything else (HTML, JS, CSS, sounds, images) to the static asset handler.
    // The wrangler.jsonc assets config handles SPA fallback to index.html automatically.
    return env.ASSETS.fetch(request);
  },
};
