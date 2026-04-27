// Build the Cloudflare Worker bundle with build-time secret injection.
// Reads FOOTBALL_PROXY_SECRET and SPORTSDB_API_KEY from process.env and bakes
// them into the bundle via esbuild --define. Replaces the previous pattern of
// `wrangler secret put` so Arsenal Countdown follows the same build-time-only
// secrets pattern as the rest of the devlab502 stack.

import { build } from "esbuild";

const FOOTBALL_PROXY_SECRET = process.env.FOOTBALL_PROXY_SECRET;
const SPORTSDB_API_KEY = process.env.SPORTSDB_API_KEY;

if (!FOOTBALL_PROXY_SECRET) {
  console.error("FOOTBALL_PROXY_SECRET env var is required for the worker build");
  process.exit(1);
}
if (!SPORTSDB_API_KEY) {
  console.error("SPORTSDB_API_KEY env var is required for the worker build");
  process.exit(1);
}

await build({
  entryPoints: ["worker/index.ts"],
  bundle: true,
  platform: "browser",
  format: "esm",
  outfile: "dist/worker.js",
  define: {
    FOOTBALL_PROXY_SECRET: JSON.stringify(FOOTBALL_PROXY_SECRET),
    SPORTSDB_API_KEY: JSON.stringify(SPORTSDB_API_KEY),
  },
});

console.log("worker bundle written to dist/worker.js");
