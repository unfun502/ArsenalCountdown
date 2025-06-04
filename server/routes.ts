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

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;

// Cache to prevent excessive API calls when no matches are found
let noMatchesCache: { timestamp: number; duration: number } | null = null;
const NO_MATCHES_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

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

      console.log("Fetching new match data from API");
      
      // Try to fetch from API with rate limiting awareness
      let nextMatch = null;
      
      try {
        const response = await axios.get(
          "https://api.football-data.org/v4/teams/57/matches?status=SCHEDULED&limit=10",
          {
            headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY },
            timeout: 5000
          }
        );
        
        // Filter out matches that are in the past
        const now = new Date();
        const futureMatches = response.data.matches.filter((match: any) => {
          const matchDate = new Date(match.utcDate);
          return matchDate > now;
        });
        
        nextMatch = futureMatches[0];
        console.log("API Response - Future matches found:", futureMatches.length);
        
      } catch (error: any) {
        console.log("API failed:", error.message);
        
        // If rate limited or API unavailable, provide a demo match for development
        if (error.response?.status === 429 || error.code === 'ECONNREFUSED' || error.code === 'TIMEOUT') {
          console.log("Using demo match due to API limitations");
          
          // Create a realistic upcoming Arsenal match (next weekend)
          const demoKickoff = new Date();
          demoKickoff.setDate(demoKickoff.getDate() + 3); // 3 days from now
          demoKickoff.setHours(15, 0, 0, 0); // 3 PM kickoff
          
          nextMatch = {
            competition: { name: "Premier League" },
            homeTeam: { name: "Arsenal", id: 57 },
            awayTeam: { name: "Manchester City", id: 65 },
            venue: "Emirates Stadium",
            utcDate: demoKickoff.toISOString()
          };
        }
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