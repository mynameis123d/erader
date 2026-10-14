// End-to-end: the real app against local stand-ins for a store website, Apify and Buffer.
// Exercises analyze → scrape → generate → render (real ffmpeg) → publish, over real HTTP.
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { createCanvas } from "@napi-rs/canvas";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type Handler = (req: http.IncomingMessage, body: string) => { status?: number; type?: string; body: string | Buffer };

function serve(handler: Handler): Promise<{ url: string; close: () => void; hits: { method: string; url: string; body: string }[] }> {
  const hits: { method: string; url: string; body: string }[] = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      hits.push({ method: req.method ?? "GET", url: req.url ?? "", body });
      const out = handler(req, body);
      res.writeHead(out.status ?? 200, { "content-type": out.type ?? "application/json" });
      res.end(out.body);
    });
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({ url: `http://127.0.0.1:${port}`, close: () => server.close(), hits });
    }),
  );
}

function photo(color: string): Buffer {
  const c = createCanvas(600, 900);
  const ctx = c.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 600, 900);
  return c.toBuffer("image/png");
}

let site: Awaited<ReturnType<typeof serve>>;
let apifyFake: Awaited<ReturnType<typeof serve>>;
let bufferFake: Awaited<ReturnType<typeof serve>>;
let api: string;
let closeApp: () => void;
let mediaDir: string;

const TOKEN = "apify_api_" + "x".repeat(30);

beforeAll(async () => {
  const shoe = photo("#c0392b");
  const lifestyle = photo("#2c3e50");
  site = await serve((req) => {
    if (req.url === "/") {
      return {
        type: "text/html",
        body: `<html><head><title>Stride | All-day sneakers</title><meta name="description" content="Sneakers that last from 8am to midnight">
        <meta property="og:image" content="/img/hero.png"></head><body><h1>Walk all day without sore feet</h1>
        <a href="/products/stride-one">Stride One</a><a href="/about">About</a><a href="/cart">Cart</a><img src="/img/life.png" alt="runner at sunset"></body></html>`,
      };
    }
    if (req.url === "/products/stride-one") {
      return {
        type: "text/html",
        body: `<html><head><title>Stride One</title><script type="application/ld+json">{"@type":"Product","name":"Stride One","description":"All-day sneaker","image":"/img/hero.png","offers":{"price":"129","priceCurrency":"USD"}}</script></head><body><h2>Grip that works on the court</h2></body></html>`,
      };
    }
    if (req.url === "/about") return { type: "text/html", body: `<html><head><title>About</title></head><body><h2>Made for people who never sit down</h2></body></html>` };
    if (req.url === "/img/hero.png") return { type: "image/png", body: shoe };
    if (req.url === "/img/life.png") return { type: "image/png", body: lifestyle };
    return { status: 404, body: "{}" };
  });

  apifyFake = await serve((req) => {
    const u = new URL(req.url ?? "/", "http://x");
    if (u.searchParams.get("token") !== TOKEN) return { status: 401, body: "{}" };
    if (u.pathname === "/v2/users/me") return { body: JSON.stringify({ data: { username: "tester", plan: { id: "FREE" } } }) };
    if (u.pathname === "/v2/acts/clockworks~tiktok-scraper/runs") return { body: JSON.stringify({ data: { id: "run123abc", status: "RUNNING", defaultDatasetId: "ds1" } }) };
    if (u.pathname === "/v2/actor-runs/run123abc") return { body: JSON.stringify({ data: { id: "run123abc", status: "SUCCEEDED", defaultDatasetId: "ds1" } }) };
    if (u.pathname === "/v2/datasets/ds1/items")
      return {
        body: JSON.stringify([
          { id: "111", text: "things you learn too late about people #life", playCount: 994100, diggCount: 98400, webVideoUrl: "https://www.tiktok.com/@a/video/111", isSlideshow: true, authorMeta: { name: "a" } },
          { id: "222", text: "advice from someone who's done the shoe shuffle #sneakers", playCount: 1840000, diggCount: 212300, webVideoUrl: "https://www.tiktok.com/@b/video/222", videoMeta: { duration: 14, coverUrl: "https://p16.tiktokcdn.com/c.jpg" }, authorMeta: { name: "b" } },
        ]),
      };
    return { status: 404, body: "{}" };
  });

  bufferFake = await serve((req, body) => {
    if (req.headers.authorization !== "Bearer buffer-key-123456789012345") return { status: 401, body: "{}" };
    const { query } = JSON.parse(body) as { query: string };
    if (query.includes("organizations")) return { body: JSON.stringify({ data: { account: { organizations: [{ id: "org1", name: "Me" }] } } }) };
    if (query.includes("channels("))
      return {
        body: JSON.stringify({
          data: {
            channels: [
              { id: "ch-tt", name: "stride", displayName: "stride", service: "tiktok", avatar: null, isQueuePaused: false },
              { id: "ch-ig", name: "stride", displayName: "stride", service: "instagram", avatar: null, isQueuePaused: false },
              { id: "ch-yt", name: "Stride", displayName: "Stride", service: "youtube", avatar: null, isQueuePaused: false },
            ],
          },
        }),
      };
    if (query.includes("createPost")) return { body: JSON.stringify({ data: { createPost: { post: { id: `post-${Math.random().toString(36).slice(2, 7)}` } } } }) };
    return { status: 400, body: JSON.stringify({ errors: [{ message: "unknown" }] }) };
  });

  process.env.APIFY_API_URL = apifyFake.url;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "blitz-e2e-"));
  mediaDir = path.join(dataDir, "media");
  const { config } = await import("../server/config");
  const { createApp } = await import("../server/app");
  const { app } = createApp({
    ...config,
    dataDir,
    mediaDir,
    webDist: path.join(dataDir, "no-web"),
    bufferApiKey: "buffer-key-123456789012345",
    bufferEndpoint: bufferFake.url,
    bufferOrganizationId: null,
    apifyToken: TOKEN,
    anthropicApiKey: null,
    pexelsApiKey: null,
    pixabayApiKey: null,
    openverse: false,
    publicBaseUrl: "https://blitz.example.com",
    appPassword: null,
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  api = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  closeApp = () => server.close();
}, 30000);

