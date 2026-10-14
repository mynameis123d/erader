// Slide photos. Order of preference:
//   1. Pexels (PEXELS_API_KEY): best quality, free key.
//   2. Openverse: no key needed; public-domain / CC0 photos only, so posts need no attribution.
//   3. Nothing: the slide gets a painted scene (shared/scene.ts) instead.

const GRADIENTS: [string, string][] = [
  ["#1f1c2c", "#928dab"],
  ["#0f2027", "#2c5364"],
  ["#42275a", "#734b6d"],
  ["#141e30", "#243b55"],
  ["#3a1c71", "#d76d77"],
  ["#232526", "#414345"],
  ["#614385", "#516395"],
  ["#1d4350", "#a43931"],
];

export function gradientFor(seed: string): [string, string] {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

type FetchLike = typeof fetch;

export class ImageSearch {
  private cache = new Map<string, string[]>();

  constructor(
    private pexelsKey: string | null,
    private openverse = true,
    private fetchImpl: FetchLike = fetch,
  ) {}

  get source(): "pexels" | "openverse" | "scenes" {
    return this.pexelsKey ? "pexels" : this.openverse ? "openverse" : "scenes";
  }

  /** Returns a portrait photo URL for the query, or null (the slide then uses a painted scene). */
  async find(query: string, variant = 0): Promise<string | null> {
    if (!query.trim() || this.source === "scenes") return null;
    const key = `${this.source}:${query}`;
    let urls = this.cache.get(key);
    if (!urls) {
      try {
        urls = this.source === "pexels" ? await this.pexels(query) : await this.openverseSearch(query);
      } catch {
        return null;
      }
      if (urls.length) this.cache.set(key, urls);
    }
    return urls.length ? urls[variant % urls.length] : null;
  }

  private async pexels(query: string): Promise<string[]> {
    const res = await this.fetchImpl(
      `https://api.pexels.com/v1/search?${new URLSearchParams({ query, orientation: "portrait", per_page: "15" })}`,
      { headers: { Authorization: this.pexelsKey! }, signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { photos: { src: { portrait?: string; large2x?: string; large?: string } }[] };
    return body.photos.map((p) => p.src.portrait || p.src.large2x || p.src.large).filter((u): u is string => Boolean(u));
  }

  private async openverseSearch(query: string): Promise<string[]> {
    const params = new URLSearchParams({ q: query, license: "cc0,pdm", aspect_ratio: "tall", page_size: "20", mature: "false" });
    const res = await this.fetchImpl(`https://api.openverse.org/v1/images/?${params}`, {
      headers: { "User-Agent": "BlitzMode/0.1 (content tool)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { results?: { url?: string; width?: number; height?: number }[] };
    return (body.results ?? [])
      .filter((r) => r.url && (!r.width || !r.height || r.width >= 600))
      .map((r) => r.url!);
  }
}
