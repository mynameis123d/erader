import { randomUUID } from "node:crypto";
import type { BlitzCard, ProductProfile, Slide, ViralReference } from "../../shared/types.js";
import type { ContentAI, RemixDraft } from "./ai.js";
import { gradientFor, type ImageSearch } from "./images.js";

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/** Remix without an LLM: keep the reference's slides and weave the product in. */
export function templateRemix(profile: ProductProfile, ref: ViralReference): RemixDraft {
  const thing = profile.keywords[0] ?? profile.name;
  const slides = ref.slides.map((text, i) => ({
    text: text.replace(/\{thing\}/g, thing),
    imageQuery: ref.imageQueries[i % ref.imageQueries.length] ?? thing,
  }));
  const benefit = profile.benefits[0];
  const closer = benefit ? `${benefit}. That's why I switched to ${profile.name}` : `That's why I switched to ${profile.name}`;
  slides.splice(Math.max(1, slides.length - 1), 0, { text: closer, imageQuery: ref.imageQueries[0] ?? thing });
  return {
    theme: titleCase(ref.id.replace(/-/g, " ")),
    slides,
    caption: `${profile.oneLiner.trim().slice(0, 150).replace(/[.!?]?$/, ".")} Save this for later.`,
    hashtags: profile.keywords.slice(0, 4).map((k) => k.replace(/[^a-z0-9]/gi, "").toLowerCase()).filter(Boolean),
    why: `${ref.whyItWorks} This version reuses the same structure for ${profile.name}'s audience (${profile.audience}).`,
  };
}

export async function buildCard(
  profile: ProductProfile,
  ref: ViralReference,
  ai: ContentAI,
  images: ImageSearch,
): Promise<BlitzCard> {
  let draft: RemixDraft;
  let generator: BlitzCard["generator"] = "template";
  if (ai.enabled) {
    try {
      draft = await ai.remix(profile, ref);
      generator = "claude";
    } catch (e) {
      console.warn(`[blitz] Claude remix failed for ${ref.id}, using template:`, (e as Error).message);
      draft = templateRemix(profile, ref);
    }
  } else {
    draft = templateRemix(profile, ref);
  }

  const variantSeed = Math.floor(Math.random() * 15);
  const slides: Slide[] = await Promise.all(
    draft.slides.map(async (s, i) => ({
      id: randomUUID(),
      text: s.text.trim(),
      imageQuery: s.imageQuery,
      imageUrl: await images.find(s.imageQuery, variantSeed + i),
      background: gradientFor(`${ref.id}-${i}-${s.imageQuery}`),
      textY: 0.42,
    })),
  );

  return {
    id: randomUUID(),
    format: "slideshow",
    theme: draft.theme,
    referenceId: ref.id,
    slides,
    caption: draft.caption,
    hashtags: draft.hashtags.map((h) => h.replace(/^#/, "")),
    why: draft.why,
    status: "pending",
    generator,
    createdAt: new Date().toISOString(),
    publishes: [],
  };
}
