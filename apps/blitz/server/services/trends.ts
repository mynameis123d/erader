import type { ViralReference } from "../../shared/types.js";

// Pulls currently viral TikTok posts through Apify (APIFY_TOKEN) to use as remix
// references: their hook, format and real view/like counts feed "Remixed From".
// Only the post's text and stats are used; the original video is never reused.

type FetchLike = typeof fetch;

/** Shape of the fields we read from Clockworks' TikTok scraper output. Everything is optional. */
interface ApifyTikTokItem {
  id?: string;
  text?: string;
  playCount?: number;
  diggCount?: number;
  shareCount?: number;
  webVideoUrl?: string;
  isSlideshow?: boolean;
  slideshowImageLinks?: unknown[];
  videoMeta?: { duration?: number; coverUrl?: string; originalCoverUrl?: string };
  covers?: { default?: string } | string[];
}

export class TrendScout {
  constructor(
    private token: string | null,
    private actor = "clockworks~tiktok-scraper",
    private fetchImpl: FetchLike = fetch,
  ) {}

  get enabled() {
    return Boolean(this.token);
  }

  /** Top posts by views for the given hashtags (without '#'). */
  async trending(hashtags: string[], perTag = 10): Promise<ViralReference[]> {
    if (!this.token) throw new Error("Set APIFY_TOKEN in apps/blitz/.env to pull trending TikToks");
    const tags = hashtags.map((h) => h.replace(/^#/, "").replace(/\s+/g, "").toLowerCase()).filter(Boolean).slice(0, 5);
    if (!tags.length) throw new Error("Add some topics to your brand profile first");
    const res = await this.fetchImpl(
      `https://api.apify.com/v2/acts/${this.actor}/run-sync-get-dataset-items?token=${encodeURIComponent(this.token)}&timeout=240`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hashtags: tags,
          resultsPerPage: perTag,
          shouldDownloadVideos: false,
          shouldDownloadCovers: false,
          shouldDownloadSubtitles: false,
          shouldDownloadSlideshowImages: false,
        }),
        signal: AbortSignal.timeout(300000),
      },
    );
    if (res.status === 401 || res.status === 403) throw new Error("Apify rejected the token");
    if (!res.ok) throw new Error(`Apify HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const items = (await res.json()) as ApifyTikTokItem[];
    return toReferences(items);
  }
}

export function toReferences(items: ApifyTikTokItem[], limit = 15): ViralReference[] {
  const seen = new Set<string>();
  return items
    .filter((i) => i.text && i.text.trim().length > 8 && (i.playCount ?? 0) > 0)
    .sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0))
    .filter((i) => {
      const key = i.webVideoUrl ?? i.id ?? i.text!;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map((i): ViralReference => {
      const caption = i.text!.replace(/#[\p{L}\p{N}_]+/gu, "").replace(/\s+/g, " ").trim();
      const hook = caption.split(/(?<=[.!?])\s|\n/)[0].slice(0, 120) || caption.slice(0, 120);
      const slideshow = Boolean(i.isSlideshow || (i.slideshowImageLinks && i.slideshowImageLinks.length));
      const cover = i.videoMeta?.coverUrl ?? i.videoMeta?.originalCoverUrl ?? (Array.isArray(i.covers) ? i.covers[0] : i.covers?.default);
      return {
        id: `tiktok-${i.id ?? Math.random().toString(36).slice(2, 10)}`,
        format: slideshow ? "slideshow" : "video",
        platform: "tiktok",
        isTemplate: false,
        hook,
        slides: slideshow ? [hook] : [caption],
        structure: slideshow
          ? "Trending TikTok photo slideshow (hook taken from the caption)."
          : "Trending TikTok video with on-screen text (caption used as the text).",
        whyItWorks: `Currently trending: ${(i.playCount ?? 0).toLocaleString("en-US")} views, ${(i.diggCount ?? 0).toLocaleString("en-US")} likes.`,
        imageQueries: [],
        sourceUrl: i.webVideoUrl,
        thumbnail: typeof cover === "string" ? cover : undefined,
        likes: i.diggCount,
        views: i.playCount,
      };
    });
}
