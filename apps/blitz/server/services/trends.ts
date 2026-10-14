import type { BrollClip, ViralReference } from "../../shared/types.js";

// Apify TikTok scraping (APIFY_TOKEN), using Apify's run API:
//   POST /v2/acts/{actor}/runs            start a run
//   GET  /v2/actor-runs/{runId}            run status + defaultDatasetId
//   GET  /v2/datasets/{datasetId}/items    scraped posts
//   POST /v2/actor-runs/{runId}/abort      stop a run
// Scraped posts become (1) remix references: hook, format and real stats, and
// (2) Media Bank candidates. A candidate's video is only downloaded once the
// creator has given permission (see the B-roll routes in app.ts).

type FetchLike = typeof fetch;
const API = (process.env.APIFY_API_URL ?? "https://api.apify.com").replace(/\/+$/, "") + "/v2";

/** Fields we read from Clockworks' TikTok scraper output. Everything is optional. */
export interface ApifyTikTokItem {
  id?: string;
  text?: string;
  playCount?: number;
  diggCount?: number;
  shareCount?: number;
  commentCount?: number;
  webVideoUrl?: string;
  isSlideshow?: boolean;
  slideshowImageLinks?: unknown[];
  mediaUrls?: string[];
  authorMeta?: { name?: string; nickName?: string };
  videoMeta?: { duration?: number; coverUrl?: string; originalCoverUrl?: string; downloadAddr?: string };
  covers?: { default?: string } | string[];
  hashtags?: { name?: string }[];
}

export interface ApifyRun {
  id: string;
  actId?: string;
  status: "READY" | "RUNNING" | "SUCCEEDED" | "FAILED" | "TIMING-OUT" | "TIMED-OUT" | "ABORTING" | "ABORTED";
  defaultDatasetId: string;
  startedAt?: string;
  finishedAt?: string | null;
  usageTotalUsd?: number;
}

export const RUN_DONE = new Set(["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"]);

export class ApifyClient {
  constructor(
    private token: string | null,
    readonly actor = "clockworks~tiktok-scraper",
    private fetchImpl: FetchLike = fetch,
  ) {}

