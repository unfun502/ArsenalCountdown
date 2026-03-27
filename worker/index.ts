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
  CACHE_SECRET: string;
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
const MATCH_CACHE_TTL = 30 * 60 * 1000; // 30 minutes — refresh periodically to catch newly scheduled matches
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // max requests per window per IP

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "font-src fonts.gstatic.com",
    "img-src 'self' cdn.devlab502.net data:",
    "connect-src 'self' ipapi.co",
  ].join('; '),
};

// Module-level cache — persists for the lifetime of a Worker instance
let cachedMatch: MatchData | null = null;
let cacheTimestamp = 0;
let noMatchesCache: { timestamp: number } | null = null;
let matchIdCounter = 1;

// Simple in-memory rate limiter (per Worker instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...SECURITY_HEADERS },
  });
}

function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, { status: response.status, headers });
}

async function handleNextMatch(env: Env): Promise<Response> {
  // Return cached match if it's still in the future AND cache is fresh
  const cacheAge = Date.now() - cacheTimestamp;
  if (cachedMatch && new Date(cachedMatch.kickoff) > new Date() && cacheAge < MATCH_CACHE_TTL) {
    return jsonResponse(cachedMatch);
  }
  cachedMatch = null;

  // Return no-matches cache if still valid
  if (
    noMatchesCache &&
    Date.now() - noMatchesCache.timestamp < NO_MATCHES_CACHE_DURATION
  ) {
    return jsonResponse(
      { message: "No upcoming matches found", seasonStatus: "off-season" },
      404
    );
  }

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
    }
  } catch (e: any) {
    console.error("Football Data API error:", e?.message ?? e);
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
            const eventDate = new Date(`${e.dateEvent}T${e.strTime}Z`);
            return isRelevant && eventDate > now;
          })
          .map((e: any) => ({
            competition: e.strLeague,
            homeTeam: e.strHomeTeam,
            awayTeam: e.strAwayTeam,
            venue: e.strVenue || "Emirates Stadium",
            utcDate: `${e.dateEvent}T${e.strTime}Z`,
          }));
        allMatches.push(...cupMatches);
      }
    }
  } catch (e: any) {
    console.error("TheSportsDB API error:", e?.message ?? e);
  }

  allMatches.sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  );

  const nextMatch = allMatches[0];

  if (!nextMatch) {
    noMatchesCache = { timestamp: Date.now() };
    return jsonResponse(
      { message: "No upcoming matches found", seasonStatus: "off-season" },
      404
    );
  }

  cachedMatch = {
    id: matchIdCounter++,
    competition: nextMatch.competition,
    homeTeam: nextMatch.homeTeam,
    awayTeam: nextMatch.awayTeam,
    venue: nextMatch.venue,
    kickoff: nextMatch.utcDate,
    broadcasts: {},
  };
  cacheTimestamp = Date.now();

  return jsonResponse(cachedMatch);
}

async function handleClearCache(): Promise<Response> {
  cachedMatch = null;
  cacheTimestamp = 0;
  noMatchesCache = null;
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

    return jsonResponse({ tvProvider });
  } catch (e) {
    console.error("Error fetching ESPN:", e);
    return jsonResponse({ message: "Failed to fetch ESPN" }, 500);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Rate limit API routes
    if (url.pathname.startsWith("/api/")) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      if (isRateLimited(ip)) {
        return jsonResponse({ message: "Too many requests" }, 429);
      }
    }

    if (url.pathname === "/api/next-match") {
      return handleNextMatch(env);
    }

    if (url.pathname === "/api/clear-cache" && request.method === "POST") {
      const authHeader = request.headers.get("Authorization");
      if (!env.CACHE_SECRET || authHeader !== `Bearer ${env.CACHE_SECRET}`) {
        return jsonResponse({ message: "Unauthorized" }, 401);
      }
      return handleClearCache();
    }

    if (url.pathname === "/api/espn-tv-provider") {
      return handleEspnTvProvider(url);
    }

    // Pass everything else (HTML, JS, CSS, sounds, images) to the static asset handler.
    // The wrangler.jsonc assets config handles SPA fallback to index.html automatically.
    const response = await env.ASSETS.fetch(request);
    return addSecurityHeaders(response);
  },
};
