// Pure helpers (no Node APIs) so the browser preview can import the generator too.
import { USABLE_RIGHTS, type BrollClip, type CardVideo } from "../../shared/types.js";

export const isUsable = (c: BrollClip) => Boolean(c.fileUrl) && USABLE_RIGHTS.includes(c.rights);

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);

/** Best usable library clip for a footage query (tag/title word overlap), or null. */
export function matchClip(clips: BrollClip[], query: string, variant = 0): BrollClip | null {
  const q = words(query);
  const scored = clips
    .filter(isUsable)
    .map((c) => {
      const w = words(`${c.title} ${c.tags.join(" ")}`);
      let score = 0;
      for (const x of q) if (w.has(x)) score++;
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  const top = scored.filter((x) => x.score === scored[0].score);
  return top[variant % top.length].c;
}

export function clipToVideo(c: BrollClip, query: string): CardVideo {
  return {
    query,
    source: "library",
    url: c.fileUrl!,
    previewUrl: c.fileUrl!,
    poster: c.thumbnail ?? null,
    duration: c.duration ?? 10,
    width: 1080,
    height: 1920,
    credit: c.creator ? `@${c.creator} (with permission)` : c.title,
    pageUrl: c.sourceUrl ?? c.fileUrl!,
  };
}
