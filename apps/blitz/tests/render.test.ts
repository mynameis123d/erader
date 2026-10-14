import { describe, expect, it } from "vitest";
import { loadImage } from "@napi-rs/canvas";
import { renderSlide } from "../server/services/render";

describe("renderSlide", () => {
  it("renders a vertical PNG with a gradient fallback", async () => {
    const png = await renderSlide(
      { id: "s", text: "Things you learn when one shoe has to handle your whole day", imageQuery: "", imageUrl: null, background: ["#000", "#333"], textY: 0.4 },
      "9:16",
      "/tmp",
    );
    const img = await loadImage(png);
    expect([img.width, img.height]).toEqual([1080, 1920]);
  });
});
