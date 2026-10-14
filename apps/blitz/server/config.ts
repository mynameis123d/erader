import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function opt(name: string): string | null {
  const v = process.env[name]?.trim();
  return v ? v : null;
}

// Secrets stay on the server. Nothing in this object is ever sent to the browser
// except the booleans exposed by /api/integrations.
export const config = {
  port: Number(process.env.PORT ?? 8787),
  rootDir: root,
  dataDir: path.join(root, "data"),
  mediaDir: path.join(root, "data", "media"),
  webDist: path.join(root, "web", "dist"),
  bufferApiKey: opt("BUFFER_API_KEY"),
  bufferOrganizationId: opt("BUFFER_ORGANIZATION_ID"),
  bufferEndpoint: opt("BUFFER_API_URL") ?? "https://api.buffer.com",
  publicBaseUrl: opt("PUBLIC_BASE_URL")?.replace(/\/+$/, "") ?? null,
  anthropicApiKey: opt("ANTHROPIC_API_KEY"),
  pexelsApiKey: opt("PEXELS_API_KEY"),
  /** Keyless CC0 photo search used when there is no Pexels key. Set OPENVERSE=off to use painted scenes only. */
  openverse: opt("OPENVERSE") !== "off",
  pixabayApiKey: opt("PIXABAY_API_KEY"),
  apifyToken: opt("APIFY_TOKEN"),
  /** Supabase project for cloud persistence (state, keys, media). Set as env/secrets, not in Settings. */
  supabaseUrl: opt("SUPABASE_URL"),
  supabaseKey: opt("SUPABASE_SERVICE_ROLE_KEY") ?? opt("SUPABASE_SECRET_KEY"),
  appPassword: opt("APP_PASSWORD"),
  apifyTikTokActor: opt("APIFY_TIKTOK_ACTOR") ?? "clockworks~tiktok-scraper",
};
