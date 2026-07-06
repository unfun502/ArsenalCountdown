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

interface SourceHealth {
  footballData: { status: "ok" | "error"; matches: number };
  sportsDb: { status: "ok" | "error"; matches: number };
}

interface UpcomingMatch {
  competition: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  utcDate: string; // ISO date string
  timeTbc: boolean; // kickoff time not yet confirmed (date-only fixture)
  source: "football-data" | "thesportsdb";
}

interface FetchResult {
  matches: UpcomingMatch[];
  sources: SourceHealth;
  degraded: boolean;
}

interface MatchData {
  id: number;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  kickoff: string; // ISO date string
  timeTbc: boolean;
  broadcasts: Record<string, string>;
  sources: SourceHealth;
}

const ARSENAL_FOOTBALL_DATA_ID = "57";
const ARSENAL_SPORTSDB_ID = "133604";
const FOOTBALL_PROXY_URL = "https://api.devlab502.net/football-proxy";
const NO_MATCHES_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const MATCH_CACHE_TTL = 30 * 60 * 1000; // 30 minutes — refresh periodically to catch newly scheduled matches
// When a source failed we may be showing the wrong "next" match — retry much sooner.
const DEGRADED_MATCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const DEGRADED_NO_MATCHES_CACHE_DURATION = 60 * 1000; // 1 minute
const FIXTURES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
// Arsenal never plays twice within 24h — a SportsDB event that close to a
// football-data match is the same fixture reported by both sources.
const SPORTSDB_DEDUPE_WINDOW = 24 * 60 * 60 * 1000;
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
let cachedDegraded = false;
let noMatchesCache: { timestamp: number; degraded: boolean } | null = null;
let fixturesCache: { data: unknown; timestamp: number; degraded: boolean } | null = null;
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

// The APIs often omit the venue; guessing "Emirates Stadium" is wrong for
// away fixtures, so fall back based on who's at home.
function fallbackVenue(homeTeam: string): string {
  return homeTeam.includes("Arsenal") ? "Emirates Stadium" : `${homeTeam} (Away)`;
}

async function fetchAllMatches(): Promise<FetchResult> {
  const now = new Date();
  const todayUtc = now.toISOString().slice(0, 10);
  const sources: SourceHealth = {
    footballData: { status: "error", matches: 0 },
    sportsDb: { status: "error", matches: 0 },
  };

  // Football Data API via VPS proxy (Premier League + Champions League).
  // Direct calls to football-data.org time out from Cloudflare datacenter IPs;
  // the proxy at api.devlab502.net relays through a residential VPS IP.
  const fdMatches: UpcomingMatch[] = [];
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
      for (const m of data.matches || []) {
        if (new Date(m.utcDate) <= now) continue;
        fdMatches.push({
          competition: m.competition.name,
          homeTeam: m.homeTeam.name,
          awayTeam: m.awayTeam.name,
          venue: m.venue || fallbackVenue(m.homeTeam.name),
          utcDate: m.utcDate,
          timeTbc: false,
          source: "football-data",
        });
      }
      sources.footballData = { status: "ok", matches: fdMatches.length };
    } else {
      console.error("Football proxy non-OK response:", response.status);
    }
  } catch (e: any) {
    console.error("Football proxy error:", e?.message ?? e);
  }

  // TheSportsDB API — all competitions, so cups, Europa/Conference League,
  // Community Shield, and friendlies are covered. Fixtures football-data
  // already returned (PL/CL) are deduped by kickoff proximity, which also
  // makes SportsDB a full fallback when the proxy is down.
  const sdMatches: UpcomingMatch[] = [];
  try {
    const response = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/eventsnext.php?id=${ARSENAL_SPORTSDB_ID}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (response.ok) {
      const data: any = await response.json();
      const fdKickoffs = fdMatches.map((m) => new Date(m.utcDate).getTime());
      for (const e of data.events || []) {
        if (!e.dateEvent) continue;
        // TheSportsDB reports null/"00:00:00" when kickoff isn't confirmed;
        // give those a provisional midday slot so a same-day fixture neither
        // vanishes at midnight UTC nor counts down to 00:00.
        const hasTime = e.strTime && e.strTime !== "00:00:00";
        const timeTbc = !hasTime;
        const utcDate = hasTime
          ? `${e.dateEvent}T${e.strTime}Z`
          : `${e.dateEvent}T12:00:00Z`;
        const isUpcoming = timeTbc
          ? e.dateEvent >= todayUtc
          : new Date(utcDate) > now;
        if (!isUpcoming) continue;
        const kickoffMs = new Date(utcDate).getTime();
        if (fdKickoffs.some((k) => Math.abs(k - kickoffMs) < SPORTSDB_DEDUPE_WINDOW)) continue;
        sdMatches.push({
          competition: e.strLeague,
          homeTeam: e.strHomeTeam,
          awayTeam: e.strAwayTeam,
          venue: e.strVenue || fallbackVenue(e.strHomeTeam),
          utcDate,
          timeTbc,
          source: "thesportsdb",
        });
      }
      sources.sportsDb = { status: "ok", matches: sdMatches.length };
    } else {
      console.error("TheSportsDB API non-OK response:", response.status);
    }
  } catch (e: any) {
    console.error("TheSportsDB API error:", e?.message ?? e);
  }

  const matches = [...fdMatches, ...sdMatches].sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  );
  const degraded =
    sources.footballData.status !== "ok" || sources.sportsDb.status !== "ok";

  return { matches, sources, degraded };
}

