import type {
  BlitzCard,
  BlitzPreferences,
  BrollClip,
  CardVideo,
  CardSource,
  ContentFormat,
  ProductProfile,
  Slide,
  ViralReference,
} from "../../shared/types.js";
import type { ContentAI, RemixDraft } from "./ai.js";
import { clipToVideo, matchClip } from "./broll-match.js";
import { gradientFor, type ImageSearch } from "./images.js";
import type { VideoSearch } from "./videos.js";

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

// ---------------------------------------------------------------- planning

export interface PlannedCard {
  format: ContentFormat;
  origin: "remix" | "original";
}

/** Choose formats by weight and remix vs original by the remix percentage. */
export function planBatch(prefs: BlitzPreferences, count: number, rand: () => number = Math.random): PlannedCard[] {
  const entries = (Object.entries(prefs.formatWeights) as [ContentFormat, number][]).filter(([, w]) => w > 0);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  const out: PlannedCard[] = [];
  for (let i = 0; i < count; i++) {
    let format: ContentFormat = "slideshow";
    if (total > 0) {
      let r = rand() * total;
      for (const [f, w] of entries) {
        if ((r -= w) < 0) {
          format = f;
          break;
        }
      }
    }
    out.push({ format, origin: rand() * 100 < prefs.remixPercent ? "remix" : "original" });
  }
  return out;
}

/** Which references fit a format when remixing. Green Screen and Hook + Demo borrow any hook. */
export function referencesFor(format: ContentFormat, refs: ViralReference[]): ViralReference[] {
  if (format === "slideshow") return refs.filter((r) => r.format === "slideshow");
  if (format === "video") return refs.filter((r) => r.format === "video");
  return refs;
}

// ---------------------------------------------------------------- templates (no Claude key)

export function templateRemix(profile: ProductProfile, ref: ViralReference): RemixDraft {
  return templateDraft(profile, ref.format, ref, undefined);
}

export function templateDraft(profile: ProductProfile, format: ContentFormat, ref?: ViralReference, angle?: string): RemixDraft {
  const thing = profile.keywords[0] ?? profile.name;
  const benefit = profile.benefits?.[0] ?? profile.oneLiner;
  const pain = profile.painPoints?.[0] ?? "wasting time on the wrong thing";
  const base = {
    theme: ref
      ? titleCase(ref.id.replace(/^(wall|tiktok|imported)-/, "").replace(/-/g, " ")).slice(0, 40)
      : titleCase(angle ?? benefit).slice(0, 40),
    caption: `${profile.oneLiner.trim().slice(0, 150).replace(/[.!?]?$/, ".")} Save this for later.`,
    hashtags: profile.keywords
      .slice(0, 4)
      .map((k) => k.replace(/[^a-z0-9]/gi, "").toLowerCase())
      .filter(Boolean),
    why: ref
      ? `${ref.whyItWorks} This version reuses the same structure for ${profile.name}'s audience (${profile.audience}).`
      : `An original idea for the "${angle ?? benefit}" angle, written for ${profile.audience}.`,
  };
  const q = (i: number) => ref?.imageQueries[i % Math.max(1, ref.imageQueries.length)] || thing;
  const hook = ref?.hook ?? `nobody talks about ${pain.toLowerCase()}`;

  switch (format) {
    case "video": {
      const text =
        ref?.format === "video"
          ? ref.slides.join("\n")
          : `${hook}\n\n${benefit.toLowerCase()}.\nthat's the whole tip.\nwish someone told me sooner`;
      return { ...base, slides: [{ text: text.replace(/\{thing\}/g, thing.toLowerCase()), imageQuery: q(0) }] };
    }
    case "green_screen":
      return {
        ...base,
        slides: [
          { text: `${hook}. here's what actually works: ${benefit.toLowerCase()}`, imageQuery: `${thing} close up` },
          { text: "", imageQuery: "person talking to camera" },
        ],
      };
    case "hook_demo":
      return {
        ...base,
        slides: [
          { text: hook.replace(/\{thing\}/g, thing), imageQuery: q(0) },
          { text: `so I tried ${profile.name}`, imageQuery: "product demo" },
        ],
      };
    default: {
      const src = ref?.format === "slideshow" ? ref.slides : [hook, pain, benefit, `this is why I use ${profile.name}`];
      const slides = src.map((text, i) => ({ text: text.replace(/\{thing\}/g, thing), imageQuery: q(i) }));
      if (ref?.format === "slideshow") {
        const closer = `${benefit}. That's why I switched to ${profile.name}`;
        slides.splice(Math.max(1, slides.length - 1), 0, { text: closer, imageQuery: q(0) });
      }
      return { ...base, slides };
    }
  }
}

// ---------------------------------------------------------------- building

export interface CardDeps {
  ai: ContentAI;
  images: ImageSearch;
  videos: VideoSearch;
  library: BrollClip[];
}

export interface CardSpec {
  profile: ProductProfile;
  format: ContentFormat;
  reference?: ViralReference;
  angle?: string;
  voice?: string;
}

/** Media Bank first (owned/cleared items), then stock. */
async function findVideo(deps: CardDeps, query: string, variant: number, preferTags: string[] = []): Promise<CardVideo | null> {
  const own = matchClip(deps.library, `${preferTags.join(" ")} ${query}`, variant, "video");
  if (own) return clipToVideo(own, query);
  return deps.videos.find(query, variant);
}

