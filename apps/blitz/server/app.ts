import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { MOODS, type Mood } from "../shared/scene.js";
import type { BlitzCard, BufferChannel, IntegrationsStatus, ProductProfile, ViralReference } from "../shared/types.js";
import { config as defaultConfig } from "./config.js";
import { Db } from "./db.js";
import { ContentAI } from "./services/ai.js";
import { BufferClient, BufferError } from "./services/buffer.js";
import { buildCard } from "./services/generator.js";
import { ImageSearch } from "./services/images.js";
import { allReferences, pickReferences } from "./services/library.js";
import { publishCard } from "./services/publisher.js";
import { renderCard } from "./services/render.js";
import { TrendScout } from "./services/trends.js";
import { VideoSearch } from "./services/videos.js";
import { fetchPage, heuristicProfile, pageForPrompt } from "./services/website.js";

type Config = typeof defaultConfig;

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const ProfileBody = z.object({
  url: z.string(),
  name: z.string().min(1),
  oneLiner: z.string(),
  audience: z.string(),
  tone: z.string(),
  painPoints: z.array(z.string()),
  benefits: z.array(z.string()),
  keywords: z.array(z.string()),
});

const SlideBody = z.object({
  id: z.string(),
  text: z.string().max(400),
  imageQuery: z.string(),
  imageUrl: z.string().nullable(),
  background: z.tuple([z.string(), z.string()]),
  scene: z.enum(MOODS as [Mood, ...Mood[]]).nullable().optional(),
  textY: z.number().min(0).max(1),
});

const CardPatch = z.object({
  theme: z.string().optional(),
  slides: z.array(SlideBody).min(1).max(35).optional(),
  video: z
    .object({
      query: z.string(),
      source: z.enum(["pexels", "pixabay"]),
      url: z.string().url(),
      previewUrl: z.string().url(),
      poster: z.string().nullable(),
      duration: z.number(),
      width: z.number(),
      height: z.number(),
      credit: z.string(),
      pageUrl: z.string(),
    })
    .nullable()
    .optional(),
  caption: z.string().max(2200).optional(),
  hashtags: z.array(z.string()).optional(),
});

const PublishBody = z.object({
  channelIds: z.array(z.string()).min(1),
  mode: z.enum(["addToQueue", "shareNow", "customScheduled"]),
  dueAt: z.string().datetime({ offset: true }).optional(),
  asVideo: z.boolean().optional(),
});

const ReferenceBody = z.object({
  hook: z.string().min(1),
  slides: z.array(z.string()).min(1),
  structure: z.string().default("Imported post"),
  whyItWorks: z.string().default("Imported from a post that is performing well."),
  imageQueries: z.array(z.string()).default([]),
  platform: z.enum(["tiktok", "instagram", "youtube"]).default("tiktok"),
  sourceUrl: z.string().url().optional(),
  likes: z.number().int().nonnegative().optional(),
  views: z.number().int().nonnegative().optional(),
});

