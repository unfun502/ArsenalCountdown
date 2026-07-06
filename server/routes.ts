import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { ZodError } from "zod";
import { insertMatchSchema } from "@shared/schema";
import path from "path";
import express from "express";
import * as cheerio from "cheerio";

if (!process.env.FOOTBALL_DATA_API_KEY) {
  throw new Error("FOOTBALL_DATA_API_KEY is required");
}

if (!process.env.SPORTSDB_API_KEY) {
  throw new Error("SPORTSDB_API_KEY is required");
}

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const SPORTSDB_API_KEY = process.env.SPORTSDB_API_KEY;

// TheSportsDB constants
const ARSENAL_TEAM_ID = "133604";

// Cache to prevent excessive API calls when no matches are found
let noMatchesCache: { timestamp: number; degraded: boolean } | null = null;
const NO_MATCHES_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const MATCH_CACHE_TTL = 30 * 60 * 1000; // 30 minutes — refresh periodically to catch newly scheduled matches
// When a source failed we may be showing the wrong "next" match — retry much sooner.
const DEGRADED_MATCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const DEGRADED_NO_MATCHES_CACHE_DURATION = 60 * 1000; // 1 minute
const FIXTURES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
// Arsenal never plays twice within 24h — a SportsDB event that close to a
// football-data match is the same fixture reported by both sources.
const SPORTSDB_DEDUPE_WINDOW = 24 * 60 * 60 * 1000;
let lastFetchTime = 0;
let lastFetchDegraded = false;
let lastFetchExtras: { timeTbc: boolean; sources: SourceHealth } | null = null;
let fixturesCache: { data: unknown; timestamp: number; degraded: boolean } | null = null;

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

// The APIs often omit the venue; guessing "Emirates Stadium" is wrong for
// away fixtures, so fall back based on who's at home.
function fallbackVenue(homeTeam: string): string {
  return homeTeam.includes("Arsenal") ? "Emirates Stadium" : `${homeTeam} (Away)`;
}

