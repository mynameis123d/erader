import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { createCanvas, GlobalFonts, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import ffmpegStatic from "ffmpeg-static";
import { moodFor, paintScene, type Ctx2D } from "../../shared/scene.js";
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

export async function renderSlide(
  slide: Slide,
  aspect: Aspect,
  mediaDir: string,
  opts: { captionStyle?: "pill" | "outline" } = {},
): Promise<Buffer> {
  const [w, h] = SIZES[aspect];
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  let drewPhoto = false;
  if (slide.imageUrl) {
    try {
      const img = await loadSlideImage(slide.imageUrl, mediaDir);
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      drewPhoto = true;
    } catch (e) {
      console.warn(`[render] photo failed, painting a scene instead: ${(e as Error).message}`);
    }
  }
  if (!drewPhoto) paintScene(ctx as unknown as Ctx2D, w, h, slide.scene ?? moodFor(slide.imageQuery, slide.id), slide.id);

  if (!slide.text.trim()) return canvas.encode("png");
  if (opts.captionStyle === "outline") {
    ctx.drawImage(await loadImage(await renderOutlineText(slide.text, slide.textY, w, h)), 0, 0);
    return canvas.encode("png");
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

/** "Wall of Text" caption: white text with a dark outline, no background box. Transparent PNG. */
export async function renderOutlineText(text: string, textY: number, w = 1080, h = 1920): Promise<Buffer> {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  const fontSize = Math.round(w * 0.046);
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  const lines = wrapLines(ctx, text, w * 0.8);
  const lineH = fontSize * 1.22;
  const blockH = lines.length * lineH;
  let y = Math.min(Math.max(textY * h - blockH / 2, h * 0.08), h * 0.9 - blockH) + lineH / 2;
  for (const line of lines) {
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = fontSize * 0.2;
    ctx.strokeText(line, w / 2, y);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(line, w / 2, y);
    y += lineH;
  }
  return canvas.encode("png");
}

/** Seconds a wall of text stays on screen: enough to read it twice-ish, 7-15 s. */
export function readingSeconds(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.round(Math.min(15, Math.max(7, words / 3 + 2)));
}

async function download(url: string, file: string, mediaDir: string) {
  if (url.startsWith("/media/")) return path.join(mediaDir, url.slice("/media/".length));
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`video download HTTP ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

const ffmpegBin = () => process.env.FFMPEG_PATH || (ffmpegStatic as unknown as string | null) || "ffmpeg";

/** Render a "Wall of Text" video post: stock clip (or a slowly zooming painted scene) + outlined text, 1080x1920 MP4. */
export async function renderVideoCard(card: BlitzCard, mediaDir: string): Promise<RenderOutput> {
  const rel = path.join("renders", card.id, "video");
  const dir = path.join(mediaDir, rel);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const slide = card.slides[0];
  const seconds = readingSeconds(slide.text);
  fs.writeFileSync(path.join(dir, "text.png"), await renderOutlineText(slide.text, slide.textY));

  const W = 1080;
  const H = 1920;
  const fill = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1`;
  let inputs: string[];
  let bgFilter: string;
  let still: Buffer;
  if (card.video) {
    const src = await download(card.video.url, path.join(dir, "source.mp4"), mediaDir);
    inputs = ["-stream_loop", "-1", "-i", src];
    bgFilter = `[0:v]${fill},fps=30[bg]`;
    still = await renderSlide({ ...slide, imageUrl: card.video.poster }, "9:16", mediaDir, { captionStyle: "outline" });
  } else {
    // No clip available: painted scene with a slow push-in so it still moves.
    const scene = await renderSlide({ ...slide, imageUrl: null, text: "" }, "9:16", mediaDir);
    fs.writeFileSync(path.join(dir, "scene.png"), scene);
    inputs = ["-loop", "1", "-framerate", "30", "-i", path.join(dir, "scene.png")];
    bgFilter = `[0:v]${fill},zoompan=z='min(zoom+0.0007,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=30[bg]`;
    still = await renderSlide(slide, "9:16", mediaDir, { captionStyle: "outline" });
  }
  fs.writeFileSync(path.join(dir, "cover.png"), still);

  await run(
    ffmpegBin(),
    [
      "-y",
      ...inputs,
      "-i", path.join(dir, "text.png"),
      "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
      "-filter_complex", `${bgFilter};[bg][1:v]overlay=0:0,format=yuv420p[v]`,
      "-map", "[v]", "-map", "2:a",
      "-t", String(seconds),
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
      "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart",
      path.join(dir, "video.mp4"),
    ],
    { timeout: 180000 },
  );
  const url = (f: string) => `/media/${rel}/${f}`.replace(/\\/g, "/");
  return { images: [url("cover.png")], video: url("video.mp4") };
}

export interface RenderOutput {
  images: string[];
  video?: string;
}

/** Render a card's slides to PNGs (and optionally an MP4) under data/media/renders. Returns /media paths. */
export async function renderCard(card: BlitzCard, aspect: Aspect, withVideo: boolean, mediaDir: string): Promise<RenderOutput> {
  if (card.format === "video") return renderVideoCard(card, mediaDir);
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
  await run(
    ffmpegBin(),
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
