// In-browser stand-in for the Blitz API, used only by the preview build (`npm run build:preview`).
// Same exports as ../api.ts. Nothing here talks to Buffer or any other service.
import { moodFor, paintScene, type Ctx2D } from "../../../shared/scene";
import { DEFAULT_PREFERENCES } from "../../../shared/types";
import type {
  BlitzCard,
  BlitzPreferences,
  BrollClip,
  BufferChannel,
  IntegrationsStatus,
  ProductProfile,
  PublishingSettings,
  PublishRecord,
  PublishRequest,
  Slide,
  ViralReference,
} from "../../../shared/types";
import { sceneUrl } from "../scene-cache";
import { templateRemix } from "../../../server/services/generator";
import { BUILTIN_REFERENCES, WALL_OF_TEXT_REFERENCES } from "../../../server/services/library";

export type { BrollClip, BlitzPreferences };
export interface ScrapeJob {
  runId: string;
  datasetId?: string;
  hashtags: string[];
  status: string;
  startedAt: string;
  finishedAt?: string;
  imported?: { references: number; clips: number };
  error?: string;
}
export type { BlitzCard, IntegrationsStatus, ProductProfile, PublishingSettings, PublishRecord, PublishRequest, ViralReference };
export type RefMap = Record<string, ViralReference | undefined>;
export interface AppState {
  profile: ProductProfile | null;
  capabilities: { claude: boolean; pexels: boolean; photos: string; videos: string | null; apify: boolean; buffer: boolean };
  counts: Record<string, number>;
}

export const DEMO = true;

export const fmtCount = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);

const profile: ProductProfile = {
  url: "https://stride.example",
  name: "Stride",
  oneLiner: "One pair of sneakers built to go from the office to the court to dinner.",
  audience: "Busy 20-35 year olds who don't want to carry a second pair of shoes",
  tone: "playful, confident, a little dry",
  painPoints: ["sore feet by 5pm", "carrying gym shoes everywhere", "sneakers that look sporty, not sharp"],
  benefits: ["Comfortable from 8am to midnight", "Grip that works on the court", "Clean enough for the office"],
  keywords: ["sneakers", "streetwear", "day in my life", "pickup basketball", "outfit ideas"],
  updatedAt: new Date().toISOString(),
};

// A viral post the user "imported", to show how real stats appear in Remixed From.
const imported: ViralReference = {
  id: "imported-learn-too-late",
  format: "slideshow",
  platform: "tiktok",
  isTemplate: false,
  hook: "Things you learn too late about people",
  slides: [
    "Things you learn too late about people",
    "The ones who listen talk the least",
    "Consistency beats intensity",
    "Your energy tells people how to treat you",
    "Silence is a complete answer",
    "Who claps when you win says everything",
    "Save this for when you need it",
  ],
  structure: "Hook slide, then one short life lesson per slide, ending on a save CTA.",
  whyItWorks: "List-of-lessons slideshows earn saves and rewatches.",
  imageQueries: ["moody portrait night", "city lights", "interior window"],
  likes: 98400,
  views: 994100,
};

const importedVideo: ViralReference = {
  id: "imported-advice-shoe-shuffle",
  format: "video",
  platform: "tiktok",
  isTemplate: false,
  hook: "advice from someone who's done the closet purge:",
  slides: ["advice from someone who's done the closet purge:\nkeep the pieces you reach for on a tired tuesday.\nthe rest is just storage for good intentions"],
  structure: "Lowercase advice paragraph over candid POV footage.",
  whyItWorks: "Wall-of-text posts make people pause to read, which lifts watch time.",
  imageQueries: ["woman running sunset path"],
  likes: 212300,
  views: 1840000,
};

const references: ViralReference[] = [importedVideo, imported, ...WALL_OF_TEXT_REFERENCES, ...BUILTIN_REFERENCES];

type Sample = {
  ref: string;
  theme: string;
  slides: [string, string][];
  caption: string;
  hashtags: string[];
  why: string;
  video?: boolean;
  format?: BlitzCard["format"];
  angle?: string;
};