afterAll(() => {
  closeApp?.();
  site?.close();
  apifyFake?.close();
  bufferFake?.close();
});

const j = async <T,>(p: string, init?: { method?: string; body?: unknown }): Promise<T> => {
  const res = await fetch(`${api}${p}`, {
    method: init?.method ?? "GET",
    headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${p} → ${res.status}: ${JSON.stringify(body)}`);
  return body as T;
};

describe("end to end", () => {
  it("tests the connections", async () => {
    const r = await j<Record<string, { ok: boolean; detail: string }>>("/api/integrations/test", { method: "POST" });
    expect(r.buffer.ok).toBe(true);
    expect(r.buffer.detail).toContain("tiktok stride");
    expect(r.apify).toEqual({ ok: true, detail: "Connected as tester (FREE plan). Scraper: clockworks~tiktok-scraper" });
  });

  it("analyzes the website: pages, products and product photos", async () => {
    const { profile } = await j<{ profile: Record<string, unknown> & { site: { pages: string[]; products: { name: string }[]; imageCount: number } } }>(
      "/api/profile/analyze",
      { method: "POST", body: { url: site.url } },
    );
    expect(profile.name).toBe("Stride");
    expect(profile.site.pages).toHaveLength(3);
    expect(profile.site.products[0].name).toBe("Stride One");
    expect(profile.site.imageCount).toBe(2);
    await j("/api/profile", { method: "PUT", body: profile });
    const { clips } = await j<{ clips: { source: string; kind: string; fileUrl: string }[] }>("/api/broll");
    expect(clips.filter((c) => c.source === "website" && c.kind === "image")).toHaveLength(2);
  });

  it("scrapes TikTok through Apify and imports references and clip candidates", async () => {
    const { job } = await j<{ job: { runId: string } }>("/api/scrapes", { method: "POST", body: { hashtags: ["sneakers"] } });
    expect(job.runId).toBe("run123abc");
    let scrapes: { status: string; imported?: { references: number; clips: number } }[] = [];
    for (let i = 0; i < 40 && !scrapes[0]?.imported; i++) {
      await new Promise((r) => setTimeout(r, 100));
      scrapes = (await j<{ scrapes: typeof scrapes }>("/api/scrapes")).scrapes;
    }
    expect(scrapes[0]).toMatchObject({ status: "SUCCEEDED", imported: { references: 2, clips: 1 } });
    const startBody = JSON.parse(apifyFake.hits.find((h) => h.url.includes("/runs"))!.body);
    expect(startBody.hashtags).toEqual(["sneakers"]);
  });

  let slideshowId = "";
  it("generates slideshow remixes of the scraped post, with the site's photos and sources", async () => {
    await j("/api/preferences", {
      method: "PUT",
      body: { voice: "", angles: [], formatWeights: { slideshow: 1, video: 0, green_screen: 0, hook_demo: 0 }, remixPercent: 100, feedTarget: 3 },
    });
    const { cards } = await j<{ cards: { id: string; format: string; referenceId: string; slides: { imageUrl: string | null }[]; sources: { kind: string; url?: string; detail?: string }[] }[] }>(
      "/api/blitz/generate",
      { method: "POST", body: { count: 2 } },
    );
    expect(cards).toHaveLength(2);
    const remix = cards.find((c) => c.referenceId === "tiktok-111");
    expect(remix).toBeTruthy();
    expect(remix!.slides.every((s) => s.imageUrl?.startsWith(site.url))).toBe(true);
    expect(remix!.sources.find((s) => s.kind === "reference")).toMatchObject({ url: "https://www.tiktok.com/@a/video/111" });
    expect(remix!.sources.find((s) => s.kind === "website")?.detail).toContain("/products/stride-one");
    expect(remix!.sources.some((s) => s.kind === "photo" && s.url?.startsWith(site.url))).toBe(true);
    slideshowId = remix!.id;
  });

  it("publishes a slideshow: carousel images to TikTok/Instagram, a rendered Short to YouTube", async () => {
    await j(`/api/cards/${slideshowId}/decision`, { method: "POST", body: { decision: "approve" } });
    const { records } = await j<{ records: { service: string; ok: boolean; mediaType: string; error?: string }[] }>(`/api/cards/${slideshowId}/publish`, {
      method: "POST",
      body: { channelIds: ["ch-tt", "ch-ig", "ch-yt"], mode: "addToQueue" },
    });
    expect(records.map((r) => [r.service, r.ok, r.mediaType])).toEqual([
      ["tiktok", true, "images"],
      ["instagram", true, "images"],
      ["youtube", true, "video"],
    ]);
    const posts = bufferFake.hits.filter((h) => h.body.includes("createPost")).map((h) => JSON.parse(h.body).query as string);
    expect(posts).toHaveLength(3);
    for (const q of posts) {
      for (const m of q.matchAll(/url: "https:\/\/blitz\.example\.com(\/media\/[^"]+)"/g)) {
        expect(fs.existsSync(path.join(mediaDir, m[1].slice("/media/".length)))).toBe(true);
      }
    }
    expect(posts[2]).toMatch(/assets: \[\{ video: \{ url: "https:\/\/blitz\.example\.com\/media\/renders\/.+video\.mp4" \} \}\]/);
    expect(posts[2]).toContain('youtube: { title: "');
  }, 120000);

  it("one-click: approving a Wall of Text card renders it and posts it everywhere", async () => {
    await j("/api/settings/publishing", { method: "PUT", body: { autoPublish: true, channelIds: ["ch-tt", "ch-ig", "ch-yt"], mode: "shareNow", slideshowsAsVideo: false } });
    await j("/api/preferences", {
      method: "PUT",
      body: { voice: "", angles: ["myths"], formatWeights: { slideshow: 0, video: 1, green_screen: 0, hook_demo: 0 }, remixPercent: 0, feedTarget: 3 },
    });
    const { cards } = await j<{ cards: { id: string; format: string; origin: string }[] }>("/api/blitz/generate", { method: "POST", body: { count: 1 } });
    expect(cards[0]).toMatchObject({ format: "video", origin: "original" });
    const before = bufferFake.hits.filter((h) => h.body.includes("createPost")).length;
    const r = await j<{ publishing: boolean }>(`/api/cards/${cards[0].id}/decision`, { method: "POST", body: { decision: "approve" } });
    expect(r.publishing).toBe(true);
    let status = "";
    for (let i = 0; i < 120 && status !== "published"; i++) {
      await new Promise((res) => setTimeout(res, 500));
      status = (await j<{ cards: { id: string; status: string }[] }>("/api/cards?status=published")).cards.find((c) => c.id === cards[0].id)?.status ?? "";
    }
    expect(status).toBe("published");
    const posts = bufferFake.hits.filter((h) => h.body.includes("createPost")).slice(before);
    expect(posts).toHaveLength(3);
    expect(posts.every((p) => p.body.includes("video.mp4") && p.body.includes("shareNow"))).toBe(true);
  }, 120000);
});
