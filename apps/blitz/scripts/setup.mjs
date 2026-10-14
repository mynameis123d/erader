// One-time setup: `npm run setup` from apps/blitz.
// Installs dependencies (including ffmpeg and the canvas renderer, both prebuilt),
// creates .env if missing, builds the web app and prints how to start.
import { execSync } from "node:child_process";
import fs from "node:fs";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
const [major] = process.versions.node.split(".").map(Number);
if (major < 20) {
  console.error(`Blitz needs Node.js 20 or newer (you have ${process.versions.node}). Get it from https://nodejs.org`);
  process.exit(1);
}
console.log("→ Installing dependencies…");
run("npm install");
if (!fs.existsSync(".env")) {
  fs.copyFileSync(".env.example", ".env");
  console.log("→ Created .env (you can leave it empty and paste keys in Settings → API keys)");
}
console.log("→ Building the web app…");
run("npm run build");
console.log(`
✓ Blitz is ready.

  Start it:        npm start            then open http://localhost:${process.env.PORT ?? 8787}
  Add your keys:   Settings → API keys  (Apify, Buffer, Claude, Pexels, public URL)
  Check keys:      npm run check
  Public URL:      Buffer needs to download your videos, e.g.  npx cloudflared tunnel --url http://localhost:${process.env.PORT ?? 8787}
                   then paste the https://….trycloudflare.com address into Settings → API keys → Public URL
`);
