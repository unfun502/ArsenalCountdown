# CLAUDE.md — Arsenal Match Countdown

## What This App Does
Displays an animated split-flap countdown timer to the next Arsenal FC match. Fetches match data from Football-Data.org (Premier League, Champions League) and TheSportsDB (FA Cup, League Cup), shows geolocation-based broadcaster info, and offers calendar integration and browser notifications.

## Tech Stack
- **Frontend:** React 18 + TypeScript, Wouter (routing), TanStack Query, Radix UI / shadcn/ui, Tailwind CSS
- **Build tool:** Vite 7 (client) + esbuild (worker)
- **Backend:** Cloudflare Workers (production), Express.js (local dev only)
- **Audio:** Web Audio API + HTML5 Audio hybrid for split-flap sounds (iOS Safari compatible)

## Domain
countdown.devlab502.net

## External Dependencies
- **Football-Data.org API** — Premier League + Champions League schedules (Arsenal team ID: 57)
- **TheSportsDB API** — FA Cup + League Cup schedules (Arsenal team ID: 133604)
- **ipapi.co** — IP geolocation for broadcaster detection (no key needed)
- **ESPN scraping** — US-specific TV provider info for Premier League matches

## Build & Deploy
- Dev: `npm run dev` (starts Express + Vite HMR on port 5000)
- Build: `npm run build` (Vite → dist/public, esbuild → dist/worker.js)
- Output: `dist/` (dist/public for static assets, dist/worker.js for Worker)
- Deploys to Cloudflare Workers via GitHub Actions on push to main

## Environment Variables
- `FOOTBALL_DATA_API_KEY` — Football-Data.org API key (free tier, 10 req/min)
- `SPORTSDB_API_KEY` — TheSportsDB API key (free or premium)
- `DATABASE_URL` — PostgreSQL connection string (Neon serverless; currently unused at runtime)
- `CLOUDFLARE_API_TOKEN` — GitHub Actions secret for wrangler deploy

### Wrangler Secrets
The Worker reads `FOOTBALL_DATA_API_KEY` and `SPORTSDB_API_KEY` from its `Env` interface.
Set these via the Cloudflare dashboard (Workers > arsenalcountdown > Settings > Variables)
or via CLI:
```
npx wrangler secret put FOOTBALL_DATA_API_KEY
npx wrangler secret put SPORTSDB_API_KEY
```

## Database Needs
- **Current:** In-memory cache in both Express server and Cloudflare Worker. Drizzle ORM schema defined (`matches` table) but not wired up at runtime.
- **Future:** Could persist match data + user preferences to PostgREST at api.devlab502.net. Tables needed: `matches` (competition, teams, venue, kickoff, broadcasts).

## Image Storage
- **Static assets:** `client/public/images/otter-logo.png` (portfolio link icon) — stays in repo
- **Audio files:** `client/public/sounds/` (5 split-flap audio files) — stays in repo
- No dynamic/user-uploaded images; R2 migration not needed

## Project Structure
```
client/           React frontend (Vite root)
  src/components/ UI components (countdown.tsx is the main 49KB component)
  src/pages/      Route pages
  src/assets/     Audio system
  public/         Static assets (images, sounds, _headers)
server/           Express backend (local dev only)
worker/           Cloudflare Workers entry point (production)
shared/           Shared types, schema, broadcaster constants
.github/workflows/ CI/CD (deploy.yml → Cloudflare Workers)
```

## Key Files
- `worker/index.ts` — Production API handler (CF Workers fetch handler)
- `server/routes.ts` — Dev API handler (Express, mirrors worker logic)
- `shared/constants.ts` — Broadcaster mappings for 12 countries
- `shared/schema.ts` — Drizzle ORM schema + Zod validation
- `client/src/components/countdown.tsx` — Main countdown display (complex animation + audio)
- `wrangler.jsonc` — Cloudflare Workers configuration

## Contact
devlab502@proton.me
