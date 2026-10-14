import { moodFor, paintScene, type Ctx2D } from "../../shared/scene";
import type { Slide } from "../../shared/types";

const cache = new Map<string, string>();

/** Data URL of the painted scene behind a slide that has no photo. Same painter as the server export. */
export function sceneUrl(slide: Pick<Slide, "id" | "imageQuery" | "scene">): string {
  const mood = slide.scene ?? moodFor(slide.imageQuery, slide.id);
  const key = `${mood}:${slide.id}`;
  let url = cache.get(key);
  if (!url) {
    const canvas = document.createElement("canvas");
    canvas.width = 540;
    canvas.height = 960;
    paintScene(canvas.getContext("2d") as unknown as Ctx2D, 540, 960, mood, slide.id);
    url = canvas.toDataURL("image/jpeg", 0.86);
    cache.set(key, url);
  }
  return url;
}
