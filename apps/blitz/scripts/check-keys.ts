// Checks every key in .env against the live services: `npm run check`.
// Buffer: lists your organization's channels (TikTok / Instagram / YouTube).
// Apify:  confirms the token, and with --scrape runs a small TikTok hashtag scrape.
// Pexels: searches one video.
import { config } from "../server/config.js";
import { BufferClient } from "../server/services/buffer.js";
import { ApifyClient } from "../server/services/trends.js";
import { VideoSearch } from "../server/services/videos.js";

const ok = (name: string, msg: string) => console.log(`✓ ${name.padEnd(8)} ${msg}`);
const bad = (name: string, msg: string) => console.log(`✗ ${name.padEnd(8)} ${msg}`);

async function main() {
  if (!config.bufferApiKey) bad("Buffer", "BUFFER_API_KEY not set");
  else {
    try {
      const b = new BufferClient(config.bufferApiKey, config.bufferEndpoint);
      const orgs = await b.organizations();
      const channels = orgs.length ? await b.channels(config.bufferOrganizationId ?? orgs[0].id) : [];
      ok("Buffer", `${orgs.length} org(s); channels: ${channels.map((c) => `${c.service}:${c.displayName ?? c.name}`).join(", ") || "none connected yet"}`);
    } catch (e) {
      bad("Buffer", (e as Error).message);
    }
  }

  if (!config.apifyToken) bad("Apify", "APIFY_TOKEN not set");
  else {
    const a = new ApifyClient(config.apifyToken, config.apifyTikTokActor);
    try {
      const me = await a.me();
      ok("Apify", `token works (user ${me.username})`);
      const runArg = process.argv.find((x) => x.startsWith("--run="));
      if (runArg) {
        const run = await a.getRun(runArg.slice(6));
        const items = await a.datasetItems(run.defaultDatasetId, 5);
        ok("Apify", `run ${run.id} is ${run.status}; first items: ${items.map((i) => `${i.playCount ?? "?"} views "${(i.text ?? "").slice(0, 40)}"`).join(" | ")}`);
      }
      if (process.argv.includes("--scrape")) {
        console.log("  … starting a small scrape (#sneakers, 5 posts); this takes 1-3 minutes");
        const run = await a.startRun(ApifyClient.hashtagInput(["sneakers"], 5));
        const { items } = await a.waitForItems(run.id);
        ok("Apify", `scraped ${items.length} posts, e.g. ${items[0]?.webVideoUrl ?? "n/a"}`);
      }
    } catch (e) {
      bad("Apify", (e as Error).message);
    }
  }

  const v = new VideoSearch(config.pexelsApiKey, config.pixabayApiKey);
  if (!v.enabled) bad("Videos", "PEXELS_API_KEY / PIXABAY_API_KEY not set (background clips fall back to painted scenes)");
  else {
    const clip = await v.find("city street walking");
    clip ? ok("Videos", `found a clip by ${clip.credit}`) : bad("Videos", "search returned nothing; check the key");
  }

  config.publicBaseUrl ? ok("Public", config.publicBaseUrl) : bad("Public", "PUBLIC_BASE_URL not set; Buffer can't fetch rendered media until it is");
}

main();
