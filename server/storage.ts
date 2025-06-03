import { type Match, type InsertMatch } from "@shared/schema";

export interface IStorage {
  getNextMatch(): Promise<Match | undefined>;
  insertMatch(match: InsertMatch): Promise<Match>;
  clearCache(): Promise<void>;
}

export class MemStorage implements IStorage {
  private matches: Map<number, Match>;
  private currentId: number;

  constructor() {
    this.matches = new Map();
    this.currentId = 1;
  }

  async getNextMatch(): Promise<Match | undefined> {
    const now = new Date();
    return Array.from(this.matches.values())
      .find(match => new Date(match.kickoff) > now);
  }

  async insertMatch(insertMatch: InsertMatch): Promise<Match> {
    const id = this.currentId++;
    const match = { 
      ...insertMatch, 
      id,
      broadcasts: insertMatch.broadcasts || {}
    };
    this.matches.set(id, match);
    return match;
  }

  async clearCache(): Promise<void> {
    this.matches.clear();
    console.log("Storage cache cleared");
  }
}

export const storage = new MemStorage();