// Sample remixes in the style the Claude remixer produces, so the preview reads like the real feed.
const SAMPLES: Sample[] = [
  {
    ref: "original",
    format: "green_screen",
    angle: "myths about running shoes",
    theme: "The Shoe Rotation Myth",
    slides: [
      ["everyone says you need 3 pairs of shoes. i tested it for a month and honestly one good pair beat all of them", "closet full of sneakers"],
      ["", "woman talking to camera"],
    ],
    caption: "Hot take: your shoe rotation is a storage problem, not a style choice.",
    hashtags: ["sneakers", "hottake", "minimalism"],
    why: "Create New for your \"myths\" angle. Green Screen myth-busting gets comments from people defending their rotation, which pushes reach.",
  },
  {
    ref: "red-flags",
    format: "hook_demo",
    theme: "Blister-Free Day",
    slides: [
      ["my feet hurt every single day until this", "city street walking"],
      ["so I tried Stride for a week", "product demo"],
    ],
    caption: "Week one: zero blisters. Week two: still zero.",
    hashtags: ["sneakers", "review", "comfort"],
    why: "Remixes the red-flags hook into a pain-then-proof Hook + Demo: the first 3 seconds name the pain, then the demo shows the fix.",
  },
  {
    ref: "imported-advice-shoe-shuffle",
    video: true,
    theme: "One Shoe, Full Day",
    slides: [
      [
        "advice from someone who's done the shoe shuffle:\npick the pair that survives your workout, commute, grocery run, long walk, and eight-hour shift.\nif your feet can keep going, you shouldn't have to keep changing what's on them",
        "woman running sunset path",
      ],
    ],
    caption: "One pair. Whole day. That's the whole tip.",
    hashtags: ["sneakers", "dayinmylife", "running", "ootd"],
    why: "Remixes a 1.8M-view 'advice from someone who...' wall of text: the same friendly lowercase voice, now about shoes. Viewers stop to read, which lifts watch time, and the running clip matches the 'keep going' line.",
  },
  {
    ref: "imported-learn-too-late",
    theme: "One Shoe, Full Day",
    slides: [
      ["Things you learn when one shoe has to handle your whole day", "basketball court dusk"],
      ["8am: it has to survive the commute", "city street morning"],
      ["1pm: it has to look fine in the meeting", "office interior window"],
      ["6pm: pickup game, no time to change", "outdoor basketball court"],
      ["9pm: dinner, still standing", "city night lights"],
      ["Your feet notice everything", "golden hour walk"],
      ["Stride. One pair, whole day", "forest dusk park"],
    ],
    caption: "Tested it so you don't have to carry a gym bag. Save this for your next 16-hour day.",
    hashtags: ["sneakers", "dayinmylife", "pickupbasketball", "ootd"],
    why: "Remixes a 994K-view lessons slideshow: same hook pattern, but each lesson becomes a moment of the day the shoe survives. Day-in-the-life arcs keep viewers swiping to the last slide, where the product lands.",
  },
  {
    ref: "red-flags",
    theme: "Sneaker Red Flags",
    slides: [
      ["Sneaker red flags nobody warns you about", "city night neon red"],
      ["When they look great but hurt by lunch", "city street night"],
      ["When the sole is slick on a wet court", "outdoor basketball court"],
      ["When you need a second pair for the gym", "interior home"],
      ["Green flag: one pair that does all of it", "golden hour sunset"],
    ],
    caption: "Sending this to the friend who owns 14 pairs and still complains.",
    hashtags: ["sneakers", "redflags", "streetwear"],
    why: "Warning-list formats get shared to friends, which pushes reach. The flip to a green flag on the last slide makes the product the answer instead of an ad.",
  },
  {
    ref: "before-after",
    theme: "Gym Bag Era Is Over",
    slides: [
      ["Me 6 months ago vs me now", "mountains morning"],
      ["Then: two pairs of shoes in my bag", "interior desk"],
      ["Now: one pair, no bag", "city street"],
      ["Then: sore feet by 5pm", "ocean sunset"],
      ["Now: still walking at midnight", "city night lights"],
      ["The only thing I changed", "golden hour field"],
    ],
    caption: "The glow-up was my shoes. That's it.",
    hashtags: ["glowup", "sneakers", "minimalism"],
    why: "Then/now transformations are the most reliable short-form story shape, and the reveal slide carries the product naturally.",
  },
  {
    ref: "wall-i-used-to-think",
    video: true,
    theme: "Fewer Decisions",
    slides: [
      [
        "i used to think i needed more motivation.\nturns out i needed fewer decisions.\nsame breakfast, same route, same sneakers.\nnow my energy goes to the stuff that actually matters",
        "person walking city morning",
      ],
    ],
    caption: "The most underrated productivity hack is boring shoes that work.",
    hashtags: ["productivity", "routine", "sneakers"],
    why: "Belief-flip paragraphs trigger self-recognition, and the product shows up as part of a system rather than a pitch.",
  },
  {
    ref: "pov-finally",
    theme: "POV: Packed Light",
    slides: [
      ["POV: you finally packed one pair for the whole trip", "ocean beach"],
      ["Beach walk", "ocean sunset"],
      ["Hike", "mountain trail"],
      ["Rooftop dinner", "city rooftop night"],
      ["Why did nobody tell me sooner", "golden hour hills"],
    ],
    caption: "Carry-on only, one pair of shoes. Ask me how.",
    hashtags: ["packinglight", "travel", "sneakers"],
    why: "POV framing puts the viewer inside the relief moment. Travel packing is a high-save topic for this audience.",
  },
];

