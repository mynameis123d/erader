import { describe, expect, it } from "vitest";
import type { ProductProfile } from "../shared/types";
import { ContentAI } from "../server/services/ai";
import { buildCard, templateRemix } from "../server/services/generator";
import { ImageSearch } from "../server/services/images";
import { VideoSearch } from "../server/services/videos";
import { BUILTIN_REFERENCES, pickReferences } from "../server/services/library";
import { heuristicProfile, normalizeUrl, summarizeHtml } from "../server/services/website";

const profile: ProductProfile = {
  url: "https://stride.example",
  name: "Stride",
  oneLiner: "All-day sneakers",
  audience: "Commuters",
  tone: "playful",
  painPoints: ["sore feet"],
  benefits: ["Comfortable from 8am to midnight"],
  keywords: ["sneakers", "streetwear"],
  updatedAt: "",
};

describe("template remix", () => {
  it("keeps the reference structure and adds the product", () => {
    const ref = BUILTIN_REFERENCES.find((r) => r.id === "one-thing-full-day")!;
    const draft = templateRemix(profile, ref);
    expect(draft.slides[0].text).toBe("Things you learn when one sneakers has to handle your whole day");
    expect(draft.slides).toHaveLength(ref.slides.length + 1);
    expect(draft.slides.some((s) => s.text.includes("Stride"))).toBe(true);
    expect(draft.caption).toBe("All-day sneakers. Save this for later.");
  });

  it("builds a pending card with gradient slides when no AI or image keys are set", async () => {
    const card = await buildCard({ profile, format: "slideshow", reference: BUILTIN_REFERENCES[0] }, { ai: new ContentAI(null), images: new ImageSearch(null, false), videos: new VideoSearch(null, null), library: [] });
    expect(card.status).toBe("pending");
    expect(card.generator).toBe("template");
    expect(card.slides.every((s) => s.imageUrl === null && s.background.length === 2)).toBe(true);
  });
});

describe("pickReferences", () => {
  it("prefers the least-used formats", () => {
    const usage = new Map(BUILTIN_REFERENCES.map((r, i) => [r.id, i === 0 ? 0 : 5]));
    expect(pickReferences(BUILTIN_REFERENCES, usage, 1)[0].id).toBe(BUILTIN_REFERENCES[0].id);
    expect(pickReferences(BUILTIN_REFERENCES.slice(0, 2), new Map(), 5)).toHaveLength(5);
  });
});

describe("website analysis", () => {
  it("summarizes HTML without scripts", () => {
    const html = `<html><head><title>Stride | Sneakers</title><meta name="description" content="Shoes for the whole day &amp; night"></head>
      <body><script>var x = "<h1>nope</h1>"</script><h1>Walk all day</h1><h2>Free returns</h2><p>Hello</p></body></html>`;
    const page = summarizeHtml("https://stride.example/", html);
    expect(page.title).toBe("Stride | Sneakers");
    expect(page.description).toBe("Shoes for the whole day & night");
    expect(page.headings).toEqual(["Walk all day", "Free returns"]);
    expect(page.text).not.toContain("nope");
    expect(heuristicProfile(page).name).toBe("Stride");
  });

  it("normalizes URLs and rejects other schemes", () => {
    expect(normalizeUrl("stride.example").toString()).toBe("https://stride.example/");
    expect(() => normalizeUrl("ftp://x")).toThrow();
  });
});
