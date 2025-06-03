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

      console.log("Fetching new match data from API");
      
      // Try multiple approaches to find matches
      let response;
      let nextMatch = null;
      
      // First try: Arsenal team specific matches
      try {
        response = await axios.get(
          "https://api.football-data.org/v4/teams/57/matches?status=SCHEDULED&limit=1",
          {
            headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY }
          }
        );
        nextMatch = response.data.matches[0];
        console.log("Team-specific API Response:", JSON.stringify(response.data, null, 2));
      } catch (error) {
        console.log("Team-specific API failed:", error.message);
      }
      
      // Second try: Premier League matches if no team matches found
      if (!nextMatch) {
        try {
          response = await axios.get(
            "https://api.football-data.org/v4/competitions/PL/matches?status=SCHEDULED&limit=10",
            {
              headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY }
            }
          );
          
          // Look for Arsenal in the matches
          const arsenalMatch = response.data.matches.find(match => 
            match.homeTeam.id === 57 || match.awayTeam.id === 57
          );
          
          if (arsenalMatch) {
            nextMatch = arsenalMatch;
            console.log("Found Arsenal match in PL fixtures");
          }
        } catch (error) {
          console.log("Premier League API failed:", error.message);
        }
      }
      
      // Third try: Look in Champions League or other competitions
      if (!nextMatch) {
        try {
          response = await axios.get(
            "https://api.football-data.org/v4/competitions/CL/matches?status=SCHEDULED&limit=20",
            {
              headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY }
            }
          );
          
          // Look for Arsenal in Champions League matches
          const arsenalMatch = response.data.matches.find(match => 
            match.homeTeam.id === 57 || match.awayTeam.id === 57
          );
          
          if (arsenalMatch) {
            nextMatch = arsenalMatch;
            console.log("Found Arsenal match in CL fixtures");
          }
        } catch (error) {
          console.log("Champions League API failed:", error.message);
        }
      }
      
      if (!nextMatch) {
        console.log("No upcoming matches found in any competition");
        return res.status(404).json({ 
          message: "No upcoming matches found",
          seasonStatus: "off-season"
        });
      }

      // Transform to our schema
      const matchData = {
        competition: nextMatch.competition.name,
        homeTeam: nextMatch.homeTeam.name,
        awayTeam: nextMatch.awayTeam.name,
        venue: nextMatch.venue || "TBD",
        kickoff: new Date(nextMatch.utcDate),
        broadcasts: {}
      };

      // Validate
      const validated = insertMatchSchema.parse(matchData);

      // Store and return
      const match = await storage.insertMatch(validated);
      console.log("Successfully stored and returning new match data");
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

  const httpServer = createServer(app);
  return httpServer;
}