  get enabled() {
    return Boolean(this.token);
  }

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this.token) throw new Error("Add your Apify token in Settings → API keys");
    const sep = path.includes("?") ? "&" : "?";
    let res: Response;
    try {
      res = await this.fetchImpl(`${API}${path}${sep}token=${encodeURIComponent(this.token)}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...init?.headers },
        signal: AbortSignal.timeout(60000),
      });
    } catch (e) {
      throw new Error(`Could not reach Apify: ${(e as Error).message}`);
    }
    if (res.status === 401 || res.status === 403) throw new Error("Apify rejected the token");
    if (!res.ok) throw new Error(`Apify HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as T;
  }

  /** The account behind the token. Used by the Integrations "Test" button. */
  async me(): Promise<{ username: string; plan?: string }> {
    const { data } = await this.call<{ data: { username: string; plan?: { id?: string } } }>("/users/me");
    return { username: data.username, plan: data.plan?.id };
  }

  async startRun(input: Record<string, unknown>): Promise<ApifyRun> {
    const { data } = await this.call<{ data: ApifyRun }>(`/acts/${this.actor}/runs`, { method: "POST", body: JSON.stringify(input) });
    return data;
  }

  async getRun(runId: string): Promise<ApifyRun> {
    const { data } = await this.call<{ data: ApifyRun }>(`/actor-runs/${encodeURIComponent(runId)}`);
    return data;
  }

  async abortRun(runId: string): Promise<ApifyRun> {
    const { data } = await this.call<{ data: ApifyRun }>(`/actor-runs/${encodeURIComponent(runId)}/abort`, { method: "POST" });
    return data;
  }

  async datasetItems(datasetId: string, limit = 200): Promise<ApifyTikTokItem[]> {
    return this.call<ApifyTikTokItem[]>(`/datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json&limit=${limit}`);
  }

  /** Poll a run until it finishes, then return its items. */
  async waitForItems(runId: string, timeoutMs = 10 * 60_000, pollMs = 5000): Promise<{ run: ApifyRun; items: ApifyTikTokItem[] }> {
    const deadline = Date.now() + timeoutMs;
    let run = await this.getRun(runId);
    while (!RUN_DONE.has(run.status)) {
      if (Date.now() > deadline) throw new Error(`Apify run ${runId} is still ${run.status}`);
      await new Promise((r) => setTimeout(r, pollMs));
      run = await this.getRun(runId);
    }
    if (run.status !== "SUCCEEDED") throw new Error(`Apify run ${runId} ended as ${run.status}`);
    return { run, items: await this.datasetItems(run.defaultDatasetId) };
  }

  /**
   * Read a web page through Apify's RAG Web Browser (real Chrome), for sites that block
   * plain requests or render their content with JavaScript.
   */
  async readWebsite(url: string): Promise<{ url: string; title: string; description: string; markdown: string }> {
    if (!this.token) throw new Error("Add your Apify token in Settings → API keys to read JavaScript-heavy websites");
    const items = await this.call<{ metadata?: { url?: string; title?: string; description?: string }; markdown?: string; text?: string }[]>(
      `/acts/apify~rag-web-browser/run-sync-get-dataset-items?timeout=120`,
      { method: "POST", body: JSON.stringify({ query: url, maxResults: 1, outputFormats: ["markdown"], scrapingTool: "browser-playwright" }) },
    );
    const item = items[0];
    if (!item?.markdown && !item?.text) throw new Error("Apify couldn't read that page");
    return {
      url: item.metadata?.url ?? url,
      title: item.metadata?.title ?? "",
      description: item.metadata?.description ?? "",
      markdown: (item.markdown ?? item.text ?? "").slice(0, 40000),
    };
  }

  /** Scraper input for hashtag search. */
  static hashtagInput(hashtags: string[], perTag = 15) {
    return {
      hashtags: hashtags.map((h) => h.replace(/^#/, "").replace(/\s+/g, "").toLowerCase()).filter(Boolean).slice(0, 6),
      resultsPerPage: perTag,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSubtitles: false,
      shouldDownloadSlideshowImages: false,
    };
  }

  /** Media URL of one post, for a clip whose creator has given permission. */
  async mediaUrl(postUrl: string): Promise<string> {
    const run = await this.startRun({ postURLs: [postUrl], shouldDownloadVideos: true, shouldDownloadCovers: false });
    const { items } = await this.waitForItems(run.id, 5 * 60_000);
    const item = items[0];
    const url = item?.mediaUrls?.[0] ?? item?.videoMeta?.downloadAddr;
    if (!url) throw new Error("Apify returned no downloadable video for this post");
    return url;
  }
}

const coverOf = (i: ApifyTikTokItem) => {
  const c = i.videoMeta?.coverUrl ?? i.videoMeta?.originalCoverUrl ?? (Array.isArray(i.covers) ? i.covers[0] : i.covers?.default);
  return typeof c === "string" ? c : undefined;
};
const isSlideshow = (i: ApifyTikTokItem) => Boolean(i.isSlideshow || (i.slideshowImageLinks && i.slideshowImageLinks.length));

/** Top posts as remix references (hook + format + real stats). */
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
      const slideshow = isSlideshow(i);
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
        thumbnail: coverOf(i),
        likes: i.diggCount,
        views: i.playCount,
      };
    });
}

/** Video posts as Media Bank candidates. They start as "needs_permission": nothing is downloaded yet. */
export function toBrollCandidates(items: ApifyTikTokItem[], tags: string[]): BrollClip[] {
  return items
    .filter((i) => i.webVideoUrl && !isSlideshow(i) && (i.videoMeta?.duration ?? 0) >= 3)
    .sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0))
    .map((i) => {
      const caption = (i.text ?? "").replace(/\s+/g, " ").trim();
      const hashtags = [
        ...(caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((h) => h.slice(1).toLowerCase()),
        ...(i.hashtags ?? []).map((h) => (h.name ?? "").toLowerCase()).filter(Boolean),
      ];
      return {
        id: `tt-${i.id ?? Math.random().toString(36).slice(2, 10)}`,
        kind: "video" as const,
        source: "tiktok" as const,
        title: caption.replace(/#[\p{L}\p{N}_]+/gu, "").trim().slice(0, 90) || "TikTok clip",
        tags: [...new Set([...tags, ...hashtags])].slice(0, 12),
        creator: i.authorMeta?.name,
        sourceUrl: i.webVideoUrl,
        thumbnail: coverOf(i),
        duration: i.videoMeta?.duration,
        views: i.playCount,
        likes: i.diggCount,
        rights: "needs_permission" as const,
        fileUrl: null,
        addedAt: new Date().toISOString(),
      };
    });
}