async function handleNextMatch(env: Env): Promise<Response> {
  // Return cached match if it's still in the future AND cache is fresh.
  // A degraded fetch (a source was down) gets a much shorter TTL — the
  // cached "next" match may be wrong if the missing source had an earlier one.
  const cacheAge = Date.now() - cacheTimestamp;
  const matchTtl = cachedDegraded ? DEGRADED_MATCH_CACHE_TTL : MATCH_CACHE_TTL;
  if (cachedMatch && new Date(cachedMatch.kickoff) > new Date() && cacheAge < matchTtl) {
    return jsonResponse(cachedMatch);
  }
  cachedMatch = null;

  // Return no-matches cache if still valid
  if (noMatchesCache) {
    const ttl = noMatchesCache.degraded
      ? DEGRADED_NO_MATCHES_CACHE_DURATION
      : NO_MATCHES_CACHE_DURATION;
    if (Date.now() - noMatchesCache.timestamp < ttl) {
      return jsonResponse(
        { message: "No upcoming matches found", seasonStatus: noMatchesCache.degraded ? "unknown" : "off-season" },
        404
      );
    }
  }

  const { matches, sources, degraded } = await fetchAllMatches();
  const nextMatch = matches[0];

  if (!nextMatch) {
    noMatchesCache = { timestamp: Date.now(), degraded };
    // Only claim off-season when both sources answered — an empty result
    // during an outage should render as an error, not "Season Complete".
    return jsonResponse(
      {
        message: "No upcoming matches found",
        seasonStatus: degraded ? "unknown" : "off-season",
        sources,
      },
      404
    );
  }
  noMatchesCache = null;

  cachedMatch = {
    id: matchIdCounter++,
    competition: nextMatch.competition,
    homeTeam: nextMatch.homeTeam,
    awayTeam: nextMatch.awayTeam,
    venue: nextMatch.venue,
    kickoff: nextMatch.utcDate,
    timeTbc: nextMatch.timeTbc,
    broadcasts: {},
    sources,
  };
  cacheTimestamp = Date.now();
  cachedDegraded = degraded;

  return jsonResponse(cachedMatch);
}

// Full upcoming fixture list plus per-source health — consumed by the weekly
// schedule-verification routine, not by the app UI.
async function handleFixtures(): Promise<Response> {
  if (fixturesCache) {
    const ttl = fixturesCache.degraded ? DEGRADED_NO_MATCHES_CACHE_DURATION : FIXTURES_CACHE_TTL;
    if (Date.now() - fixturesCache.timestamp < ttl) {
      return jsonResponse(fixturesCache.data);
    }
  }

  const { matches, sources, degraded } = await fetchAllMatches();
  const payload = {
    fetchedAt: new Date().toISOString(),
    degraded,
    sources,
    matchCount: matches.length,
    matches,
  };
  fixturesCache = { data: payload, timestamp: Date.now(), degraded };
  return jsonResponse(payload);
}

async function handleClearCache(): Promise<Response> {
  cachedMatch = null;
  cacheTimestamp = 0;
  cachedDegraded = false;
  noMatchesCache = null;
  fixturesCache = null;
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

    if (url.pathname === "/api/fixtures") {
      return handleFixtures();
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
