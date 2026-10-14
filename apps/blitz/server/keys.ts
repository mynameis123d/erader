import fs from "node:fs";
import path from "node:path";

// API keys entered in Settings → API keys. Stored on this server only, in
// data/keys.json (git-ignored, file mode 600). A key saved here overrides .env.
// The browser only ever sees whether a key is set and its last 4 characters.

export interface KeyDef {
  name: string;
  label: string;
  /** Field in the server config that this key fills. */
  field: "apifyToken" | "bufferApiKey" | "anthropicApiKey" | "pexelsApiKey" | "pixabayApiKey" | "publicBaseUrl" | "bufferOrganizationId" | "appPassword";
  purpose: string;
  getUrl?: string;
  secret: boolean;
  /** Basic shape check so typos are caught before saving. */
  pattern?: RegExp;
}

export const KEY_DEFS: KeyDef[] = [
  { name: "APIFY_TOKEN", label: "Apify", field: "apifyToken", secret: true, purpose: "Scrapes trending TikToks in your niche (references + Media Bank candidates).", getUrl: "https://console.apify.com/settings/integrations", pattern: /^apify_api_[A-Za-z0-9]{20,}$/ },
  { name: "BUFFER_API_KEY", label: "Buffer", field: "bufferApiKey", secret: true, purpose: "Posts to your TikTok, Instagram and YouTube channels.", getUrl: "https://publish.buffer.com/settings/api", pattern: /^[A-Za-z0-9_-]{20,}$/ },
  { name: "ANTHROPIC_API_KEY", label: "Claude (Anthropic)", field: "anthropicApiKey", secret: true, purpose: "Reads your website and writes every post. Without it, posts come from templates and repeat.", getUrl: "https://console.anthropic.com/settings/keys", pattern: /^sk-ant-[A-Za-z0-9_-]{20,}$/ },
  { name: "PEXELS_API_KEY", label: "Pexels", field: "pexelsApiKey", secret: true, purpose: "Real stock videos and photos matched to each post (free).", getUrl: "https://www.pexels.com/api/new/", pattern: /^[A-Za-z0-9]{30,}$/ },
  { name: "PIXABAY_API_KEY", label: "Pixabay", field: "pixabayApiKey", secret: true, purpose: "Optional second source of free stock videos.", getUrl: "https://pixabay.com/api/docs/", pattern: /^[0-9]+-[A-Za-z0-9]+$/ },
  { name: "PUBLIC_BASE_URL", label: "Public URL of this app", field: "publicBaseUrl", secret: false, purpose: "Buffer downloads your rendered videos from here. Use your deployed URL or a tunnel (cloudflared / ngrok).", pattern: /^https:\/\/[^\s/]+(\/[^\s]*)?$/ },
  { name: "APP_PASSWORD", label: "App password", field: "appPassword", secret: true, purpose: "Needed to open Blitz from anywhere but this computer (e.g. through your public URL). Media files stay public so Buffer can fetch them.", pattern: /^.{8,}$/ },
  { name: "BUFFER_ORGANIZATION_ID", label: "Buffer organization ID", field: "bufferOrganizationId", secret: false, purpose: "Optional. Only needed if your Buffer account has several organizations." },
];

export class KeyStore {
  private values: Record<string, string> = {};

  constructor(private file: string) {
    try {
      if (fs.existsSync(file)) this.values = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      this.values = {};
    }
  }

  get(name: string): string | undefined {
    return this.values[name];
  }

  set(name: string, value: string | null) {
    if (value === null || value === "") delete this.values[name];
    else this.values[name] = value;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.values, null, 2), { mode: 0o600 });
    fs.chmodSync(this.file, 0o600);
  }

  /** Config fields filled from saved keys. */
  overrides(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const def of KEY_DEFS) {
      const v = this.values[def.name];
      if (v) out[def.field] = def.field === "publicBaseUrl" ? v.replace(/\/+$/, "") : v;
    }
    return out;
  }
}

export const mask = (v: string) => (v.length <= 8 ? "••••" : `••••${v.slice(-4)}`);
