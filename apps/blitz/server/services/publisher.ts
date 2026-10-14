import type { BlitzCard, BufferChannel, PublishRecord, PublishRequest } from "../../shared/types.js";
import type { BufferClient } from "./buffer.js";
import { renderCard, type Aspect, type RenderOutput } from "./render.js";

export interface PublishDeps {
  buffer: BufferClient;
  channels: BufferChannel[];
  publicBaseUrl: string;
  mediaDir: string;
  render?: typeof renderCard;
}

export function postText(card: BlitzCard): string {
  const tags = card.hashtags.map((h) => `#${h}`).join(" ");
  return tags ? `${card.caption}\n\n${tags}` : card.caption;
}

/** Which media a channel gets: YouTube Shorts needs video; TikTok/Instagram default to a photo carousel. */
export function planMedia(service: string, asVideo: boolean, format: BlitzCard["format"] = "slideshow"): { kind: "images" | "video"; aspect: Aspect } {
  if (format !== "slideshow" || service === "youtube") return { kind: "video", aspect: "9:16" };
  if (service === "instagram") return asVideo ? { kind: "video", aspect: "9:16" } : { kind: "images", aspect: "4:5" };
  return { kind: asVideo ? "video" : "images", aspect: "9:16" };
}

export async function publishCard(card: BlitzCard, req: PublishRequest, deps: PublishDeps): Promise<PublishRecord[]> {
  const render = deps.render ?? renderCard;
  const renders = new Map<string, Promise<RenderOutput>>();
  const getRender = (aspect: Aspect, video: boolean) => {
    const key = `${aspect}-${video}`;
    if (!renders.has(key)) renders.set(key, render(card, aspect, video, deps.mediaDir));
    return renders.get(key)!;
  };
  const abs = (p: string) => `${deps.publicBaseUrl}${p}`;

  const records: PublishRecord[] = [];
  for (const channelId of req.channelIds) {
    const channel = deps.channels.find((c) => c.id === channelId);
    const service = channel?.service ?? "unknown";
    const plan = planMedia(service, Boolean(req.asVideo), card.format);
    const record: PublishRecord = { channelId, service, ok: false, mediaType: plan.kind, at: new Date().toISOString() };
    try {
      if (!channel) throw new Error("Channel not found in Buffer");
      const out = await getRender(plan.aspect, plan.kind === "video");
      const post = await deps.buffer.createPost({
        channelId,
        service,
        text: postText(card),
        title: card.slides[0]?.text.split("\n")[0],
        mode: req.mode,
        dueAt: req.dueAt,
        images: plan.kind === "images" ? out.images.map(abs) : undefined,
        video: plan.kind === "video" && out.video ? abs(out.video) : undefined,
      });
      record.ok = true;
      record.bufferPostId = post.id;
    } catch (e) {
      record.error = (e as Error).message;
    }
    records.push(record);
  }
  return records;
}
