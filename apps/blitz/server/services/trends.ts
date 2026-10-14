import type { ViralReference } from "../../shared/types.js";

// Pulls currently viral TikTok posts through Apify (APIFY_TOKEN) to use as remix
// references: their hook, format and real view/like counts feed "Remixed From".
// Only the post's text and stats are used; the original video is never reused.

type FetchLike = typeof fetch;

/** Shape of the fields we read from Clockworks' TikTok scraper output. Everything is optional. */
interface ApifyTikTokItem {
  authorMeta?: { name?: string };
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

/** Candidate B-roll clips from TikTok. They start as "needs_permission": nothing is downloaded yet. */
export function toBrollCandidates(items: ApifyTikTokItem[], tags: string[]): import("../../shared/types.js").BrollClip[] {
  return items
    .filter((i) => i.webVideoUrl && !i.isSlideshow && (i.videoMeta?.duration ?? 0) >= 3)
    .sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0))
    .map((i) => {
      const caption = (i.text ?? "").replace(/\s+/g, " ").trim();
      const cover = i.videoMeta?.coverUrl ?? i.videoMeta?.originalCoverUrl ?? (Array.isArray(i.covers) ? i.covers[0] : i.covers?.default);
      const hashtags = (caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((h) => h.slice(1).toLowerCase());
      return {
        id: `tt-${i.id ?? Math.random().toString(36).slice(2, 10)}`,
        source: "tiktok" as const,
        title: caption.replace(/#[\p{L}\p{N}_]+/gu, "").trim().slice(0, 90) || "TikTok clip",
        tags: [...new Set([...tags, ...hashtags])].slice(0, 12),
        creator: i.authorMeta?.name,
        sourceUrl: i.webVideoUrl,
        thumbnail: typeof cover === "string" ? cover : undefined,
        duration: i.videoMeta?.duration,
        views: i.playCount,
        likes: i.diggCount,
        rights: "needs_permission" as const,
        fileUrl: null,
        addedAt: new Date().toISOString(),
      };
    });
}

export class ApifyClips {
  constructor(
    private token: string | null,
    private actor = "clockworks~tiktok-scraper",
    private fetchImpl: FetchLike = fetch,
  ) {}

  get enabled() {
    return Boolean(this.token);
  }

  private async run(input: Record<string, unknown>): Promise<ApifyTikTokItem[]> {
    if (!this.token) throw new Error("Set APIFY_TOKEN in apps/blitz/.env");
    const res = await this.fetchImpl(
      `https://api.apify.com/v2/acts/${this.actor}/run-sync-get-dataset-items?token=${encodeURIComponent(this.token)}&timeout=280`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(300000) },
    );
    if (res.status === 401 || res.status === 403) throw new Error("Apify rejected the token");
    if (!res.ok) throw new Error(`Apify HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as ApifyTikTokItem[];
  }

  /** Find popular videos in the category. Returns candidates only; nothing is downloaded. */
  async discover(hashtags: string[], perTag = 12) {
    const tags = hashtags.map((h) => h.replace(/^#/, "").replace(/\s+/g, "").toLowerCase()).filter(Boolean).slice(0, 5);
    if (!tags.length) throw new Error("Add topics to your brand profile, or type a search");
    const items = await this.run({ hashtags: tags, resultsPerPage: perTag, shouldDownloadVideos: false, shouldDownloadCovers: false });
    return toBrollCandidates(items, tags);
  }

  /** Media URL of one post, for a clip whose creator has given permission. */
  async mediaUrl(postUrl: string): Promise<string> {
    const items = await this.run({ postURLs: [postUrl], shouldDownloadVideos: true, shouldDownloadCovers: false });
    const item = items[0] as (ApifyTikTokItem & { mediaUrls?: string[]; videoMeta?: { downloadAddr?: string } }) | undefined;
    const url = item?.mediaUrls?.[0] ?? item?.videoMeta?.downloadAddr;
    if (!url) throw new Error("Apify returned no downloadable video for this post");
    return url;
  }
}
