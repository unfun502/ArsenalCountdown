// Cloudflare Workers entry point.
// The Express server in server/ is used for local Replit development only.
// This file handles API routes in Workers and falls through to static assets for everything else.

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface Env {
  ASSETS: Fetcher;
  UMAMI_SITE_ID: string;
}

// Build-time injected via esbuild --define (see scripts/build-worker.mjs).
// Source: GitHub Environment 'production' secrets (CI) or process.env (local dev).
declare const FOOTBALL_PROXY_SECRET: string;
declare const SPORTSDB_API_KEY: string;

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
const FOOTBALL_PROXY_URL = "https://api.devlab502.net/football-proxy";
const NO_MATCHES_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const MATCH_CACHE_TTL = 30 * 60 * 1000; // 30 minutes — refresh periodically to catch newly scheduled matches
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // max requests per window per IP

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' analytics.devlab502.net",
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "font-src fonts.gstatic.com",
    "img-src 'self' cdn.devlab502.net data:",
    "connect-src 'self' ipapi.co analytics.devlab502.net https://*.ingest.us.sentry.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
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

function injectAnalytics(response: Response, env: Env): Response {
  const ct = response.headers.get('content-type') || ''
  if (ct.includes('text/html') && env.UMAMI_SITE_ID) {
    return new HTMLRewriter()
      .on('head', {
        element(el) {
          el.append(`<script defer src="https://analytics.devlab502.net/script.js" data-website-id="${env.UMAMI_SITE_ID}"></script>`, { html: true })
        }
      })
      .transform(response)
  }
  return response
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

  // Football Data API via VPS proxy (Premier League + Champions League).
  // Direct calls to football-data.org time out from Cloudflare datacenter IPs;
  // the proxy at api.devlab502.net relays through a residential VPS IP.
  try {
    const response = await fetch(
      `${FOOTBALL_PROXY_URL}/teams/${ARSENAL_FOOTBALL_DATA_ID}/matches?status=TIMED,SCHEDULED&limit=50`,
      {
        headers: { "x-proxy-key": FOOTBALL_PROXY_SECRET },
        signal: AbortSignal.timeout(10000),
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
    } else {
      console.error("Football proxy non-OK response:", response.status);
    }
  } catch (e: any) {
    console.error("Football proxy error:", e?.message ?? e);
  }

  // TheSportsDB API (FA Cup + League Cup — not covered by football-data.org free tier).
  try {
    const response = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/eventsnext.php?id=${ARSENAL_SPORTSDB_ID}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (response.ok) {
      const data: any = await response.json();
      if (data.events) {
        const cupMatches = data.events
          .filter((e: any) => {
            const isRelevant =
              e.idLeague === FA_CUP_LEAGUE_ID ||
              e.idLeague === LEAGUE_CUP_ID;
            const eventDate = new Date(`${e.dateEvent}T${e.strTime || "00:00:00"}Z`);
            return isRelevant && eventDate > now;
          })
          .map((e: any) => ({
            competition: e.strLeague,
            homeTeam: e.strHomeTeam,
            awayTeam: e.strAwayTeam,
            venue: e.strVenue || "Emirates Stadium",
            utcDate: `${e.dateEvent}T${e.strTime || "00:00:00"}Z`,
          }));
        allMatches.push(...cupMatches);
      }
    } else {
      console.error("TheSportsDB API non-OK response:", response.status);
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

async function handleDebug(env: Env): Promise<Response> {
  const result: Record<string, any> = {
    hasProxySecret: !!FOOTBALL_PROXY_SECRET,
    hasSportsDbKey: !!SPORTSDB_API_KEY,
    proxyResult: null,
    sportsDbResult: null,
  };

  try {
    const r = await fetch(
      `${FOOTBALL_PROXY_URL}/teams/${ARSENAL_FOOTBALL_DATA_ID}/matches?status=TIMED,SCHEDULED&limit=3`,
      {
        headers: { "x-proxy-key": FOOTBALL_PROXY_SECRET },
        signal: AbortSignal.timeout(10000),
      }
    );
    result.proxyStatus = r.status;
    if (r.ok) {
      const data: any = await r.json();
      result.proxyResult = {
        matchCount: (data.matches || []).length,
        first: data.matches?.[0] ? {
          utcDate: data.matches[0].utcDate,
          status: data.matches[0].status,
          competition: data.matches[0].competition?.name,
          home: data.matches[0].homeTeam?.name,
          away: data.matches[0].awayTeam?.name,
        } : null,
      };
    } else {
      result.proxyResult = { error: await r.text() };
    }
  } catch (e: any) {
    result.proxyResult = { error: e?.message ?? String(e) };
  }

  try {
    const r = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/eventsnext.php?id=${ARSENAL_SPORTSDB_ID}`,
      { signal: AbortSignal.timeout(8000) }
    );
    result.sportsDbStatus = r.status;
    if (r.ok) {
      const data: any = await r.json();
      result.sportsDbResult = {
        eventCount: (data.events || []).length,
        events: (data.events || []).map((e: any) => ({
          strLeague: e.strLeague,
          idLeague: e.idLeague,
          dateEvent: e.dateEvent,
          strTime: e.strTime,
          home: e.strHomeTeam,
          away: e.strAwayTeam,
        })),
      };
    } else {
      result.sportsDbResult = { error: await r.text() };
    }
  } catch (e: any) {
    result.sportsDbResult = { error: e?.message ?? String(e) };
  }

  return jsonResponse(result);
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
      return handleClearCache();
    }

    if (url.pathname === "/api/espn-tv-provider") {
      return handleEspnTvProvider(url);
    }

    if (url.pathname === "/api/debug" && request.method === "GET") {
      return handleDebug(env);
    }

    // Pass everything else (HTML, JS, CSS, sounds, images) to the static asset handler.
    // The wrangler.jsonc assets config handles SPA fallback to index.html automatically.
    const response = await env.ASSETS.fetch(request);
    return injectAnalytics(addSecurityHeaders(response), env);
  },
};
