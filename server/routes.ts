import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { ZodError } from "zod";
import { insertMatchSchema } from "@shared/schema";
import path from "path";
import express from "express";

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
const FA_CUP_LEAGUE_ID = "4482";
const LEAGUE_CUP_ID = "4570";

// Cache to prevent excessive API calls when no matches are found
let noMatchesCache: { timestamp: number; duration: number } | null = null;
const NO_MATCHES_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve sound files with the correct content type
  app.get('/sounds/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'public', 'sounds', filename);
    
    // Set proper content type for audio files
    if (filename.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    }
    
    res.sendFile(filePath);
  });

  app.get("/api/next-match", async (req, res) => {
    try {
      // Get cached match if available
      const cachedMatch = await storage.getNextMatch();
      if (cachedMatch) {
        console.log("Returning cached match data");
        return res.json(cachedMatch);
      }

      // Check if we recently found no matches to avoid excessive API calls
      if (noMatchesCache && (Date.now() - noMatchesCache.timestamp) < NO_MATCHES_CACHE_DURATION) {
        console.log("Using cached 'no matches' response to preserve rate limits");
        return res.status(404).json({ 
          message: "No upcoming matches found",
          seasonStatus: "off-season"
        });
      }

      console.log("Fetching new match data from APIs");
      
      const allMatches: any[] = [];
      const now = new Date();
      
      // Fetch from Football Data API (Premier League + Champions League)
      try {
        const response = await axios.get(
          "https://api.football-data.org/v4/teams/57/matches?status=SCHEDULED&limit=50",
          {
            headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY },
            timeout: 5000
          }
        );
        
        const futureMatches = response.data.matches
          .filter((match: any) => new Date(match.utcDate) > now)
          .map((match: any) => ({
            competition: { name: match.competition.name },
            homeTeam: { name: match.homeTeam.name, id: match.homeTeam.id },
            awayTeam: { name: match.awayTeam.name, id: match.awayTeam.id },
            venue: match.venue || "Emirates Stadium",
            utcDate: match.utcDate,
            source: "football-data"
          }));
        
        allMatches.push(...futureMatches);
        console.log(`Football Data API: ${futureMatches.length} matches found`);
      } catch (error: any) {
        console.log("Football Data API failed:", error.message);
      }
      
      // Fetch from TheSportsDB API (FA Cup + League Cup)
      try {
        // Get all Arsenal events (up to 10 with premium key)
        const arsenalResponse = await axios.get(
          `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/eventsnext.php?id=${ARSENAL_TEAM_ID}`,
          { timeout: 5000 }
        );
        
        if (arsenalResponse.data.events) {
          const cupMatches = arsenalResponse.data.events
            .filter((event: any) => {
              const isRelevantCompetition = event.idLeague === FA_CUP_LEAGUE_ID || event.idLeague === LEAGUE_CUP_ID;
              const eventDate = new Date(`${event.dateEvent}T${event.strTime}`);
              return isRelevantCompetition && eventDate > now;
            })
            .map((event: any) => ({
              competition: { name: event.strLeague },
              homeTeam: { name: event.strHomeTeam, id: event.idHomeTeam },
              awayTeam: { name: event.strAwayTeam, id: event.idAwayTeam },
              venue: event.strVenue || "Emirates Stadium",
              utcDate: `${event.dateEvent}T${event.strTime}`,
              source: "thesportsdb"
            }));
          
          allMatches.push(...cupMatches);
          console.log(`TheSportsDB API: ${cupMatches.length} FA Cup/League Cup matches found`);
        }
      } catch (error: any) {
        console.log("TheSportsDB API failed:", error.message);
      }
      
      // Log all competitions found
      const competitions = Array.from(new Set(allMatches.map((m: any) => m.competition.name)));
      console.log(`Total matches from all sources: ${allMatches.length}`);
      console.log("Competitions found:", competitions.join(", "));
      
      // Sort all matches by date to get the chronologically next match
      allMatches.sort((a: any, b: any) => {
        return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
      });
      
      // Log first 10 matches
      allMatches.slice(0, 10).forEach((match: any) => {
        console.log(`  - ${new Date(match.utcDate).toLocaleDateString()}: ${match.homeTeam.name} vs ${match.awayTeam.name} (${match.competition.name})`);
      });
      
      const nextMatch = allMatches[0];
      
      if (nextMatch) {
        console.log("Next match selected:", nextMatch.homeTeam.name, "vs", nextMatch.awayTeam.name, `(${nextMatch.competition.name})`);
      }
      
      if (!nextMatch) {
        console.log("No upcoming matches found");
        // Cache the "no matches" result to prevent excessive API calls
        noMatchesCache = { timestamp: Date.now(), duration: NO_MATCHES_CACHE_DURATION };
        return res.status(404).json({ 
          message: "No upcoming matches found",
          seasonStatus: "off-season"
        });
      }

      // Clear any old cache first
      await storage.clearCache();

      // Transform to our schema
      const matchData = {
        competition: nextMatch.competition.name,
        homeTeam: nextMatch.homeTeam.name,
        awayTeam: nextMatch.awayTeam.name,
        venue: nextMatch.venue || "Emirates Stadium",
        kickoff: new Date(nextMatch.utcDate),
        broadcasts: {}
      };

      // Validate
      const validated = insertMatchSchema.parse(matchData);

      // Store and return
      const match = await storage.insertMatch(validated);
      console.log("Successfully stored and returning match data:", match.homeTeam, "vs", match.awayTeam);
      res.json(match);
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

  app.post("/api/clear-cache", async (req, res) => {
    try {
      await storage.clearCache();
      // Also clear the no-matches cache
      noMatchesCache = null;
      console.log("All caches cleared");
      res.json({ message: "Cache cleared successfully" });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ message: "Failed to clear cache" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}