let sampleIndex = 0;
let templateIndex = 0;
const cards: BlitzCard[] = [];

function toSlides(rows: [string, string][]): Slide[] {
  return rows.map(([text, imageQuery]) => {
    const id = crypto.randomUUID();
    return { id, text, imageQuery, imageUrl: null, background: ["#111", "#333"], textY: 0.42, scene: moodFor(imageQuery, id) };
  });
}

function nextCard(): BlitzCard {
  const base = { id: crypto.randomUUID(), format: "slideshow" as BlitzCard["format"], status: "pending" as const, createdAt: new Date().toISOString(), publishes: [] };
  if (sampleIndex < SAMPLES.length) {
    const s = SAMPLES[sampleIndex++];
    const slides = toSlides(s.slides);
    const format: BlitzCard["format"] = s.format ?? (s.video ? "video" : "slideshow");
    if (format === "video") slides[0].textY = 0.55;
    if (format === "green_screen") slides.splice(1), (slides[0].textY = 0.12);
    if (format === "hook_demo") (slides[0].textY = 0.45), (slides[1].textY = 0.85);
    return {
      ...base,
      format,
      origin: s.ref === "original" ? "original" : "remix",
      angle: s.angle,
      video: null,
      demoVideo: null,
      theme: s.theme,
      referenceId: s.ref,
      slides,
      caption: s.caption,
      hashtags: s.hashtags,
      why: s.why,
      generator: "claude",
    };
  }
  const pool = [...WALL_OF_TEXT_REFERENCES, ...BUILTIN_REFERENCES];
  const ref = pool[(templateIndex++ * 7) % pool.length];
  const d = templateRemix(profile, ref);
  return {
    ...base,
    origin: "remix",
    format: ref.format,
    theme: d.theme,
    referenceId: ref.id,
    slides: toSlides(d.slides.map((x) => [x.text, x.imageQuery])),
    caption: d.caption,
    hashtags: d.hashtags,
    why: d.why,
    generator: "template",
  };
}

const refMap = (cs: BlitzCard[]): RefMap => Object.fromEntries(cs.map((c) => [c.referenceId, references.find((r) => r.id === c.referenceId)]));
const counts = () => {
  const c: Record<string, number> = { pending: 0, approved: 0, rejected: 0, published: 0 };
  for (const x of cards) c[x.status]++;
  return c;
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const find = (id: string) => {
  const c = cards.find((x) => x.id === id);
  if (!c) throw new Error("Card not found");
  return c;
};
const clone = <T,>(x: T): T => structuredClone(x);

const channels: BufferChannel[] = [
  { id: "demo-tt", name: "stride.kicks", displayName: "stride.kicks", service: "tiktok", avatar: null, isQueuePaused: false },
  { id: "demo-ig", name: "stride.kicks", displayName: "stride.kicks", service: "instagram", avatar: null, isQueuePaused: false },
  { id: "demo-yt", name: "Stride", displayName: "Stride", service: "youtube", avatar: null, isQueuePaused: false },
];

function renderPreview(card: BlitzCard, aspect: "4:5" | "9:16"): string[] {
  const [w, h] = aspect === "4:5" ? [432, 540] : [405, 720];
  return card.slides.map((s) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    paintScene(ctx as unknown as Ctx2D, w, h, s.scene ?? moodFor(s.imageQuery, s.id), s.id);
    const fs = Math.round(w * 0.052);
    ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const words = s.text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const wd of words) {
      const next = line ? `${line} ${wd}` : wd;
      if (ctx.measureText(next).width > w * 0.78 && line) {
        lines.push(line);
        line = wd;
      } else line = next;
    }
    if (line) lines.push(line);
    const lh = fs * 1.32;
    let y = s.textY * h - (lines.length * lh) / 2 + lh / 2;
    for (const l of lines) {
      const tw = ctx.measureText(l).width;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect(w / 2 - tw / 2 - fs * 0.42, y - lh / 2, tw + fs * 0.84, lh, fs * 0.28);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.fillText(l, w / 2, y + 1);
      y += lh;
    }
    return c.toDataURL("image/jpeg", 0.85);
  });
}

