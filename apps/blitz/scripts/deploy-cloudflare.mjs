// `npm run deploy:cloudflare`: logs in to Cloudflare (opens your browser the first time),
// asks for the Supabase secrets once, then builds the Docker image and deploys.
import { execSync, spawnSync } from "node:child_process";
import readline from "node:readline/promises";

const sh = (cmd, opts = {}) => execSync(cmd, { stdio: "inherit", ...opts });
const quiet = (cmd) => spawnSync(cmd, { shell: true, encoding: "utf8" });

if (quiet("docker info").status !== 0) {
  console.error("Docker must be running: Cloudflare builds the Blitz container from the Dockerfile. Start Docker Desktop and try again.");
  process.exit(1);
}
if (quiet("npx wrangler whoami").stdout?.includes("not authenticated")) {
  console.log("→ Opening Cloudflare in your browser to authorize…");
  sh("npx wrangler login");
}
const secrets = quiet("npx wrangler secret list --format json").stdout ?? "";
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
for (const [name, hint] of [
  ["SUPABASE_URL", "Supabase → Project Settings → Data API → Project URL (https://xxxx.supabase.co)"],
  ["SUPABASE_SERVICE_ROLE_KEY", "Supabase → Project Settings → API Keys → service_role / secret key"],
  ["APP_PASSWORD", "A password for opening Blitz on the web (8+ characters)"],
]) {
  if (secrets.includes(`"${name}"`)) continue;
  const value = (await rl.question(`${name}\n  ${hint}\n  > `)).trim();
  if (value) spawnSync("npx", ["wrangler", "secret", "put", name], { input: value, stdio: ["pipe", "inherit", "inherit"], shell: process.platform === "win32" });
}
rl.close();
console.log("→ Building and deploying (first deploy takes a few minutes)…");
sh("npx wrangler deploy");
console.log("\n✓ Deployed. Open the workers.dev URL above, unlock with your app password, then paste your API keys in Settings → API keys.");
