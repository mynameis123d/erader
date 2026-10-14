import fs from "node:fs";
import path from "node:path";
import { randomUUID, timingSafeEqual } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { MOODS, type Mood } from "../shared/scene.js";
import type { BlitzCard, BufferChannel, IntegrationsStatus, ProductProfile, ViralReference } from "../shared/types.js";
import { config as defaultConfig } from "./config.js";
import { Db, type DbShape, type ScrapeJob } from "./db.js";
import { KEY_DEFS, KeyStore, mask } from "./keys.js";
import { contentTypeFor, debounced, SupabaseStore } from "./storage.js";
import { ContentAI } from "./services/ai.js";
import { BufferClient, BufferError } from "./services/buffer.js";
import { buildCard, planBatch, referencesFor } from "./services/generator.js";
import { ImageSearch } from "./services/images.js";
import { allReferences, pickReferences } from "./services/library.js";
import { publishCard } from "./services/publisher.js";
import { renderCard } from "./services/render.js";
import { ApifyClient, RUN_DONE, toBrollCandidates, toReferences } from "./services/trends.js";
import { clipToVideo, ingestFile, ingestImage, isUsable, matchClip } from "./services/broll.js";
import { VideoSearch } from "./services/videos.js";
import { crawlForPrompt, crawlFromMarkdown, crawlSite, heuristicFromCrawl, isThin } from "./services/website.js";

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
  site: z
    .object({
      pages: z.array(z.string()),
      products: z.array(z.object({ name: z.string(), price: z.string().optional(), url: z.string() })),
      imageCount: z.number(),
      analyzedAt: z.string(),
      analyzedBy: z.enum(["claude", "heuristic"]),
    })
    .optional(),
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

