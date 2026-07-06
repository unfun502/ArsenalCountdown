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
- **Football-Data.org API (via VPS proxy)** — Premier League + Champions League schedules (Arsenal team ID: 57).
  Direct calls time out from Cloudflare Workers (datacenter IP blocked). Routed through `https://api.devlab502.net/football-proxy/` on the RackNerd VPS, authenticated with `FOOTBALL_PROXY_SECRET`.
- **TheSportsDB API** — FA Cup + League Cup schedules (Arsenal team ID: 133604). Free key `123`.
- **ipapi.co** — IP geolocation for broadcaster detection (no key needed)
- **ESPN scraping** — US-specific TV provider info for FA Cup matches only

## Build & Deploy
- Dev: `npm run dev` (starts Express + Vite HMR on port 5000)
- Build: `npm run build` (Vite → dist/public, then `node scripts/build-worker.mjs` → dist/worker.js)
- Output: `dist/` (dist/public for static assets, dist/worker.js for Worker)
- Deploys to Cloudflare Workers via GitHub Actions on push to main

## Environment Variables

Arsenal Countdown follows the standard devlab502 pattern: build-time injection from a GitHub Environment, no Cloudflare-runtime secrets.

### Worker secrets (build-time injected via esbuild --define)
- `FOOTBALL_PROXY_SECRET` — `x-proxy-key` shared with the VPS football-proxy. Source: GitHub `production` environment secret. The build script (`scripts/build-worker.mjs`) reads from `process.env` and bakes the literal value into `dist/worker.js`. Worker code references `FOOTBALL_PROXY_SECRET` as a module-level constant (declared via `declare const`).
- `SPORTSDB_API_KEY` — TheSportsDB API key (free `123` key or premium). Same injection mechanism.

Local dev: set both in your shell before running `npm run build` (or in `.env` if you wire up dotenv).

### GitHub Actions secrets (production environment)
- `CLOUDFLARE_API_TOKEN` — wrangler deploy auth
- `SENTRY_AUTH_TOKEN` — Sentry sourcemap upload
- `FOOTBALL_PROXY_SECRET` — passed to build via env, baked into Worker bundle
- `SPORTSDB_API_KEY` — same

### VPS-only (not in Worker, not in GH)
- `FOOTBALL_DATA_API_KEY` — Football-Data.org API key (free tier, 10 req/min). Set in `~/feedback/.env` on VPS only — used by the football-proxy server.

### Bitwarden backups
- `Cloudflare API Token` (in `devlab502/Infrastructure`)
- `Sentry — devlab502 (auth + DSN)` (in `devlab502/Infrastructure`)
- `Arsenal Countdown — Worker runtime secrets` (in `devlab502/Per-App`) — username = SPORTSDB_API_KEY, password = FOOTBALL_PROXY_SECRET

### VPS Proxy (football-proxy)
Service runs at `~/feedback/football-proxy/index.js` in the Docker Compose stack on port 3012.
Caddy routes `/football-proxy/*` → `football-proxy:3012`.
Env vars `FOOTBALL_DATA_API_KEY` and `FOOTBALL_PROXY_SECRET` set in `~/feedback/.env`.
To restart: `cd ~/feedback && docker compose restart football-proxy`

## Data Verification
- `GET /api/fixtures` returns the full merged upcoming match list plus per-source health (`degraded`, `sources`) — consumed by the weekly verification routine, not the UI.
- `shared/fixtures-baseline-2026-27.json` — released 2026-27 PL fixture list used as a cross-check baseline (dates provisional; opponent order stable).
- A Claude scheduled task `arsenal-countdown-weekly-verify` (Mondays 8am, runs while the desktop app is open) web-checks fixtures + broadcaster map and emails devlab502@proton.me on discrepancy via Zoho SMTP (`send-alert.py` in the task folder; app-password credentials in `~\.claude\secrets\zoho-smtp.json`, never committed).
- Broadcaster rights in `shared/constants.ts` were verified for 2026-27 (July 2026). `null` entries mean "verified: no broadcaster in that country" — UI shows "check local listings".

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
