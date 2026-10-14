import type { CardVideo } from "../../shared/types.js";

// Stock background footage that matches the post's text. Both sources license
// clips for free commercial use, so posts are safe to publish.
//   Pexels  (PEXELS_API_KEY)  https://www.pexels.com/api/  preferred
//   Pixabay (PIXABAY_API_KEY) https://pixabay.com/api/docs/

type FetchLike = typeof fetch;

interface PexelsVideo {
  id: number;
  url: string;
  image: string;
  duration: number;
  width: number;
  height: number;
  user?: { name?: string };
  video_files: { link: string; width: number | null; height: number | null; quality: string | null; file_type: string }[];
}

interface PixabayVideo {
  id: number;
  pageURL: string;
  duration: number;
  user: string;
  videos: Record<"large" | "medium" | "small" | "tiny", { url: string; width: number; height: number; thumbnail?: string }>;
}

export class VideoSearch {
  private cache = new Map<string, CardVideo[]>();

  constructor(
    private pexelsKey: string | null,
    private pixabayKey: string | null,
    private fetchImpl: FetchLike = fetch,
  ) {}

  get enabled() {
    return Boolean(this.pexelsKey || this.pixabayKey);
  }

  get source(): "pexels" | "pixabay" | null {
    return this.pexelsKey ? "pexels" : this.pixabayKey ? "pixabay" : null;
  }

  /** Run one search without swallowing errors, for the connection test. */
  async probe(query = "city street walking"): Promise<CardVideo> {
    const list = this.pexelsKey ? await this.pexels(query) : await this.pixabay(query);
    if (!list.length) throw new Error("The key works but the search returned no clips");
    return list[0];
  }

  /** A vertical-friendly clip for the query (variant picks among results), or null. */
  async find(query: string, variant = 0): Promise<CardVideo | null> {
    const q = query.trim();
    if (!q || !this.enabled) return null;
    let list = this.cache.get(q);
    if (!list) {
      list = [];
      try {
        if (this.pexelsKey) list = await this.pexels(q);
        if (!list.length && this.pixabayKey) list = await this.pixabay(q);
      } catch (e) {
        console.warn(`[videos] search failed for "${q}":`, (e as Error).message);
      }
      if (list.length) this.cache.set(q, list);
    }
    return list.length ? { ...list[variant % list.length], query: q } : null;
  }

  private async pexels(query: string): Promise<CardVideo[]> {
    const params = new URLSearchParams({ query, orientation: "portrait", size: "medium", per_page: "20" });
    const res = await this.fetchImpl(`https://api.pexels.com/videos/search?${params}`, {
      headers: { Authorization: this.pexelsKey! },
      signal: AbortSignal.timeout(12000),
    }).catch((e: Error) => {
      throw new Error(`Could not reach Pexels: ${e.message}`);
    });
    if (res.status === 401 || res.status === 403) throw new Error("Pexels rejected the key");
    if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);
    const body = (await res.json()) as { videos?: PexelsVideo[] };
    return (body.videos ?? [])
      .filter((v) => v.duration >= 4)
      .map((v): CardVideo | null => {
        const mp4 = v.video_files.filter((f) => f.file_type === "video/mp4" && f.width && f.height);
        // Export: smallest file that is at least 1080 wide (or the largest available).
        const big = [...mp4].sort((a, b) => a.width! - b.width!);
        const render = big.find((f) => f.width! >= 1080 && f.width! <= 2160) ?? big[big.length - 1];
        // Preview: a light file around 540-720 wide.
        const preview = big.find((f) => f.width! >= 500) ?? render;
        if (!render) return null;
        return {
          query,
          source: "pexels",
          url: render.link,
          previewUrl: preview.link,
          poster: v.image,
          duration: v.duration,
          width: render.width!,
          height: render.height!,
          credit: v.user?.name ? `${v.user.name} on Pexels` : "Pexels",
          pageUrl: v.url,
        };
      })
      .filter((v): v is CardVideo => v !== null);
  }

  private async pixabay(query: string): Promise<CardVideo[]> {
    const params = new URLSearchParams({ key: this.pixabayKey!, q: query, per_page: "20", safesearch: "true" });
    const res = await this.fetchImpl(`https://pixabay.com/api/videos/?${params}`, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`Pixabay HTTP ${res.status}`);
    const body = (await res.json()) as { hits?: PixabayVideo[] };
    return (body.hits ?? [])
      .filter((v) => v.duration >= 4 && v.videos.large?.url)
      .map((v) => {
        const render = v.videos.large.url ? v.videos.large : v.videos.medium;
        const preview = v.videos.small?.url ? v.videos.small : render;
        return {
          query,
          source: "pixabay" as const,
          url: render.url,
          previewUrl: preview.url,
          poster: v.videos.medium?.thumbnail ?? v.videos.large.thumbnail ?? null,
          duration: v.duration,
          width: render.width,
          height: render.height,
          credit: `${v.user} on Pixabay`,
          pageUrl: v.pageURL,
        };
      });
  }
}