export function createApp(baseCfg: Config = defaultConfig) {
  fs.mkdirSync(baseCfg.mediaDir, { recursive: true });
  const db = new Db(path.join(baseCfg.dataDir, "db.json"));
  const keys = new KeyStore(path.join(baseCfg.dataDir, "keys.json"));
  const cloud = baseCfg.supabaseUrl && baseCfg.supabaseKey ? new SupabaseStore(baseCfg.supabaseUrl, baseCfg.supabaseKey) : null;
  // Effective config: .env values, overridden by keys saved in Settings → API keys.
  const cfg: Config = { ...baseCfg, ...keys.overrides() };
  let ai = new ContentAI(cfg.anthropicApiKey);
  let images = new ImageSearch(cfg.pexelsApiKey, cfg.openverse);
  let videos = new VideoSearch(cfg.pexelsApiKey, cfg.pixabayApiKey);
  let apify = new ApifyClient(cfg.apifyToken, cfg.apifyTikTokActor);
  let buffer = cfg.bufferApiKey ? new BufferClient(cfg.bufferApiKey, cfg.bufferEndpoint) : null;
  let channelCache: { at: number; orgId: string; channels: BufferChannel[] } | null = null;

  /** Media files that must outlive this machine (and that Buffer downloads) go to Supabase when configured. */
  async function toPublicUrl(mediaPath: string): Promise<string> {
    if (/^https?:\/\//.test(mediaPath)) return mediaPath;
    if (!cloud) {
      if (!cfg.publicBaseUrl) throw new HttpError(400, "Set a Public URL (or connect Supabase) so Buffer can download your media");
      return `${cfg.publicBaseUrl}${mediaPath}`;
    }
    const rel = mediaPath.replace(/^\/media\//, "");
    return cloud.publish(rel, fs.readFileSync(path.join(cfg.mediaDir, rel)), contentTypeFor(rel));
  }

  /** Keep the media file local (for rendering) and, with Supabase, give back its permanent public URL. */
  const persistMedia = async (mediaPath: string) => (cloud ? toPublicUrl(mediaPath) : mediaPath);

  /** Load state and keys from Supabase, then mirror every change back. */
  const ready = (async () => {
    if (!cloud) return;
    await cloud.ensureBuckets();
    const [state, savedKeys] = await Promise.all([cloud.loadJson<Partial<DbShape>>("db.json"), cloud.loadJson<Record<string, string>>("keys.json")]);
    if (state) db.hydrate(state);
    else await cloud.saveJson("db.json", db.state);
    if (savedKeys) keys.hydrate(savedKeys);
    reloadKeys();
    const saveState = debounced(() => cloud.saveJson("db.json", db.state));
    const saveKeys = debounced(() => cloud.saveJson("keys.json", keys.all()), 100);
    db.onSave = saveState.schedule;
    keys.onSave = saveKeys.schedule;
    console.log(`[supabase] connected: ${db.state.cards.length} cards, ${db.state.broll.length} media items loaded`);
  })();

  /** Rebuild every client after a key changes, so new keys work without a restart. */
  function reloadKeys() {
    Object.assign(cfg, baseCfg, keys.overrides());
    ai = new ContentAI(cfg.anthropicApiKey);
    images = new ImageSearch(cfg.pexelsApiKey, cfg.openverse);
    videos = new VideoSearch(cfg.pexelsApiKey, cfg.pixabayApiKey);
    apify = new ApifyClient(cfg.apifyToken, cfg.apifyTikTokActor);
    buffer = cfg.bufferApiKey ? new BufferClient(cfg.bufferApiKey, cfg.bufferEndpoint) : null;
    channelCache = null;
  }
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
    if (!cfg.publicBaseUrl && !cloud)
      throw new HttpError(
        400,
        "Buffer needs to download your media: connect Supabase (cloud) or set a Public URL in Settings → API keys.",
      );
    if (card.video?.source === "library") {
      const clip = db.state.broll.find((c) => c.fileUrl === card.video!.url);
      if (!clip || !isUsable(clip)) throw new HttpError(403, "This post's B-roll clip is no longer cleared for use. Pick a new video first");
    }
    const { channels } = await bufferChannels();
    const records = await publishCard(card, body, { buffer: buffer!, channels, publicBaseUrl: cfg.publicBaseUrl, toPublicUrl, mediaDir: cfg.mediaDir });
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
  /** Plan formats by weight, remix vs Create New by the remix %, then write each card. */
  async function generate(count: number): Promise<BlitzCard[]> {
    if (generating) return generating;
    const profile = requireProfile();
    const prefs = db.state.preferences;
    const usage = new Map<string, number>();
    for (const c of db.state.cards) usage.set(c.referenceId, (usage.get(c.referenceId) ?? 0) + 1);
    const all = references();
    const angles = prefs.angles.length ? prefs.angles : [...profile.benefits, ...profile.painPoints.map((p) => `fixing "${p}"`)];
    const deps = { ai, images, videos, library: db.state.broll };
    const specs = planBatch(prefs, count).map((plan, i) => {
      const fits = plan.origin === "remix" ? referencesFor(plan.format, all) : [];
      const reference = fits.length ? pickReferences(fits, usage, 1)[0] : undefined;
      if (reference) usage.set(reference.id, (usage.get(reference.id) ?? 0) + 1);
      const angle = reference ? undefined : angles.length ? angles[(i + db.state.cards.length) % angles.length] : profile.oneLiner;
      return { profile, format: plan.format, reference, angle, voice: prefs.voice || profile.tone };
    });
    generating = Promise.all(specs.map((spec) => buildCard(spec, deps)))
      .then((cards) => {
        db.update((d) => d.cards.push(...cards));
        return cards;
      })
      .finally(() => {
        generating = null;
      });
    return generating;
  }

  /**
   * Keep content fresh without anyone in the app: pull new trending posts every 12 hours
   * (when Apify is connected) and refill the feed. Runs on a timer locally and from the
   * Cloudflare cron trigger in the cloud.
   */
  async function contentTick(): Promise<{ scraped: boolean; generated: number }> {
    const out = { scraped: false, generated: 0 };
    if (!db.state.profile) return out;
    const last = db.state.scrapes[0];
    const stale = !last || Date.now() - new Date(last.startedAt).getTime() > 12 * 3600_000;
    const running = db.state.scrapes.some((j) => !RUN_DONE.has(j.status) && !j.imported);
    if (apify.enabled && stale && !running) {
      await startScrape(db.state.profile.keywords.slice(0, 5)).then(() => (out.scraped = true)).catch((e: Error) => console.warn("[tick] scrape failed:", e.message));
    }
    const pending = db.state.cards.filter((c) => c.status === "pending").length;
    const target = db.state.preferences.feedTarget;
    if (pending < target && !generating) out.generated = (await generate(Math.min(4, target - pending)).catch(() => [])).length;
    return out;
  }

  /** Background generation: keep the feed topped up to the target without the user waiting. */
  function startBackgroundGeneration(intervalMs = 45_000) {
    const freshness = setInterval(() => void contentTick(), 3 * 3600_000);
    void contentTick();
    const tick = () => {
      const pending = db.state.cards.filter((c) => c.status === "pending").length;
      const target = db.state.preferences.feedTarget;
      if (!db.state.profile || generating || pending >= target) return;
      generate(Math.min(3, target - pending)).catch((e: Error) => console.warn("[blitz] background generation failed:", e.message));
    };
    const timer = setInterval(tick, intervalMs);
    tick();
    return () => {
      clearInterval(timer);
      clearInterval(freshness);
    };
  }

  // ---------- Apify scrapes ----------
  async function importItems(items: Awaited<ReturnType<typeof apify.datasetItems>>, hashtags: string[]) {
    const refs = toReferences(items, 25);
    const clips = toBrollCandidates(items, hashtags);
    const knownRefs = new Set(db.state.references.map((r) => r.id));
    const knownClips = new Set(db.state.broll.map((c) => c.id));
    const freshRefs = refs.filter((r) => !knownRefs.has(r.id));
    const freshClips = clips.filter((c) => !knownClips.has(c.id));
    db.update((d) => {
      d.references.unshift(...freshRefs);
      d.broll.push(...freshClips);
    });
    return { references: freshRefs.length, clips: freshClips.length };
  }

  /** Wait for a run in the background, then import its posts. */
  function watchScrape(job: ScrapeJob) {
    apify
      .waitForItems(job.runId)
      .then(async ({ run, items }) => {
        const imported = await importItems(items, job.hashtags);
        db.update(() => Object.assign(job, { status: run.status, datasetId: run.defaultDatasetId, finishedAt: run.finishedAt ?? new Date().toISOString(), imported }));
      })
      .catch((e: Error) => db.update(() => Object.assign(job, { status: "FAILED", error: e.message, finishedAt: new Date().toISOString() })));
  }

  async function startScrape(hashtags: string[]): Promise<ScrapeJob> {
    const run = await apify.startRun(ApifyClient.hashtagInput(hashtags));
    const job: ScrapeJob = { runId: run.id, datasetId: run.defaultDatasetId, hashtags, status: run.status, startedAt: run.startedAt ?? new Date().toISOString() };
    db.update((d) => d.scrapes.unshift(job));
    watchScrape(job);
    return job;
  }

  async function importRun(runId: string): Promise<ScrapeJob> {
    const run = await apify.getRun(runId);
    const hashtags = requireProfile().keywords.slice(0, 5);
    const job: ScrapeJob = { runId: run.id, datasetId: run.defaultDatasetId, hashtags, status: run.status, startedAt: run.startedAt ?? new Date().toISOString() };
    db.update((d) => {
      d.scrapes = d.scrapes.filter((s) => s.runId !== run.id);
      d.scrapes.unshift(job);
    });
    watchScrape(job);
    return job;
  }

  // Resume watching runs that were still going when the server stopped.
  if (apify.enabled) for (const job of db.state.scrapes) if (!RUN_DONE.has(job.status) && !job.imported) watchScrape(job);

  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use("/media", express.static(cfg.mediaDir, { maxAge: "1h" }));

  // The API (keys, publishing) is only open to this computer. Through a tunnel or deployment
  // it needs the app password; /media stays public because Buffer downloads posts from it.
  app.use("/api", (req, res, next) => {
    if (req.path === "/health") return next();
    const forwarded = req.headers["x-forwarded-for"] || req.headers["cf-connecting-ip"] || req.headers["x-real-ip"];
    const ip = req.socket.remoteAddress ?? "";
    const local = !forwarded && (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1");
    if (local) return next();
    if (!cfg.appPassword) return res.status(403).json({ error: "Remote access is off. On the computer running Blitz, set an App password in Settings → API keys.", code: "remote_disabled" });
    const given = String(req.headers["x-blitz-password"] ?? "");
    const a = Buffer.from(given);
    const b = Buffer.from(cfg.appPassword);
    if (a.length === b.length && timingSafeEqual(a, b)) return next();
    res.status(401).json({ error: "Enter the app password", code: "password_required" });
  });

  app.get("/api/state", (_req, res) => {
    res.json({
      profile: db.state.profile,
      capabilities: { claude: ai.enabled, pexels: Boolean(cfg.pexelsApiKey), photos: images.source, videos: videos.source, apify: apify.enabled, buffer: Boolean(buffer), storage: cloud ? "supabase" : "local" },
      counts: countByStatus(db.state.cards),
    });
  });

  app.post("/api/profile/analyze", async (req, res) => {
    const { url } = z.object({ url: z.string().min(3) }).parse(req.body);
    // Plain fetch first; if the site blocks it or renders with JavaScript, read it through a real browser on Apify.
    let crawl = await crawlSite(url).catch((e: Error) => e);
    if ((crawl instanceof Error || isThin(crawl)) && apify.enabled) {
      const viaBrowser = await apify
        .readWebsite(crawl instanceof Error ? url : crawl.root)
        .then(crawlFromMarkdown)
        .catch((e: Error) => e);
      if (!(viaBrowser instanceof Error)) {
        // Keep anything the plain crawl found (product data, images) alongside the browser read.
        crawl =
          crawl instanceof Error
            ? viaBrowser
            : { ...viaBrowser, products: crawl.products, images: [...crawl.images, ...viaBrowser.images].slice(0, 24) };
      } else if (crawl instanceof Error) throw new HttpError(422, `${crawl.message}. Apify browser read also failed: ${viaBrowser.message}`);
    }
    if (crawl instanceof Error) throw new HttpError(422, `${crawl.message}. Add your Apify token so Blitz can read sites that block plain requests.`);
    let draft = heuristicFromCrawl(crawl);
    let source: "claude" | "heuristic" = "heuristic";
    if (ai.enabled) {
      try {
        draft = await ai.analyzeSite(crawl.root, crawlForPrompt(crawl));
        source = "claude";
      } catch (e) {
        console.warn("[profile] Claude analysis failed:", (e as Error).message);
      }
    }
    // The site's own product photos go into the Media Bank, so posts can show the real product.
    const known = new Set(db.state.broll.map((c) => c.fileUrl));
    const siteImages = crawl.images
      .filter((img) => !known.has(img.url))
      .map((img, i) => ({
        id: `web-${randomUUID().slice(0, 8)}`,
        kind: "image" as const,
        source: "website" as const,
        title: img.alt || `${draft.name} image ${i + 1}`,
        tags: ["product", "website", ...draft.keywords.slice(0, 3), ...img.alt.toLowerCase().split(/\W+/).filter((w) => w.length > 3).slice(0, 5)],
        sourceUrl: img.page,
        thumbnail: img.url,
        fileUrl: img.url,
        rights: "owned" as const,
        rightsNote: `From ${new URL(crawl.root).host}`,
        addedAt: new Date().toISOString(),
      }));
    db.update((d) => d.broll.unshift(...siteImages));
    const site = {
      pages: crawl.pages.map((p) => p.url),
      products: crawl.products.map((p) => ({ name: p.name, price: p.price, url: p.url })),
      imageCount: crawl.images.length,
      analyzedAt: new Date().toISOString(),
      analyzedBy: source,
    };
    res.json({ profile: { ...draft, url: crawl.root, site }, source });
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

  app.post("/api/uploads", express.raw({ type: ["image/*"], limit: "15mb" }), async (req, res) => {
    const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[req.headers["content-type"] ?? ""];
    if (!ext || !Buffer.isBuffer(req.body) || !req.body.length) throw new HttpError(400, "Upload a PNG, JPEG or WebP image");
    const dir = path.join(cfg.mediaDir, "uploads");
    fs.mkdirSync(dir, { recursive: true });
    const name = `${randomUUID()}.${ext}`;
    fs.writeFileSync(path.join(dir, name), req.body);
    res.status(201).json({ url: await persistMedia(`/media/uploads/${name}`) });
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
    const q = query?.trim() || card.video?.query || card.slides[0]?.imageQuery || "";
    const variant = Math.floor(Math.random() * 20);
    const own = matchClip(db.state.broll, q, variant);
    if (!own && !videos.enabled)
      throw new HttpError(400, "No matching clip in your B-roll library. Add clips there, or add PEXELS_API_KEY (free) for stock footage");
    const clip = own ? clipToVideo(own, q) : await videos.find(q, variant);
    if (!clip) throw new HttpError(404, `No vertical clips found for "${q}". Try other words.`);
    db.update(() => {
      card.video = clip;
      card.slides[0].imageQuery = q;
    });
    res.json({ card });
  });

  // ---------- B-roll library ----------
  const requireClip = (id: string) => {
    const c = db.state.broll.find((x) => x.id === id);
    if (!c) throw new HttpError(404, "Clip not found");
    return c;
  };

  app.get("/api/broll", (_req, res) => res.json({ clips: db.state.broll, apify: apify.enabled }));

  app.post("/api/broll/upload", express.raw({ type: ["video/*", "image/*"], limit: "300mb" }), async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) throw new HttpError(400, "Upload a video (MP4, MOV) or an image (JPG, PNG, WebP)");
    const isImage = String(req.headers["content-type"] ?? "").startsWith("image/");
    const id = `up-${randomUUID().slice(0, 8)}`;
    const title = String(req.query.title ?? "Uploaded clip").slice(0, 90);
    const tags = String(req.query.tags ?? "")
      .split(/[,\s]+/)
      .map((t) => t.replace(/^#/, "").toLowerCase())
      .filter(Boolean);
    const file = await (isImage ? ingestImage(cfg.mediaDir, id, req.body, String(req.headers["content-type"])) : ingestFile(cfg.mediaDir, id, req.body)).catch(
      (e: Error) => {
        throw new HttpError(422, e.message);
      },
    );
    const stored = { ...file, fileUrl: await persistMedia(file.fileUrl), thumbnail: await persistMedia(file.thumbnail) };
    const clip = { id, kind: isImage ? ("image" as const) : ("video" as const), source: "upload" as const, title, tags, rights: "owned" as const, addedAt: new Date().toISOString(), ...stored };
    db.update((d) => d.broll.unshift(clip));
    res.status(201).json({ clip });
  });

  app.post("/api/broll/discover", async (req, res) => {
    const { query } = z.object({ query: z.string().optional() }).parse(req.body ?? {});
    const tags = query?.trim() ? query.split(/[,\s]+/) : requireProfile().keywords;
    res.status(202).json({ job: await startScrape(tags) });
  });

  app.patch("/api/broll/:id", (req, res) => {
    const body = z
      .object({
        title: z.string().max(90).optional(),
        tags: z.array(z.string()).optional(),
        rights: z.enum(["owned", "licensed", "needs_permission", "requested", "cleared", "declined"]).optional(),
        rightsNote: z.string().max(500).optional(),
      })
      .parse(req.body);
    const clip = requireClip(req.params.id);
    if (body.rights === "cleared" && !(body.rightsNote ?? clip.rightsNote)?.trim())
      throw new HttpError(400, "Add a note on how the creator gave permission (e.g. 'Approved by DM on Oct 14') before clearing a clip");
    db.update(() => Object.assign(clip, body));
    res.json({ clip });
  });

  /** Download a TikTok clip into the library. Only for clips the creator has cleared. */
  app.post("/api/broll/:id/fetch", async (req, res) => {
    const clip = requireClip(req.params.id);
    if (clip.source !== "tiktok" || !clip.sourceUrl) throw new HttpError(400, "Only TikTok clips can be fetched");
    if (clip.rights !== "cleared") throw new HttpError(403, "Mark this clip as cleared (creator permission) before downloading it");
    const media = await apify.mediaUrl(clip.sourceUrl);
    const dl = await fetch(media, { signal: AbortSignal.timeout(120000) });
    if (!dl.ok) throw new HttpError(502, `Download failed (HTTP ${dl.status})`);
    const file = await ingestFile(cfg.mediaDir, clip.id, Buffer.from(await dl.arrayBuffer()));
    db.update(() => Object.assign(clip, file));
    const stored = { fileUrl: await persistMedia(file.fileUrl), thumbnail: await persistMedia(file.thumbnail) };
    db.update(() => Object.assign(clip, stored));
    res.json({ clip });
  });

  app.delete("/api/broll/:id", (req, res) => {
    const clip = requireClip(req.params.id);
    db.update((d) => (d.broll = d.broll.filter((c) => c !== clip)));
    for (const url of [clip.fileUrl, clip.thumbnail])
      if (url?.startsWith("/media/broll/")) fs.rmSync(path.join(cfg.mediaDir, url.slice("/media/".length)), { force: true });
    res.json({ ok: true, usable: isUsable(clip) });
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
    res.status(202).json({ job: await startScrape(requireProfile().keywords) });
  });

  // ---------- scrapes (Apify runs) ----------
  app.get("/api/scrapes", (_req, res) => res.json({ scrapes: db.state.scrapes.slice(0, 30), apify: apify.enabled }));

  app.post("/api/scrapes", async (req, res) => {
    const body = z.object({ hashtags: z.array(z.string()).optional(), runId: z.string().regex(/^[A-Za-z0-9]{8,32}$/).optional() }).parse(req.body ?? {});
    if (body.runId) return res.status(202).json({ job: await importRun(body.runId) });
    const tags = body.hashtags?.length ? body.hashtags : requireProfile().keywords;
    res.status(202).json({ job: await startScrape(tags) });
  });

  app.post("/api/scrapes/:runId/abort", async (req, res) => {
    const run = await apify.abortRun(req.params.runId);
    db.update((d) => {
      const job = d.scrapes.find((s) => s.runId === run.id);
      if (job) job.status = run.status;
    });
    res.json({ run });
  });

  // ---------- Blitz preferences ----------
  app.get("/api/preferences", (_req, res) => res.json(db.state.preferences));

  app.put("/api/preferences", (req, res) => {
    const weight = z.number().min(0).max(10);
    const body = z
      .object({
        voice: z.string().max(1000),
        angles: z.array(z.string().max(120)).max(20),
        formatWeights: z.object({ slideshow: weight, video: weight, green_screen: weight, hook_demo: weight }),
        remixPercent: z.number().min(0).max(100),
        feedTarget: z.number().int().min(1).max(30),
      })
      .parse(req.body);
    db.update((d) => (d.preferences = body));
    res.json(db.state.preferences);
  });

  // ---------- live connection test ----------
  type Check = { ok: boolean; detail: string };
  const check = async (fn: () => Promise<string>): Promise<Check> => {
    try {
      return { ok: true, detail: await fn() };
    } catch (e) {
      return { ok: false, detail: (e as Error).message };
    }
  };
  const TESTS: Record<string, () => Promise<Check>> = {
    buffer: () =>
      check(async () => {
        if (!buffer) throw new Error("No Buffer key yet");
        const { channels } = await bufferChannels(true);
        const main = channels.filter((c) => ["tiktok", "instagram", "youtube"].includes(c.service));
        return `Connected. ${channels.length} channel(s): ${channels.map((c) => `${c.service} ${c.displayName ?? c.name}`).join(", ") || "none"}${main.length ? "" : ". Connect TikTok, Instagram and YouTube in Buffer"}`;
      }),
    apify: () =>
      check(async () => {
        if (!apify.enabled) throw new Error("No Apify token yet");
        const me = await apify.me();
        return `Connected as ${me.username}${me.plan ? ` (${me.plan} plan)` : ""}. Scraper: ${apify.actor}`;
      }),
    videos: () =>
      check(async () => {
        if (!videos.enabled) throw new Error("No Pexels or Pixabay key yet");
        const v = await videos.probe();
        return `Working. Sample clip: ${v.credit}`;
      }),
    claude: () =>
      check(async () => {
        if (!ai.enabled) throw new Error("No Anthropic key yet");
        await ai.ping();
        return "Key works";
      }),
    supabase: () =>
      check(async () => {
        if (!cloud) throw new Error("Not connected (data stays on this computer). Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to use the cloud");
        await cloud.ensureBuckets();
        await cloud.saveJson("healthcheck.json", { at: new Date().toISOString() });
        const back = await cloud.loadJson<{ at: string }>("healthcheck.json");
        if (!back?.at) throw new Error("Wrote to Supabase but couldn't read it back");
        return `Connected. State, keys and media are stored in your Supabase project (${new URL(baseCfg.supabaseUrl!).host})`;
      }),
    public: () =>
      check(async () => {
        if (cloud) return "Not needed: Buffer downloads your media from Supabase";
        if (!cfg.publicBaseUrl) throw new Error("Not set");
        const res = await fetch(`${cfg.publicBaseUrl}/api/health`, { signal: AbortSignal.timeout(10000) }).catch(() => null);
        if (!res?.ok) throw new Error(`${cfg.publicBaseUrl} doesn't reach this server yet. Is the tunnel or deployment running?`);
        return `${cfg.publicBaseUrl} reaches this server`;
      }),
  };
  const TEST_FOR_FIELD: Record<string, string> = {
    apifyToken: "apify",
    bufferApiKey: "buffer",
    bufferOrganizationId: "buffer",
    anthropicApiKey: "claude",
    pexelsApiKey: "videos",
    pixabayApiKey: "videos",
    publicBaseUrl: "public",
    appPassword: "public",
  };

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // Called by the Cloudflare cron trigger (from inside Cloudflare, so it passes the local-only guard).
  app.post("/api/cron/tick", async (_req, res) => res.json(await contentTick()));

  app.post("/api/integrations/test", async (_req, res) => {
    const [b, a, v, c, p, sb] = await Promise.all([TESTS.buffer(), TESTS.apify(), TESTS.videos(), TESTS.claude(), TESTS.public(), TESTS.supabase()]);
    res.json({ buffer: b, apify: a, videos: v, claude: c, public: p, supabase: sb });
  });

  // ---------- API keys (Settings → API keys) ----------
  app.get("/api/keys", (_req, res) => {
    res.json({
      keys: KEY_DEFS.map((d) => {
        const saved = keys.get(d.name);
        const env = process.env[d.name]?.trim();
        const value = saved ?? env;
        return {
          name: d.name,
          label: d.label,
          purpose: d.purpose,
          getUrl: d.getUrl,
          secret: d.secret,
          set: Boolean(value),
          from: saved ? "settings" : env ? "env" : null,
          preview: value ? (d.secret ? mask(value) : value) : null,
        };
      }),
    });
  });

  app.put("/api/keys/:name", async (req, res) => {
    const def = KEY_DEFS.find((d) => d.name === req.params.name);
    if (!def) throw new HttpError(404, "Unknown key");
    const { value } = z.object({ value: z.string().max(500) }).parse(req.body);
    const v = value.trim();
    if (v && def.pattern && !def.pattern.test(v)) throw new HttpError(400, `That doesn't look like a valid ${def.label} ${def.secret ? "key" : "value"}. Check for missing characters or spaces.`);
    keys.set(def.name, v || null);
    reloadKeys();
    const test = v ? await TESTS[TEST_FOR_FIELD[def.field]]() : null;
    res.json({ saved: true, test });
  });

  app.get("/api/integrations", async (req, res) => {
    const status: IntegrationsStatus = {
      buffer: { configured: Boolean(buffer), ok: false, channels: [] },
      publicBaseUrl: cfg.publicBaseUrl,
      claude: ai.enabled,
      pexels: Boolean(cfg.pexelsApiKey),
      photos: images.source,
      videos: videos.source,
      apify: apify.enabled,
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

  return { app, db, ready, startBackgroundGeneration };
}

function countByStatus(cards: BlitzCard[]) {
  const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0, published: 0 };
  for (const c of cards) counts[c.status]++;
  return counts;
}
