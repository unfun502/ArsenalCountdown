import { type Match, type InsertMatch } from "@shared/schema";

export interface IStorage {
  getNextMatch(): Promise<Match | undefined>;
  insertMatch(match: InsertMatch): Promise<Match>;
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
    const match = { ...insertMatch, id };
    this.matches.set(id, match);
    return match;
  }
}

export const storage = new MemStorage();
