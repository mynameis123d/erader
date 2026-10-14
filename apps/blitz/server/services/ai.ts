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

const WRITE_SYSTEM = `You write TikTok / Instagram Reels / YouTube Shorts posts for a specific product. Each request names one format and is either a REMIX of a proven trending post or an ORIGINAL idea for a content angle.

Formats and what to return in "slides":
- slideshow: 4-8 photo slides. Slide 1 is the hook. Each slide's text is at most 12 words and reads well as a white caption pill over a photo. imageQuery = 2-5 words for a real-life stock PHOTO matching the slide's mood.
- video ("wall of text"): exactly ONE slide whose text is the whole block: 25-60 words, mostly lowercase, casual, first person, line breaks (\\n) between thoughts. imageQuery = 3-6 words for stock VIDEO footage of a concrete action + setting (e.g. "woman running sunset path").
- green_screen: exactly TWO slides. Slide 1: text = 8-25 words of commentary shown at the top (the creator reacting to or explaining the background); imageQuery = what the background IMAGE shows (e.g. "messy closet full of shoes", "spreadsheet on laptop screen"). Slide 2: text = "" and imageQuery = VIDEO footage of a person talking or reacting to camera that fits (e.g. "woman talking to camera kitchen").
- hook_demo: exactly TWO slides. Slide 1: text = the hook, at most 12 words, that makes people stay; imageQuery = 3-6 words of VIDEO footage for the hook moment. Slide 2: text = at most 10 words introducing the demo (e.g. "so I tried this instead"); imageQuery = "product demo".

For a REMIX: keep the reference's hook pattern, structure and rhythm, rewritten for the product's world (e.g. "Things you learn too late about people" -> "Things you learn when one shoe has to handle your whole day").
For an ORIGINAL: build the post around the given content angle; make the hook specific, surprising or relatable rather than generic.

Always:
- Write in the brand voice given. The product should feel native, never like an ad; name it at most once.
- No emojis or hashtags in slide text. No text, logos or brands in image/video queries.
- theme: a 2-5 word title-case concept name, e.g. "One Shoe, Full Day".
- caption: 1-2 short lines a creator would write, ending in a soft call to action.
- hashtags: 3-6, lowercase, without the # sign.
- why: 2 sentences for the user on why this should perform for their audience (cite the reference's format and stats for a remix, the angle for an original).`;

export interface WriteRequest {
  format: import("../../shared/types.js").ContentFormat;
  reference?: ViralReference;
  angle?: string;
  voice?: string;
}

export class ContentAI {
  private client: Anthropic | null;

  constructor(apiKey: string | null) {
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  get enabled() {
    return this.client !== null;
  }

  /** Cheapest possible call to confirm the key works. */
  async ping(): Promise<void> {
    if (!this.client) throw new Error("ANTHROPIC_API_KEY is not set");
    await this.client.models.retrieve(MODEL);
  }

  async analyzeSite(url: string, pageText: string): Promise<ProfileDraft> {
    return this.structured(PROFILE_SYSTEM, `Website: ${url}\n\n<page>\n${pageText}\n</page>`, ProfileSchema);
  }

  async write(profile: ProductProfile, req: WriteRequest): Promise<RemixDraft> {
    const ref = req.reference;
    const prompt = [
      `<product>\n${JSON.stringify(profileForPrompt(profile), null, 2)}\n</product>`,
      req.voice?.trim() ? `<brand_voice>${req.voice.trim()}</brand_voice>` : "",
      ref
        ? [
            `<reference format="${ref.format}" platform="${ref.platform}"${ref.views ? ` views="${ref.views}"` : ""}>`,
            `Structure: ${ref.structure}`,
            `Why it works: ${ref.whyItWorks}`,
            ...ref.slides.map((s, i) => `Slide ${i + 1}: ${s}`),
            `</reference>`,
            `Write a REMIX of this reference as a ${req.format} post.`,
          ].join("\n")
        : `Write an ORIGINAL ${req.format} post for this content angle: ${req.angle ?? "the product's main benefit"}.`,
    ]
      .filter(Boolean)
      .join("\n");
    return this.structured(WRITE_SYSTEM, prompt, RemixSchema);
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