async function findImage(deps: CardDeps, query: string, variant: number, used?: CardSource[]): Promise<string | null> {
  const own = matchClip(deps.library, query, variant, "image");
  if (own?.fileUrl) {
    used?.push({ kind: "photo", label: own.source === "website" ? "Your website" : "Your Media Bank", detail: own.title, url: own.sourceUrl ?? own.fileUrl });
    return own.fileUrl;
  }
  const url = await deps.images.find(query, variant);
  if (url) used?.push({ kind: "photo", label: /pexels/.test(url) ? "Pexels photo" : "Public-domain photo (Openverse)", detail: `"${query}"`, url });
  return url;
}

function footageSource(v: CardVideo | null, role: string): CardSource[] {
  if (!v) return [];
  const label = v.source === "library" ? "Your Media Bank" : v.source === "pexels" ? "Pexels video" : "Pixabay video";
  return [{ kind: "footage", label: `${role}: ${label}`, detail: `${v.credit} · searched "${v.query}"`, url: v.pageUrl }];
}

export function cardSources(profile: ProductProfile, reference: ViralReference | undefined, angle: string | undefined): CardSource[] {
  const out: CardSource[] = [];
  if (profile.site?.pages.length) {
    out.push({ kind: "website", label: `Your website (${profile.site.pages.length} page${profile.site.pages.length === 1 ? "" : "s"} read)`, detail: profile.site.pages.map((p) => new URL(p).pathname).join(", "), url: profile.url });
  } else if (profile.url) out.push({ kind: "website", label: "Your brand profile", detail: profile.oneLiner, url: profile.url });
  if (reference) {
    const stats = [reference.views !== undefined ? `${reference.views.toLocaleString("en-US")} views` : "", reference.likes !== undefined ? `${reference.likes.toLocaleString("en-US")} likes` : ""].filter(Boolean).join(", ");
    out.push(
      reference.isTemplate
        ? { kind: "reference", label: "Built-in viral format", detail: `"${reference.hook}" (format template, no single source post)` }
        : { kind: "reference", label: `Remixed ${reference.platform === "tiktok" ? "TikTok" : reference.platform} post`, detail: `"${reference.hook}"${stats ? ` · ${stats}` : ""}`, url: reference.sourceUrl },
    );
  } else if (angle) out.push({ kind: "angle", label: "Create New", detail: `Content angle: ${angle}` });
  return out;
}

function slide(text: string, imageQuery: string, textY: number, imageUrl: string | null = null): Slide {
  const id = crypto.randomUUID();
  return { id, text: text.trim(), imageQuery, imageUrl, background: gradientFor(id), textY };
}

export async function buildCard(spec: CardSpec, deps: CardDeps): Promise<BlitzCard> {
  const { profile, format, reference, angle } = spec;
  let draft: RemixDraft;
  let generator: BlitzCard["generator"] = "template";
  if (deps.ai.enabled) {
    try {
      draft = await deps.ai.write(profile, { format, reference, angle, voice: spec.voice });
      generator = "claude";
    } catch (e) {
      console.warn(`[blitz] Claude failed for ${format}, using template:`, (e as Error).message);
      draft = templateDraft(profile, format, reference, angle);
    }
  } else {
    draft = templateDraft(profile, format, reference, angle);
  }

  const v = Math.floor(Math.random() * 15);
  const fallbackQuery = reference?.imageQueries[0] || profile.keywords[0] || profile.name;
  const s0 = draft.slides[0] ?? { text: "", imageQuery: fallbackQuery };
  const s1 = draft.slides[1] ?? { text: "", imageQuery: fallbackQuery };

  const used: CardSource[] = [];
  let slides: Slide[];
  let video: CardVideo | null = null;
  let demoVideo: CardVideo | null = null;

  switch (format) {
    case "video": {
      const text = draft.slides.map((s) => s.text.trim()).join("\n");
      const q = s0.imageQuery || fallbackQuery;
      slides = [slide(text, q, 0.55)];
      video = await findVideo(deps, q, v);
      break;
    }
    case "green_screen": {
      const bgQuery = s0.imageQuery || fallbackQuery;
      slides = [slide(s0.text, bgQuery, 0.12, reference?.thumbnail ?? (await findImage(deps, bgQuery, v, used)))];
      video = await findVideo(deps, s1.imageQuery || "person talking to camera", v, ["creator", "talking", "facecam"]);
      break;
    }
    case "hook_demo": {
      const q = s0.imageQuery || fallbackQuery;
      slides = [slide(s0.text, q, 0.45), slide(s1.text || `so I tried ${profile.name}`, "product demo", 0.85)];
      video = await findVideo(deps, q, v);
      const demo = matchClip(deps.library, "demo product screen recording", v, "video");
      demoVideo = demo ? clipToVideo(demo, "product demo") : null;
      break;
    }
    default:
      slides = await Promise.all(
        draft.slides.map(async (s, i) => slide(s.text, s.imageQuery, 0.42, await findImage(deps, s.imageQuery, v + i, used))),
      );
  }

  return {
    id: crypto.randomUUID(),
    format,
    theme: draft.theme,
    referenceId: reference?.id ?? "original",
    origin: reference ? "remix" : "original",
    angle,
    sources: [
      ...cardSources(profile, reference, angle),
      ...footageSource(video, format === "green_screen" ? "Creator clip" : format === "hook_demo" ? "Hook clip" : "Background"),
      ...footageSource(demoVideo, "Demo clip"),
      ...used.filter((u, i) => used.findIndex((x) => x.url === u.url) === i).slice(0, 6),
    ],
    slides,
    video,
    demoVideo,
    caption: draft.caption,
    hashtags: draft.hashtags.map((h) => h.replace(/^#/, "")),
    why: draft.why,
    status: "pending",
    generator,
    createdAt: new Date().toISOString(),
    publishes: [],
  };
}
