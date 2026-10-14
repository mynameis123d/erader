import { describe, expect, it, vi } from "vitest";
import type { ProductProfile } from "../shared/types";
import { templateRemix } from "../server/services/generator";
import { WALL_OF_TEXT_REFERENCES } from "../server/services/library";
import { planMedia } from "../server/services/publisher";
import { readingSeconds } from "../server/services/render";
import { toReferences } from "../server/services/trends";
import { VideoSearch } from "../server/services/videos";

const json = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));

describe("VideoSearch", () => {
  it("picks a ~1080p export file and a lighter preview from Pexels", async () => {
    const f = json({
      videos: [
        {
          id: 1, url: "https://pexels.com/video/1", image: "https://img/1.jpg", duration: 12, width: 1080, height: 1920, user: { name: "Ana" },
          video_files: [
            { link: "https://v/360.mp4", width: 360, height: 640, quality: "sd", file_type: "video/mp4" },
            { link: "https://v/540.mp4", width: 540, height: 960, quality: "sd", file_type: "video/mp4" },
            { link: "https://v/1080.mp4", width: 1080, height: 1920, quality: "hd", file_type: "video/mp4" },
            { link: "https://v/4k.mp4", width: 2160, height: 3840, quality: "uhd", file_type: "video/mp4" },
            { link: "https://v/hls", width: null, height: null, quality: "hls", file_type: "video/hls" },
          ],
        },
        { id: 2, url: "u", image: "i", duration: 2, width: 1, height: 1, video_files: [] },
      ],
    });
    const vs = new VideoSearch("key", null, f as unknown as typeof fetch);
    const v = await vs.find("woman running sunset");
    expect(v).toMatchObject({ source: "pexels", url: "https://v/1080.mp4", previewUrl: "https://v/540.mp4", credit: "Ana on Pexels", query: "woman running sunset" });
    const url = String((f.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("api.pexels.com/videos/search");
    expect(url).toContain("orientation=portrait");
  });

  it("falls back to Pixabay and returns null with no keys", async () => {
    const f = json({ hits: [{ id: 5, pageURL: "p", duration: 9, user: "bo", videos: { large: { url: "https://l.mp4", width: 1920, height: 1080 }, medium: { url: "m", width: 1, height: 1, thumbnail: "t" }, small: { url: "https://s.mp4", width: 960, height: 540 }, tiny: { url: "", width: 0, height: 0 } } }] });
    const v = await new VideoSearch(null, "pk", f as unknown as typeof fetch).find("city night");
    expect(v).toMatchObject({ source: "pixabay", url: "https://l.mp4", previewUrl: "https://s.mp4" });
    expect(await new VideoSearch(null, null).find("x")).toBeNull();
  });
});

describe("wall of text", () => {
  const profile = { name: "Stride", oneLiner: "Sneakers", audience: "a", keywords: ["sneakers"], benefits: [] } as unknown as ProductProfile;
  it("template remix keeps one block of text with a video query", () => {
    const d = templateRemix(profile, WALL_OF_TEXT_REFERENCES[0]);
    expect(d.slides).toHaveLength(1);
    expect(d.slides[0].text).toContain("sneakers shuffle");
    expect(d.slides[0].imageQuery.length).toBeGreaterThan(3);
  });
  it("is published as video everywhere and stays 7-15 s", () => {
    expect(planMedia("tiktok", false, "video")).toEqual({ kind: "video", aspect: "9:16" });
    expect(planMedia("instagram", false, "video").kind).toBe("video");
    expect(readingSeconds("short text")).toBe(7);
    expect(readingSeconds("word ".repeat(200))).toBe(15);
  });
});

describe("Apify trends", () => {
  it("turns scraper items into references sorted by views", () => {
    const refs = toReferences([
      { id: "1", text: "pov: you finally found shoes that work #fyp #shoes", playCount: 500, diggCount: 50, webVideoUrl: "https://tiktok.com/1" },
      { id: "2", text: "things you learn too late about people", playCount: 994100, diggCount: 98400, isSlideshow: true, videoMeta: { coverUrl: "https://c/2.jpg" } },
      { id: "3", text: "", playCount: 10 },
    ]);
    expect(refs.map((r) => r.id)).toEqual(["tiktok-2", "tiktok-1"]);
    expect(refs[0]).toMatchObject({ format: "slideshow", views: 994100, likes: 98400, thumbnail: "https://c/2.jpg", isTemplate: false });
    expect(refs[1]).toMatchObject({ format: "video", hook: "pov: you finally found shoes that work" });
  });
});

import { matchClip } from "../server/services/broll";
import type { BrollClip } from "../shared/types";

describe("B-roll library", () => {
  const clip = (id: string, rights: BrollClip["rights"], tags: string[], fileUrl: string | null = `/media/broll/${id}.mp4`): BrollClip => ({
    id, source: "tiktok", title: id, tags, rights, fileUrl, addedAt: "",
  });
  it("only matches clips that are owned, licensed or cleared and downloaded", () => {
    const clips = [
      clip("pending", "needs_permission", ["running", "sunset"]),
      clip("declined", "declined", ["running", "sunset"]),
      clip("notyet", "cleared", ["running", "sunset"], null),
      clip("ok", "cleared", ["running"]),
    ];
    expect(matchClip(clips, "woman running sunset path")?.id).toBe("ok");
    expect(matchClip(clips, "city night")).toBeNull();
  });
});

import { DEFAULT_PREFERENCES } from "../shared/types";
import { buildCard, planBatch } from "../server/services/generator";
import { ContentAI } from "../server/services/ai";
import { ImageSearch } from "../server/services/images";
import { ApifyClient } from "../server/services/trends";

describe("Blitz planning", () => {
  it("follows format weights and the remix percentage", () => {
    const prefs = { ...DEFAULT_PREFERENCES, formatWeights: { slideshow: 0, video: 0, green_screen: 1, hook_demo: 0 }, remixPercent: 0 };
    const plan = planBatch(prefs, 20);
    expect(plan.every((p) => p.format === "green_screen" && p.origin === "original")).toBe(true);
    const all = planBatch({ ...DEFAULT_PREFERENCES, remixPercent: 100 }, 200);
    expect(all.every((p) => p.origin === "remix")).toBe(true);
    expect(new Set(all.map((p) => p.format)).size).toBe(4);
  });

  const profile = { name: "Stride", oneLiner: "Sneakers", audience: "a", tone: "fun", keywords: ["sneakers"], benefits: ["all day comfort"], painPoints: ["sore feet"] } as never;
  const deps = { ai: new ContentAI(null), images: new ImageSearch(null, false), videos: new VideoSearch(null, null), library: [] as BrollClip[] };

  it("builds every format as an original idea without any keys", async () => {
    for (const format of ["slideshow", "video", "green_screen", "hook_demo"] as const) {
      const card = await buildCard({ profile, format, angle: "all day comfort" }, deps);
      expect(card.format).toBe(format);
      expect(card.origin).toBe("original");
      expect(card.referenceId).toBe("original");
      expect(card.slides[0].text.length).toBeGreaterThan(5);
      if (format === "hook_demo" || format === "green_screen") expect(card.slides.length).toBeLessThanOrEqual(2);
    }
  });

  it("uses a cleared Media Bank demo clip for Hook + Demo", async () => {
    const library: BrollClip[] = [{ id: "d1", kind: "video", source: "upload", title: "app demo screen recording", tags: ["demo"], rights: "owned", fileUrl: "/media/broll/d1.mp4", addedAt: "" }];
    const card = await buildCard({ profile, format: "hook_demo", angle: "x" }, { ...deps, library });
    expect(card.demoVideo?.url).toBe("/media/broll/d1.mp4");
  });
});

describe("ApifyClient", () => {
  it("starts a run, polls it and reads the dataset", async () => {
    const calls: string[] = [];
    let polls = 0;
    const f = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${url.replace(/token=[^&]+/, "token=T")}`);
      if (url.includes("/acts/")) return new Response(JSON.stringify({ data: { id: "run1", status: "RUNNING", defaultDatasetId: "ds1" } }));
      if (url.includes("/actor-runs/run1")) return new Response(JSON.stringify({ data: { id: "run1", status: polls++ ? "SUCCEEDED" : "RUNNING", defaultDatasetId: "ds1" } }));
      if (url.includes("/datasets/ds1/items")) return new Response(JSON.stringify([{ id: "9", text: "hello world post", playCount: 5 }]));
      return new Response("{}", { status: 404 });
    });
    const client = new ApifyClient("T", "clockworks~tiktok-scraper", f as unknown as typeof fetch);
    const run = await client.startRun(ApifyClient.hashtagInput(["#Running Shoes"]));
    const { items } = await client.waitForItems(run.id, 5000, 1);
    expect(items).toHaveLength(1);
    expect(calls[0]).toBe("POST https://api.apify.com/v2/acts/clockworks~tiktok-scraper/runs?token=T");
    expect(JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).hashtags).toEqual(["runningshoes"]);
    expect(calls.at(-1)).toContain("/datasets/ds1/items?clean=true&format=json");
  });
});
