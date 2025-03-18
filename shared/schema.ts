import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  competition: text("competition").notNull(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  venue: text("venue").notNull(),
  kickoff: timestamp("kickoff").notNull(),
  broadcasts: jsonb("broadcasts").$type<Record<string, string>>(),
});

export const insertMatchSchema = createInsertSchema(matches);

export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;

export const broadcasterSchema = z.object({
  country: z.string(),
  network: z.string()
});

export type Broadcaster = z.infer<typeof broadcasterSchema>;