let publishing: PublishingSettings = { autoPublish: true, channelIds: ["demo-tt", "demo-ig", "demo-yt"], mode: "addToQueue", slideshowsAsVideo: false };

const now = new Date().toISOString();
let broll: BrollClip[] = [
  { id: "up-1", source: "upload", title: "morning run sunset path", tags: ["running", "sunset"], rights: "owned", fileUrl: null, addedAt: now, duration: 12 },
  { id: "tt-1", source: "tiktok", title: "5am run club, nobody talks about the sunrise", tags: ["running", "sneakers"], creator: "runwithmaya", sourceUrl: "https://www.tiktok.com/", views: 2400000, likes: 310000, rights: "needs_permission", fileUrl: null, addedAt: now },
  { id: "tt-2", source: "tiktok", title: "pickup game at the park after work", tags: ["basketball"], creator: "courtside.daily", sourceUrl: "https://www.tiktok.com/", views: 880000, likes: 92000, rights: "requested", fileUrl: null, addedAt: now },
  { id: "tt-3", source: "tiktok", title: "outfit check: one pair, three looks", tags: ["sneakers", "ootd"], creator: "styledbyjo", sourceUrl: "https://www.tiktok.com/", views: 1310000, likes: 154000, rights: "cleared", rightsNote: "Approved by DM", fileUrl: null, addedAt: now },
];

let prefs: BlitzPreferences = { ...structuredClone(DEFAULT_PREFERENCES), voice: "Dry, confident, a little funny. Talks like a friend who runs.", angles: ["myths about running shoes", "a day in the life", "customer wins"] };
const scrapes: ScrapeJob[] = [];

