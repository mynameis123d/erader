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
