import { describe, expect, it, vi } from "vitest";
import type { BlitzCard, BufferChannel } from "../shared/types";
import type { BufferClient } from "../server/services/buffer";
import { planMedia, postText, publishCard } from "../server/services/publisher";

const card: BlitzCard = {
  id: "card1",
  format: "slideshow",
  theme: "One Shoe, Full Day",
  referenceId: "one-thing-full-day",
  slides: [
    { id: "s1", text: "Hook", imageQuery: "q", imageUrl: null, background: ["#000", "#111"], textY: 0.4 },
    { id: "s2", text: "Two", imageQuery: "q", imageUrl: null, background: ["#000", "#111"], textY: 0.4 },
  ],
  caption: "Caption",
  hashtags: ["sneakers", "ootd"],
  why: "",
  status: "approved",
  generator: "template",
  createdAt: "",
  publishes: [],
};

const ch = (id: string, service: string): BufferChannel => ({ id, service, name: id, displayName: null, avatar: null, isQueuePaused: false });

describe("planMedia", () => {
  it("always sends video to YouTube and carousels to TikTok/Instagram by default", () => {
    expect(planMedia("youtube", false)).toEqual({ kind: "video", aspect: "9:16" });
    expect(planMedia("tiktok", false)).toEqual({ kind: "images", aspect: "9:16" });
    expect(planMedia("instagram", false)).toEqual({ kind: "images", aspect: "4:5" });
    expect(planMedia("instagram", true)).toEqual({ kind: "video", aspect: "9:16" });
  });
});

describe("publishCard", () => {
  it("renders once per format and sends absolute media URLs to each channel", async () => {
    const render = vi.fn(async (_c: BlitzCard, aspect: string, video: boolean) => ({
      images: [`/media/r/${aspect}/1.png`],
      video: video ? `/media/r/${aspect}/v.mp4` : undefined,
    }));
    const createPost = vi.fn(async () => ({ id: "post" }));
    const records = await publishCard(
      card,
      { channelIds: ["tt", "yt", "ig", "missing"], mode: "addToQueue" },
      {
        buffer: { createPost } as unknown as BufferClient,
        channels: [ch("tt", "tiktok"), ch("yt", "youtube"), ch("ig", "instagram")],
        publicBaseUrl: "https://blitz.example.com",
        mediaDir: "/tmp",
        render: render as never,
      },
    );
    expect(records.map((r) => r.ok)).toEqual([true, true, true, false]);
    expect(records[3].error).toMatch(/not found/);
    expect(render).toHaveBeenCalledTimes(3); // 9:16 images, 9:16 video, 4:5 images
    const calls = createPost.mock.calls.map((c) => (c as unknown[])[0] as Record<string, unknown>);
    expect(calls[0]).toMatchObject({ channelId: "tt", images: ["https://blitz.example.com/media/r/9:16/1.png"], text: postText(card) });
    expect(calls[1]).toMatchObject({ channelId: "yt", video: "https://blitz.example.com/media/r/9:16/v.mp4", title: "Hook" });
    expect(calls[2]).toMatchObject({ channelId: "ig", images: ["https://blitz.example.com/media/r/4:5/1.png"] });
  });

  it("records Buffer failures per channel without stopping the others", async () => {
    const createPost = vi.fn().mockRejectedValueOnce(new Error("TikTok token expired")).mockResolvedValueOnce({ id: "ok" });
    const records = await publishCard(
      card,
      { channelIds: ["tt", "ig"], mode: "shareNow" },
      {
        buffer: { createPost } as unknown as BufferClient,
        channels: [ch("tt", "tiktok"), ch("ig", "instagram")],
        publicBaseUrl: "https://x",
        mediaDir: "/tmp",
        render: (async () => ({ images: ["/media/a.png"] })) as never,
      },
    );
    expect(records[0]).toMatchObject({ ok: false, error: "TikTok token expired" });
    expect(records[1]).toMatchObject({ ok: true, bufferPostId: "ok" });
  });
});

describe("postText", () => {
  it("appends hashtags", () => expect(postText(card)).toBe("Caption\n\n#sneakers #ootd"));
});
