import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { createCanvas, GlobalFonts, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import ffmpegStatic from "ffmpeg-static";
import type { BlitzCard, Slide } from "../../shared/types.js";

const run = promisify(execFile);

export type Aspect = "4:5" | "9:16";
const SIZES: Record<Aspect, [number, number]> = { "4:5": [1080, 1350], "9:16": [1080, 1920] };
export const SECONDS_PER_SLIDE = 3;

const FONT_CANDIDATES = [
  "/usr/share/fonts/opentype/inter/Inter-Bold.otf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
  "C:\\Windows\\Fonts\\arialbd.ttf",
];
let fontFamily = "sans-serif";
for (const f of FONT_CANDIDATES) {
  if (fs.existsSync(f) && GlobalFonts.registerFromPath(f, "BlitzSans")) {
    fontFamily = "BlitzSans";
    break;
  }
}

export function wrapLines(ctx: Pick<SKRSContext2D, "measureText">, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
  }
  return lines;
}

async function loadSlideImage(url: string, mediaDir: string) {
  if (url.startsWith("/media/")) return loadImage(fs.readFileSync(path.join(mediaDir, url.slice("/media/".length))));
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`image HTTP ${res.status}`);
  return loadImage(Buffer.from(await res.arrayBuffer()));
}

export async function renderSlide(slide: Slide, aspect: Aspect, mediaDir: string): Promise<Buffer> {
  const [w, h] = SIZES[aspect];
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, slide.background[0]);
  grad.addColorStop(1, slide.background[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  if (slide.imageUrl) {
    try {
      const img = await loadSlideImage(slide.imageUrl, mediaDir);
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    } catch (e) {
      console.warn(`[render] using gradient, image failed: ${(e as Error).message}`);
    }
  }

  // TikTok "classic" caption: black bold text on rounded white pills, one per line.
  const fontSize = Math.round(w * 0.052);
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = wrapLines(ctx, slide.text, w * 0.78);
  const lineH = fontSize * 1.32;
  const padX = fontSize * 0.42;
  const blockH = lines.length * lineH;
  let y = Math.min(Math.max(slide.textY * h - blockH / 2, h * 0.06), h * 0.94 - blockH) + lineH / 2;
  for (const line of lines) {
    const tw = ctx.measureText(line).width;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2 - padX, y - lineH / 2, tw + padX * 2, lineH, fontSize * 0.28);
    ctx.fill();
    ctx.fillStyle = "#111111";
    ctx.fillText(line, w / 2, y + fontSize * 0.04);
    y += lineH;
  }
  return canvas.encode("png");
}

export interface RenderOutput {
  images: string[];
  video?: string;
}

/** Render a card's slides to PNGs (and optionally an MP4) under data/media/renders. Returns /media paths. */
export async function renderCard(card: BlitzCard, aspect: Aspect, withVideo: boolean, mediaDir: string): Promise<RenderOutput> {
  const rel = path.join("renders", card.id, aspect.replace(":", "x"));
  const dir = path.join(mediaDir, rel);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const images: string[] = [];
  for (const [i, slide] of card.slides.entries()) {
    const file = `slide-${String(i + 1).padStart(2, "0")}.png`;
    fs.writeFileSync(path.join(dir, file), await renderSlide(slide, aspect, mediaDir));
    images.push(`/media/${rel}/${file}`.replace(/\\/g, "/"));
  }

  if (!withVideo) return { images };
  const ffmpeg = process.env.FFMPEG_PATH || (ffmpegStatic as unknown as string | null) || "ffmpeg";
  await run(
    ffmpeg,
    [
      "-y",
      "-framerate", `1/${SECONDS_PER_SLIDE}`,
      "-i", path.join(dir, "slide-%02d.png"),
      "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
      "-vf", "fps=30,format=yuv420p",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
      "-c:a", "aac", "-shortest",
      "-t", String(card.slides.length * SECONDS_PER_SLIDE),
      "-movflags", "+faststart",
      path.join(dir, "video.mp4"),
    ],
    { timeout: 120000 },
  );
  return { images, video: `/media/${rel}/video.mp4`.replace(/\\/g, "/") };
}
