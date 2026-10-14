import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { ProductProfile, ViralReference } from "../../shared/types.js";

const MODEL = "claude-opus-5-5";

export const ProfileSchema = z.object({
  name: z.string(),
  oneLiner: z.string(),
  audience: z.string(),
  tone: z.string(),
  painPoints: z.array(z.string()),
  benefits: z.array(z.string()),
  keywords: z.array(z.string()),
});
export type ProfileDraft = z.infer<typeof ProfileSchema>;

export const RemixSchema = z.object({
  theme: z.string(),
  slides: z.array(z.object({ text: z.string(), imageQuery: z.string() })),
  caption: z.string(),
  hashtags: z.array(z.string()),
  why: z.string(),
});
export type RemixDraft = z.infer<typeof RemixSchema>;

const PROFILE_SYSTEM = `You read a product's website and write a compact marketing profile for a short-form content team.
Be concrete and specific to this product. Use the site's own language where it is good.
- oneLiner: what it is and who it is for, in under 20 words.
- audience: who buys it, in one sentence.
- tone: 3-6 words describing the brand voice.
- painPoints / benefits: 3-6 short items each, phrased the way a customer would say them.
- keywords: 5-10 topics the audience scrolls for on TikTok.`;

const REMIX_SYSTEM = `You write TikTok/Instagram/YouTube Shorts photo-slideshow posts that remix a proven viral format for a specific product.

Rules:
- Keep the reference's structure, rhythm and slide count (plus or minus one slide). Rewrite every slide for the product's world.
- Slide 1 is the hook. Keep the hook pattern recognisable (e.g. "Things you learn too late about people" -> "Things you learn when one shoe has to handle your whole day").
- Every slide's text is at most 12 words and reads well as a white caption over a photo. No emojis, no hashtags on slides.
- The product should feel native, never like an ad. Name it at most once, usually on the last or second-to-last slide.
- imageQuery: 2-5 words for a stock photo search that matches the slide's mood (real-life, candid, vertical-friendly). No text or logos in the image.
- theme: a 2-5 word title-case concept name, e.g. "One Shoe, Full Day".
- caption: 1-2 short lines a creator would write, ending in a soft call to action.
- hashtags: 3-6, lowercase, without the # sign.
- why: 2 sentences for the user explaining why this concept should perform for their audience, citing the reference's format.`;

export class ContentAI {
  private client: Anthropic | null;

  constructor(apiKey: string | null) {
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  get enabled() {
    return this.client !== null;
  }

  async analyzeSite(url: string, pageText: string): Promise<ProfileDraft> {
    return this.structured(PROFILE_SYSTEM, `Website: ${url}\n\n<page>\n${pageText}\n</page>`, ProfileSchema);
  }

  async remix(profile: ProductProfile, ref: ViralReference): Promise<RemixDraft> {
    const prompt = [
      `<product>\n${JSON.stringify(profileForPrompt(profile), null, 2)}\n</product>`,
      `<reference format="${ref.format}" platform="${ref.platform}">`,
      `Structure: ${ref.structure}`,
      `Why it works: ${ref.whyItWorks}`,
      ...ref.slides.map((s, i) => `Slide ${i + 1}: ${s}`),
      `</reference>`,
      `Write a fresh remix for this product. Pick an angle that differs from an obvious feature list.`,
    ].join("\n");
    return this.structured(REMIX_SYSTEM, prompt, RemixSchema);
  }

  private async structured<T extends z.ZodType>(system: string, user: string, schema: T): Promise<z.infer<T>> {
    if (!this.client) throw new Error("ANTHROPIC_API_KEY is not set");
    const response = await this.client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content: user }],
    });
    if (response.stop_reason === "refusal") throw new Error("Claude declined to write this content");
    if (!response.parsed_output) throw new Error(`Claude returned no structured output (stop: ${response.stop_reason})`);
    return response.parsed_output as z.infer<T>;
  }
}

function profileForPrompt(p: ProductProfile) {
  const { updatedAt: _u, ...rest } = p;
  return rest;
}
