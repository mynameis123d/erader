// Slide imagery: Pexels when a key is configured, otherwise a gradient so the
// card still renders and publishes.

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

interface PexelsPhoto {
  src: { large2x: string; portrait: string; large: string };
}

export class ImageSearch {
  private cache = new Map<string, string[]>();

  constructor(private pexelsKey: string | null) {}

  get enabled() {
    return Boolean(this.pexelsKey);
  }

  /** Returns a portrait photo URL for the query, or null when unavailable. */
  async find(query: string, variant = 0): Promise<string | null> {
    if (!this.pexelsKey || !query.trim()) return null;
    let urls = this.cache.get(query);
    if (!urls) {
      try {
        const res = await fetch(
          `https://api.pexels.com/v1/search?${new URLSearchParams({ query, orientation: "portrait", per_page: "15" })}`,
          { headers: { Authorization: this.pexelsKey } },
        );
        if (!res.ok) return null;
        const body = (await res.json()) as { photos: PexelsPhoto[] };
        urls = body.photos.map((p) => p.src.portrait || p.src.large2x || p.src.large);
        this.cache.set(query, urls);
      } catch {
        return null;
      }
    }
    return urls.length ? urls[variant % urls.length] : null;
  }
}