// Mirrors fetchAllMatches in worker/index.ts — keep the two in sync.
async function fetchAllMatches(): Promise<FetchResult> {
  const now = new Date();
  const todayUtc = now.toISOString().slice(0, 10);
  const sources: SourceHealth = {
    footballData: { status: "error", matches: 0 },
    sportsDb: { status: "error", matches: 0 },
  };

  // Football Data API (Premier League + Champions League) — direct call;
  // local machine IPs aren't blocked the way Cloudflare datacenter IPs are.
  const fdMatches: UpcomingMatch[] = [];
  try {
    const response = await axios.get(
      "https://api.football-data.org/v4/teams/57/matches?status=TIMED,SCHEDULED&limit=50",
      {
        headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY },
        timeout: 5000,
      }
    );
    for (const m of response.data.matches || []) {
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
  } catch (error: any) {
    console.error("Football Data API error:", error.message);
  }

  // TheSportsDB API — all competitions, so cups, Europa/Conference League,
  // Community Shield, and friendlies are covered. Fixtures football-data
  // already returned (PL/CL) are deduped by kickoff proximity, which also
  // makes SportsDB a full fallback when football-data is down.
  const sdMatches: UpcomingMatch[] = [];
  try {
    const response = await axios.get(
      `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/eventsnext.php?id=${ARSENAL_TEAM_ID}`,
      { timeout: 5000 }
    );
    const fdKickoffs = fdMatches.map((m) => new Date(m.utcDate).getTime());
    for (const e of response.data.events || []) {
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
  } catch (error: any) {
    console.error("TheSportsDB API error:", error.message);
  }

  const matches = [...fdMatches, ...sdMatches].sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  );
  const degraded =
    sources.footballData.status !== "ok" || sources.sportsDb.status !== "ok";

  return { matches, sources, degraded };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve sound files with the correct content type
  app.get('/sounds/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);

    // Only allow .mp3 files
    if (!filename.endsWith('.mp3')) {
      return res.status(400).json({ message: 'Invalid file type' });
    }

    const soundsDir = path.resolve(process.cwd(), 'client', 'public', 'sounds');
    const filePath = path.join(soundsDir, filename);

    // Prevent path traversal — resolved path must stay inside soundsDir
    if (!filePath.startsWith(soundsDir)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.sendFile(filePath);
  });

  app.get("/api/next-match", async (req, res) => {
    try {
      // Get cached match if available and cache is fresh. A degraded fetch
      // (a source was down) gets a much shorter TTL — the cached "next" match
      // may be wrong if the missing source had an earlier one.
      const cacheAge = Date.now() - lastFetchTime;
      const matchTtl = lastFetchDegraded ? DEGRADED_MATCH_CACHE_TTL : MATCH_CACHE_TTL;
      if (cacheAge < matchTtl) {
        const cachedMatch = await storage.getNextMatch();
        if (cachedMatch) {
          return res.json({ ...cachedMatch, ...lastFetchExtras });
        }
      } else {
        await storage.clearCache();
      }

      // Check if we recently found no matches to avoid excessive API calls
      if (noMatchesCache) {
        const ttl = noMatchesCache.degraded
          ? DEGRADED_NO_MATCHES_CACHE_DURATION
          : NO_MATCHES_CACHE_DURATION;
        if (Date.now() - noMatchesCache.timestamp < ttl) {
          return res.status(404).json({
            message: "No upcoming matches found",
            seasonStatus: noMatchesCache.degraded ? "unknown" : "off-season"
          });
        }
      }

      const { matches, sources, degraded } = await fetchAllMatches();
      const nextMatch = matches[0];

      if (!nextMatch) {
        noMatchesCache = { timestamp: Date.now(), degraded };
        // Only claim off-season when both sources answered — an empty result
        // during an outage should render as an error, not "Season Complete".
        return res.status(404).json({
          message: "No upcoming matches found",
          seasonStatus: degraded ? "unknown" : "off-season",
          sources
        });
      }
      noMatchesCache = null;

      // Clear any old cache first
      await storage.clearCache();

      // Transform to our schema
      const matchData = {
        competition: nextMatch.competition,
        homeTeam: nextMatch.homeTeam,
        awayTeam: nextMatch.awayTeam,
        venue: nextMatch.venue,
        kickoff: new Date(nextMatch.utcDate),
        broadcasts: {}
      };

      // Validate
      const validated = insertMatchSchema.parse(matchData);

      // Store and return
      const match = await storage.insertMatch(validated);
      lastFetchTime = Date.now();
      lastFetchDegraded = degraded;
      lastFetchExtras = { timeTbc: nextMatch.timeTbc, sources };
      res.json({ ...match, ...lastFetchExtras });
    } catch (error) {
      console.error("Error in /api/next-match:", error);
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid match data" });
      } else if (axios.isAxiosError(error)) {
        res.status(error.response?.status || 500).json({ 
          message: "Failed to fetch match data" 
        });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Full upcoming fixture list plus per-source health — consumed by the weekly
  // schedule-verification routine, not by the app UI. Mirrors worker/index.ts.
  app.get("/api/fixtures", async (req, res) => {
    try {
      if (fixturesCache) {
        const ttl = fixturesCache.degraded
          ? DEGRADED_NO_MATCHES_CACHE_DURATION
          : FIXTURES_CACHE_TTL;
        if (Date.now() - fixturesCache.timestamp < ttl) {
          return res.json(fixturesCache.data);
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
      res.json(payload);
    } catch (error) {
      console.error("Error in /api/fixtures:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Endpoint to scrape ESPN for TV provider information
  app.get("/api/espn-tv-provider", async (req, res) => {
    try {
      const { date } = req.query;
      
      if (!date || typeof date !== 'string') {
        return res.status(400).json({ message: "Date parameter required (YYYYMMDD format)" });
      }
      
      const espnUrl = `https://www.espn.com/soccer/schedule/_/date/${date}`;
      
      const response = await axios.get(espnUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      let tvProvider: string | null = null;
      
      // Search for Arsenal matches in any relevant competition section
      // Includes: Premier League, EFL Cup/League Cup/Carabao Cup, FA Cup
      const relevantCompetitions = [
        'English Premier League',
        'EFL Cup',
        'League Cup', 
        'Carabao Cup',
        'FA Cup',
        'English FA Cup'
      ];
      
      $('div').each((i, section) => {
        if (tvProvider) return; // Already found, stop searching
        
        const sectionText = $(section).text();
        
        // Check if this section contains any relevant competition
        const isRelevantSection = relevantCompetitions.some(comp => sectionText.includes(comp));
        
        if (isRelevantSection && sectionText.includes('Arsenal')) {
          // Find the table in this section
          const table = $(section).find('table').first();
          
          if (table.length > 0) {
            // Find Arsenal row
            table.find('tr').each((j, row) => {
              if (tvProvider) return; // Already found
              
              const rowText = $(row).text();
              
              // Check if this row contains Arsenal
              if (rowText.includes('Arsenal')) {
                // Find the TV column (4th column, index 3)
                const cells = $(row).find('td');
                
                // TV info is in the 4th cell (index 3)
                if (cells.length >= 4) {
                  const tvCell = $(cells[3]);
                  
                  // Look for network-name div (primary network)
                  const primaryNetwork = tvCell.find('.network-name').first();
                  if (primaryNetwork.length > 0) {
                    tvProvider = primaryNetwork.text().trim();
                  } else {
                    // Fallback to cell text
                    const tvText = tvCell.text().trim();
                    if (tvText && tvText.length > 0) {
                      tvProvider = tvText;
                    }
                  }
                  
                  // Also check for image alt text (ESPN+ logo)
                  if (!tvProvider) {
                    const tvImg = tvCell.find('img').attr('alt');
                    if (tvImg) {
                      tvProvider = tvImg;
                    }
                  }
                }
              }
            });
          }
        }
      });
      
      res.json({ tvProvider });
      
    } catch (error) {
      console.error("Error scraping ESPN:", error);
      res.status(500).json({ message: "Failed to scrape ESPN" });
    }
  });

  app.post("/api/clear-cache", async (req, res) => {
    try {
      await storage.clearCache();
      noMatchesCache = null;
      lastFetchTime = 0;
      lastFetchDegraded = false;
      lastFetchExtras = null;
      fixturesCache = null;
      res.json({ message: "Cache cleared successfully" });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ message: "Failed to clear cache" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}