export const api = {
  preferences: async () => clone(prefs),
  savePreferences: async (p: BlitzPreferences) => (prefs = clone(p)),
  testIntegrations: async () => ({
    buffer: { ok: false, detail: "The preview can't call Buffer. Run the app with your keys to test" },
    apify: { ok: false, detail: "The preview can't call Apify. Run the app with your keys to test" },
    videos: { ok: false, detail: "The preview can't call Pexels" },
    claude: { ok: false, detail: "The preview uses sample cards" },
  }),
  scrapes: async () => ({ scrapes: clone(scrapes), apify: true }),
  startScrape: async (_b: { hashtags?: string[]; runId?: string }): Promise<{ job: ScrapeJob }> => {
    throw new Error("Scraping runs on the server through Apify. It isn't available in the preview");
  },
  abortScrape: async (_id: string) => ({ run: null }),
  broll: async () => {
    // Painted stand-ins for thumbnails: the preview can't load TikTok covers.
    for (const c of broll) if (!c.thumbnail) c.thumbnail = sceneUrl({ id: c.id, imageQuery: `${c.title} ${c.tags.join(" ")}`, scene: null });
    return { clips: clone(broll), apify: true };
  },
  uploadBroll: async (file: File, title: string, tags: string): Promise<{ clip: BrollClip }> => {
    const clip: BrollClip = { id: `up-${crypto.randomUUID().slice(0, 6)}`, source: "upload", title, tags: tags.split(/[,\s]+/).filter(Boolean), rights: "owned", fileUrl: URL.createObjectURL(file), addedAt: new Date().toISOString() };
    broll.unshift(clip);
    return { clip: clone(clip) };
  },
  discoverBroll: async (_q?: string): Promise<{ job: ScrapeJob }> => {
    throw new Error("TikTok search runs on the server with your Apify token. It isn't available in the preview");
  },
  patchBroll: async (id: string, patch: Partial<Pick<BrollClip, "title" | "tags" | "rights" | "rightsNote">>) => {
    const c = broll.find((x) => x.id === id)!;
    Object.assign(c, patch);
    return { clip: clone(c) };
  },
  fetchBroll: async (_id: string): Promise<{ clip: BrollClip }> => {
    throw new Error("Downloading runs on the server through Apify. It isn't available in the preview");
  },
  deleteBroll: async (id: string) => {
    broll = broll.filter((x) => x.id !== id);
    return { ok: true };
  },
  newVideo: async (_id: string, _query?: string): Promise<{ card: BlitzCard }> => {
    throw new Error("Video search runs on the server with your Pexels key. The preview shows a moving painted scene instead");
  },
  publishingSettings: async () => clone(publishing),
  savePublishingSettings: async (s: PublishingSettings) => (publishing = clone(s)),
  pullTrending: async (): Promise<{ job: ScrapeJob }> => {
    throw new Error("Pulling trending TikToks needs APIFY_TOKEN on the server. It isn't available in the preview");
  },
  state: async (): Promise<AppState> => ({
    profile,
    capabilities: { claude: true, pexels: false, photos: "scenes", videos: null, apify: false, buffer: true },
    counts: counts(),
  }),
  analyze: async (_url: string): Promise<{ profile: Omit<ProductProfile, "updatedAt">; source: string }> => {
    throw new Error("The preview can't read websites. In the real app Claude reads the page; here you can edit the fields directly");
  },
  saveProfile: async (p: Omit<ProductProfile, "updatedAt">) => {
    Object.assign(profile, p, { updatedAt: new Date().toISOString() });
    return { profile: clone(profile) };
  },
  feed: async () => {
    const pending = cards.filter((c) => c.status === "pending");
    return { cards: clone(pending), references: refMap(pending) };
  },
  generate: async (count = 3) => {
    await wait(500);
    const fresh = Array.from({ length: count }, nextCard);
    cards.push(...fresh);
    return { cards: clone(fresh), references: refMap(fresh) };
  },
  cards: async (status: string) => {
    const list = cards.filter((c) => status.split(",").includes(c.status)).reverse();
    return { cards: clone(list), references: refMap(list) };
  },
  decide: async (id: string, decision: "approve" | "reject" | "undo") => {
    const c = find(id);
    c.status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "pending";
    const auto = decision === "approve" && publishing.autoPublish && publishing.channelIds.length > 0;
    if (auto) {
      const records = await api.publish(id, { channelIds: publishing.channelIds, mode: publishing.mode, asVideo: publishing.slideshowsAsVideo });
      void records;
    }
    return { card: clone(c), publishing: auto };
  },
  patchCard: async (id: string, patch: Partial<Pick<BlitzCard, "theme" | "slides" | "caption" | "hashtags">>) => {
    const c = find(id);
    Object.assign(c, clone(patch));
    return { card: clone(c) };
  },
  slideImage: async (id: string, slideId: string, body: { query?: string; imageUrl?: string | null }) => {
    const c = find(id);
    const s = c.slides.find((x) => x.id === slideId);
    if (!s) throw new Error("Slide not found");
    if (body.imageUrl !== undefined) s.imageUrl = body.imageUrl;
    else throw new Error("Photo search runs on the server (Pexels or Openverse). The preview uses painted scenes; pick one below or upload an image");
    return { card: clone(c) };
  },
  upload: (file: File) =>
    new Promise<{ url: string }>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve({ url: String(r.result) });
      r.onerror = () => reject(new Error("Could not read that file"));
      r.readAsDataURL(file);
    }),
  render: async (id: string, aspect: "4:5" | "9:16", _video: boolean) => ({ images: renderPreview(find(id), aspect) }),
  publish: async (id: string, req: PublishRequest) => {
    await wait(700);
    const c = find(id);
    const records: PublishRecord[] = req.channelIds.map((channelId) => {
      const ch = channels.find((x) => x.id === channelId)!;
      const video = c.format === "video" || ch.service === "youtube" || Boolean(req.asVideo);
      return { channelId, service: ch.service, ok: true, bufferPostId: "preview", mediaType: video ? "video" : "images", at: new Date().toISOString() };
    });
    c.publishes.push(...records);
    c.status = "published";
    return { card: clone(c), records };
  },
  integrations: async (_refresh = false): Promise<IntegrationsStatus> => ({
    buffer: { configured: true, ok: true, organizationId: "preview", channels: clone(channels) },
    publicBaseUrl: "https://your-blitz-server.example",
    claude: true,
    pexels: false,
    photos: "scenes",
    videos: null,
    apify: false,
  }),
  references: async () => ({ references: clone(references) }),
  addReference: async (r: Partial<ViralReference>) => {
    const ref: ViralReference = {
      id: `imported-${crypto.randomUUID().slice(0, 8)}`,
      format: "slideshow",
      platform: "tiktok",
      isTemplate: false,
      hook: r.hook ?? "",
      slides: [r.hook ?? "", ...(r.slides ?? [])],
      structure: "Imported post",
      whyItWorks: r.whyItWorks ?? "Imported from a post that is performing well.",
      imageQueries: ["aesthetic lifestyle"],
      likes: r.likes,
      views: r.views,
      sourceUrl: r.sourceUrl,
    };
    references.unshift(ref);
    return { reference: ref };
  },
};
