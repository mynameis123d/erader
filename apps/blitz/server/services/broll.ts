import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import ffmpegStatic from "ffmpeg-static";
export { clipToVideo, isUsable, matchClip } from "./broll-match.js";

const run = promisify(execFile);
const ffmpegBin = () => process.env.FFMPEG_PATH || (ffmpegStatic as unknown as string | null) || "ffmpeg";

/** Store a video file in the B-roll library and make a poster frame + read its duration. */
export async function ingestFile(mediaDir: string, id: string, data: Buffer): Promise<{ fileUrl: string; thumbnail: string; duration: number }> {
  const dir = path.join(mediaDir, "broll");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${id}.mp4`);
  fs.writeFileSync(file, data);
  const poster = path.join(dir, `${id}.jpg`);
  let duration = 0;
  try {
    const { stderr } = await run(ffmpegBin(), ["-y", "-ss", "0.5", "-i", file, "-frames:v", "1", "-vf", "scale=540:-2", poster], { timeout: 60000 });
    const m = stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
    if (m) duration = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  } catch (e) {
    throw new Error(`That file isn't a readable video (${(e as Error).message.split("\n")[0]})`);
  }
  return { fileUrl: `/media/broll/${id}.mp4`, thumbnail: `/media/broll/${id}.jpg`, duration: Math.round(duration) };
}

/** Store an image in the Media Bank. */
export async function ingestImage(mediaDir: string, id: string, data: Buffer, contentType: string): Promise<{ fileUrl: string; thumbnail: string }> {
  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[contentType];
  if (!ext) throw new Error("Use a JPG, PNG or WebP image");
  const dir = path.join(mediaDir, "broll");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${id}.${ext}`), data);
  const url = `/media/broll/${id}.${ext}`;
  return { fileUrl: url, thumbnail: url };
}
