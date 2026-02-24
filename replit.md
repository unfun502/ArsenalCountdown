# Arsenal Match Countdown Application

## Overview

This is a full-stack web application that displays a countdown timer to the next Arsenal Football Club match. The application features a split-flap display design with typewriter sound effects, fetches match data from the Football-Data.org API, and provides match details including broadcasting information based on user location. Users can add matches to their calendar and optionally enable browser notifications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tool**
- **React 18** with TypeScript for the UI layer
- **Vite** as the build tool and development server with HMR (Hot Module Replacement)
- **Wouter** for client-side routing (lightweight alternative to React Router)

**UI Component Library**
- **Radix UI** primitives for accessible, unstyled components
- **Tailwind CSS** for styling with a custom theme system
- **shadcn/ui** pattern for component composition
- Custom theme configuration via `theme.json` with vibrant variant and dark mode

**State Management**
- **TanStack Query (React Query)** for server state management, caching, and API data fetching
- Configured with 30-minute stale time to minimize API calls and respect rate limits
- Local state with React hooks for UI interactions

**Key Features**
- **Split-Flap Display**: Custom countdown component with animated digit transitions mimicking vintage airport displays
- **Sound Effects**: Real split-flap mechanical sounds. Hybrid audio approach for iOS Safari compatibility:
  - `splitflap-click.mp3` — full split-flap recording used for spin loop (HTML5 Audio, started synchronously in user gesture for iOS)
  - `splitflap-tick.mp3` — single tick extracted from recording, used for per-second countdown clicks (Web Audio API)
  - `splitflap-click-generated.mp3` — backup synthetically generated click sound
  - `splitflap-click-alt.mp3` — alternate real recording (user's uploaded file)
  - HTML5 Audio click pool as fallback if Web Audio not ready
  - Silent Web Audio oscillator keepalive to prevent iOS from suspending audio session
  - Sound defaults to OFF; user must toggle ON to enable
- **Add to Calendar**: Integration with `add-to-calendar-button` library for multi-platform calendar exports
- **Browser Notifications**: Optional match reminders with configurable timing (5 minutes to 1 day before kickoff)
- **Geolocation-based Broadcasting Info**: Fetches user location via IP to show relevant TV broadcasters

### Backend Architecture

**Server Framework**
- **Express.js** on Node.js with TypeScript
- ESM (ECMAScript Modules) throughout the codebase
- Custom middleware for request/response logging with duration tracking

**API Design**
- RESTful endpoint: `GET /api/next-match` returns the next upcoming Arsenal match
- RESTful endpoint: `GET /api/espn-tv-provider?date=YYYYMMDD` scrapes ESPN for specific TV provider information
  - Used for Premier League matches < 4 days away for US viewers
  - Extracts specific broadcaster (NBC, USA Network, or Peacock) from ESPN's schedule page
  - Falls back to generic "NBC/PEACOCK" if data not yet available
- Static file serving for audio assets with proper MIME types
- Vite middleware integration in development for seamless full-stack development

**Caching Strategy**
- In-memory storage implementation (`MemStorage` class) for match data
- Two-tier caching:
  1. Match data cache to minimize external API calls
  2. "No matches found" cache (10-minute duration) to prevent excessive API requests during off-season
- Cache invalidation via `/api/next-match` endpoint logic

**Error Handling**
- Centralized error middleware with status code and message extraction
- Graceful handling of 404 (off-season) and 429 (rate limit) responses
- Exponential backoff retry strategy on client with maximum 2 retries

### Data Storage

**Database**
- **PostgreSQL** via Neon serverless driver (`@neondatabase/serverless`)
- **Drizzle ORM** for type-safe database operations and migrations
- Schema defined in `shared/schema.ts` with Zod validation

**Schema Design**
- `matches` table with fields:
  - `id`: Serial primary key
  - `competition`, `homeTeam`, `awayTeam`, `venue`: Text fields
  - `kickoff`: Timestamp for match start time
  - `broadcasts`: JSONB field storing country-to-network mappings

**Migration Strategy**
- Drizzle Kit for schema migrations (output to `./migrations`)
- `db:push` command for applying schema changes to database

**Current Implementation Note**
- Application uses in-memory storage (`MemStorage`) as the active storage layer
- Database schema defined but not currently integrated (prepared for future persistence)

### External Dependencies

**Third-Party APIs**
- **Football-Data.org API**: Fetches Premier League and Champions League match data
  - Requires `FOOTBALL_DATA_API_KEY` environment variable
  - Free tier includes 12 competitions (Premier League, Champions League, etc.)
  - Does NOT include FA Cup or League Cup (paid plans only)
  - Arsenal team ID: 57
  - Rate limit: 10 requests per minute
- **TheSportsDB.com API**: Fetches FA Cup and League Cup match data
  - Requires `SPORTSDB_API_KEY` environment variable
  - Arsenal team ID: 133604
  - FA Cup league ID: 4482
  - League Cup (EFL Cup/Carabao Cup) ID: 4570
  - Only matches from these specific competitions are included in results
  - Free tier returns 1 event; premium ($9/month) returns up to 10 events
- **Dual-API Strategy**: 
  - Fetches from both APIs simultaneously
  - Combines and sorts all matches chronologically
  - Displays the next upcoming match regardless of competition
  - Ensures comprehensive coverage across Premier League, Champions League, FA Cup, and League Cup
- **ipapi.co**: Geolocation service for determining user's country code
  - Used to provide relevant broadcaster information
  - No API key required for basic usage

**Cloud Services**
- **Neon Database**: Serverless PostgreSQL hosting
  - Connection via `DATABASE_URL` environment variable
  - Configured in `drizzle.config.ts`

**Browser APIs**
- **Notification API**: For match reminder notifications
  - Requires user permission grant
  - Disabled on mobile devices due to limited support
- **localStorage**: Persists user preferences (sound settings, notification preferences)
- **Audio API**: Plays typewriter sound effects for UI interactions

**Broadcasting Data**
- Competition-aware broadcaster mappings in `shared/constants.ts` for 12 countries
  - GB, US, CA, AU, DE, FR, ES, IT, NL, IN, BR, IE
  - Each country has per-competition broadcasters (Premier League, Champions League, FA Cup, League Cup) plus a default fallback
  - `getBroadcaster(countryCode, competitionName)` helper resolves the correct broadcaster
  - For US viewers, ESPN scraping overrides the hardcoded data when match-specific info is available

**Font & Icon Libraries**
- **Google Fonts**: Lato (weights 300, 400, 700, 900) and JetBrains Mono (700)
- **Lucide React**: Icon library for UI elements

**Development Tools**
- **Replit-specific plugins**: 
  - `@replit/vite-plugin-shadcn-theme-json` for theme customization
  - `@replit/vite-plugin-runtime-error-modal` for error overlay
  - `@replit/vite-plugin-cartographer` for development features (non-production)