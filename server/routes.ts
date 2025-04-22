import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { ZodError } from "zod";
import { insertMatchSchema } from "@shared/schema";

if (!process.env.FOOTBALL_DATA_API_KEY) {
  throw new Error("FOOTBALL_DATA_API_KEY is required");
}

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/next-match", async (req, res) => {
    try {
      // Get cached match if available
      const cachedMatch = await storage.getNextMatch();
      if (cachedMatch) {
        console.log("Returning cached match data");
        return res.json(cachedMatch);
      }

      console.log("Fetching new match data from API");
      // Fetch from football-data.org API
      const response = await axios.get(
        "https://api.football-data.org/v4/teams/57/matches?status=SCHEDULED&limit=1",
        {
          headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY }
        }
      );

      console.log("API Response:", JSON.stringify(response.data, null, 2));
      
      const nextMatch = response.data.matches[0];
      if (!nextMatch) {
        console.log("No upcoming matches found in API response");
        return res.status(404).json({ message: "No upcoming matches found" });
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