export function createApp(cfg: Config = defaultConfig) {
  fs.mkdirSync(cfg.mediaDir, { recursive: true });
  const db = new Db(path.join(cfg.dataDir, "db.json"));
  const ai = new ContentAI(cfg.anthropicApiKey);
  const images = new ImageSearch(cfg.pexelsApiKey, cfg.openverse);
  const videos = new VideoSearch(cfg.pexelsApiKey, cfg.pixabayApiKey);
  const trends = new TrendScout(cfg.apifyToken, cfg.apifyTikTokActor);
  const buffer = cfg.bufferApiKey ? new BufferClient(cfg.bufferApiKey, cfg.bufferEndpoint) : null;

  let channelCache: { at: number; orgId: string; channels: BufferChannel[] } | null = null;
  async function bufferChannels(force = false) {
    if (!buffer) throw new HttpError(400, "BUFFER_API_KEY is not set in apps/blitz/.env");
    if (!force && channelCache && Date.now() - channelCache.at < 60_000) return channelCache;
    let orgId = cfg.bufferOrganizationId;
    if (!orgId) {
      const orgs = await buffer.organizations();
      if (!orgs.length) throw new BufferError("No Buffer organization found for this API key");
      orgId = orgs[0].id;
    }
    channelCache = { at: Date.now(), orgId, channels: await buffer.channels(orgId) };
    return channelCache;
  }

  async function publish(card: BlitzCard, body: z.infer<typeof PublishBody>) {
    if (!cfg.publicBaseUrl)
      throw new HttpError(
        400,
        "PUBLIC_BASE_URL is not set. Buffer downloads media by URL, so this server must be reachable from the internet (deploy it or run a tunnel) and PUBLIC_BASE_URL must point at it.",
      );
    const { channels } = await bufferChannels();
    const records = await publishCard(card, body, { buffer: buffer!, channels, publicBaseUrl: cfg.publicBaseUrl, mediaDir: cfg.mediaDir });
    db.update(() => {
      card.publishes.push(...records);
      if (records.some((r) => r.ok)) card.status = "published";
    });
    return records;
  }

  /** One-click mode: an approved card goes straight to the chosen Buffer channels. */
  function autoPublish(card: BlitzCard): boolean {
    const s = db.state.publishing;
    if (!s.autoPublish || !s.channelIds.length || !buffer) return false;
    publish(card, { channelIds: s.channelIds, mode: s.mode, asVideo: s.slideshowsAsVideo }).catch((e: Error) => {
      db.update(() =>
        card.publishes.push(
          ...s.channelIds.map((channelId) => ({ channelId, service: "unknown", ok: false, error: e.message, mediaType: "video" as const, at: new Date().toISOString() })),
        ),
      );
    });
    return true;
  }

  const references = () => allReferences(db.state.references);
  const findRef = (id: string) => references().find((r) => r.id === id);
  const requireProfile = (): ProductProfile => {
    if (!db.state.profile) throw new HttpError(409, "Set up your product profile first");
    return db.state.profile;
  };
  const requireCard = (id: string): BlitzCard => {
    const card = db.findCard(id);
    if (!card) throw new HttpError(404, "Card not found");
    return card;
  };

  let generating: Promise<BlitzCard[]> | null = null;
  async function generate(count: number): Promise<BlitzCard[]> {
    if (generating) return generating;
    const profile = requireProfile();
    const usage = new Map<string, number>();
    for (const c of db.state.cards) usage.set(c.referenceId, (usage.get(c.referenceId) ?? 0) + 1);
    const all = references();
    // With a video source configured, half of each batch is "Wall of Text" video posts.
    const videoCount = videos.enabled ? Math.ceil(count / 2) : Math.floor(count / 3);
    const refs = [
      ...pickReferences(all.filter((r) => r.format === "video"), usage, videoCount),
      ...pickReferences(all.filter((r) => r.format !== "video"), usage, count - videoCount),
    ];
    generating = Promise.all(refs.map((r) => buildCard(profile, r, ai, images, videos)))
      .then((cards) => {
        db.update((d) => d.cards.push(...cards));
        return cards;
      })
      .finally(() => {
        generating = null;
      });
    return generating;
  }

  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use("/media", express.static(cfg.mediaDir, { maxAge: "1h" }));

  app.get("/api/state", (_req, res) => {
    res.json({
      profile: db.state.profile,
      capabilities: { claude: ai.enabled, pexels: Boolean(cfg.pexelsApiKey), photos: images.source, videos: videos.source, apify: trends.enabled, buffer: Boolean(buffer) },
      counts: countByStatus(db.state.cards),
    });
  });

  app.post("/api/profile/analyze", async (req, res) => {
    const { url } = z.object({ url: z.string().min(3) }).parse(req.body);
    const page = await fetchPage(url).catch((e: Error) => {
      throw new HttpError(422, e.message);
    });
    let draft = heuristicProfile(page);
    let source: "claude" | "heuristic" = "heuristic";
    if (ai.enabled) {
      try {
        draft = await ai.analyzeSite(page.url, pageForPrompt(page));
        source = "claude";
      } catch (e) {
        console.warn("[profile] Claude analysis failed:", (e as Error).message);
      }
    }
    res.json({ profile: { ...draft, url: page.url }, source });
  });

  app.put("/api/profile", (req, res) => {
    const body = ProfileBody.parse(req.body);
    const profile: ProductProfile = { ...body, updatedAt: new Date().toISOString() };
    db.update((d) => {
      d.profile = profile;
      // Pending cards were written for the old profile.
      d.cards = d.cards.filter((c) => c.status !== "pending");
    });
    res.json({ profile });
  });

  app.get("/api/references", (_req, res) => res.json({ references: references() }));

  app.post("/api/references", (req, res) => {
    const body = ReferenceBody.parse(req.body);
    const ref: ViralReference = {
      id: `imported-${randomUUID().slice(0, 8)}`,
      format: "slideshow",
      isTemplate: false,
      ...body,
      imageQueries: body.imageQueries.length ? body.imageQueries : ["aesthetic lifestyle"],
      slides: body.slides[0] === body.hook ? body.slides : [body.hook, ...body.slides],
    };
    db.update((d) => d.references.unshift(ref));
    res.status(201).json({ reference: ref });
  });

  app.get("/api/blitz/feed", (_req, res) => {
    const cards = db.state.cards.filter((c) => c.status === "pending");
    res.json({ cards, references: Object.fromEntries(cards.map((c) => [c.referenceId, findRef(c.referenceId)])) });
  });

  app.post("/api/blitz/generate", async (req, res) => {
    const { count } = z.object({ count: z.number().int().min(1).max(8).default(3) }).parse(req.body ?? {});
    const cards = await generate(count);
    res.json({ cards, references: Object.fromEntries(cards.map((c) => [c.referenceId, findRef(c.referenceId)])) });
  });

  app.get("/api/cards", (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status.split(",") : null;
    const cards = db.state.cards.filter((c) => !status || status.includes(c.status));
    res.json({ cards: [...cards].reverse(), references: Object.fromEntries(cards.map((c) => [c.referenceId, findRef(c.referenceId)])) });
  });

  app.post("/api/cards/:id/decision", (req, res) => {
    const { decision } = z.object({ decision: z.enum(["approve", "reject", "undo"]) }).parse(req.body);
    const card = requireCard(req.params.id);
    db.update(() => {
      card.status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "pending";
      card.decidedAt = decision === "undo" ? undefined : new Date().toISOString();
    });
    const publishing = decision === "approve" ? autoPublish(card) : false;
    res.json({ card, publishing });
  });

  app.patch("/api/cards/:id", (req, res) => {
    const patch = CardPatch.parse(req.body);
    const card = requireCard(req.params.id);
    db.update(() => Object.assign(card, patch));
    res.json({ card });
  });

  app.post("/api/cards/:id/slides/:slideId/image", async (req, res) => {
    const body = z.object({ query: z.string().optional(), imageUrl: z.string().nullable().optional() }).parse(req.body ?? {});
    const card = requireCard(req.params.id);
    const slide = card.slides.find((s) => s.id === req.params.slideId);
    if (!slide) throw new HttpError(404, "Slide not found");
    if (body.imageUrl !== undefined) {
      slide.imageUrl = body.imageUrl;
    } else {
      if (body.query) slide.imageQuery = body.query;
      const next = await images.find(slide.imageQuery, Math.floor(Math.random() * 15));
      if (!next) throw new HttpError(404, `No photo found for "${slide.imageQuery}". Try other words, upload an image, or use a painted scene.`);
      slide.imageUrl = next;
    }
    db.update(() => undefined);
    res.json({ card });
  });

  app.post("/api/uploads", express.raw({ type: ["image/*"], limit: "15mb" }), (req, res) => {
    const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[req.headers["content-type"] ?? ""];
    if (!ext || !Buffer.isBuffer(req.body) || !req.body.length) throw new HttpError(400, "Upload a PNG, JPEG or WebP image");
    const dir = path.join(cfg.mediaDir, "uploads");
    fs.mkdirSync(dir, { recursive: true });
    const name = `${randomUUID()}.${ext}`;
    fs.writeFileSync(path.join(dir, name), req.body);
    res.status(201).json({ url: `/media/uploads/${name}` });
  });

  app.post("/api/cards/:id/render", async (req, res) => {
    const { aspect, video } = z
      .object({ aspect: z.enum(["4:5", "9:16"]).default("9:16"), video: z.boolean().default(false) })
      .parse(req.body ?? {});
    res.json(await renderCard(requireCard(req.params.id), aspect, video, cfg.mediaDir));
  });

  app.post("/api/cards/:id/publish", async (req, res) => {
    const body = PublishBody.parse(req.body);
    if (body.mode === "customScheduled" && !body.dueAt) throw new HttpError(400, "Pick a date and time to schedule");
    const card = requireCard(req.params.id);
    const records = await publish(card, body);
    res.json({ card, records });
  });

  app.post("/api/cards/:id/video", async (req, res) => {
    const { query } = z.object({ query: z.string().optional() }).parse(req.body ?? {});
    const card = requireCard(req.params.id);
    if (!videos.enabled) throw new HttpError(400, "Add PEXELS_API_KEY (free) or PIXABAY_API_KEY to apps/blitz/.env to get background videos");
    const q = query?.trim() || card.video?.query || card.slides[0]?.imageQuery || "";
    const clip = await videos.find(q, Math.floor(Math.random() * 20));
    if (!clip) throw new HttpError(404, `No vertical clips found for "${q}". Try other words.`);
    db.update(() => {
      card.video = clip;
      card.slides[0].imageQuery = q;
    });
    res.json({ card });
  });

  app.get("/api/settings/publishing", (_req, res) => res.json(db.state.publishing));

  app.put("/api/settings/publishing", (req, res) => {
    const body = z
      .object({
        autoPublish: z.boolean(),
        channelIds: z.array(z.string()),
        mode: z.enum(["addToQueue", "shareNow"]),
        slideshowsAsVideo: z.boolean(),
      })
      .parse(req.body);
    db.update((d) => (d.publishing = body));
    res.json(db.state.publishing);
  });

  app.post("/api/references/trending", async (_req, res) => {
    const profile = requireProfile();
    const found = await trends.trending(profile.keywords);
    const known = new Set(db.state.references.map((r) => r.id));
    const fresh = found.filter((r) => !known.has(r.id));
    db.update((d) => d.references.unshift(...fresh));
    res.json({ added: fresh.length, references: fresh });
  });

  app.get("/api/integrations", async (req, res) => {
    const status: IntegrationsStatus = {
      buffer: { configured: Boolean(buffer), ok: false, channels: [] },
      publicBaseUrl: cfg.publicBaseUrl,
      claude: ai.enabled,
      pexels: Boolean(cfg.pexelsApiKey),
      photos: images.source,
      videos: videos.source,
      apify: trends.enabled,
    };
    if (buffer) {
      try {
        const { orgId, channels } = await bufferChannels(req.query.refresh === "1");
        status.buffer = { configured: true, ok: true, organizationId: orgId, channels };
      } catch (e) {
        status.buffer.error = (e as Error).message;
      }
    }
    res.json(status);
  });

  if (fs.existsSync(cfg.webDist)) {
    app.use(express.static(cfg.webDist));
    app.get(/^(?!\/api|\/media).*/, (_req, res) => res.sendFile(path.join(cfg.webDist, "index.html")));
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err instanceof BufferError) return res.status(502).json({ error: `Buffer: ${err.message}` });
    console.error(err);
    res.status(500).json({ error: (err as Error).message ?? "Internal error" });
  });

  return { app, db };
}

function countByStatus(cards: BlitzCard[]) {
  const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0, published: 0 };
  for (const c of cards) counts[c.status]++;
  return counts;
}
