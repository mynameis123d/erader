import { useEffect, useState } from "react";
import type { Slide } from "../../../shared/types";
import { sceneUrl } from "../scene-cache";

export function SlideView({ slide, size = "md" }: { slide: Slide; size?: "sm" | "md" }) {
  // The painted scene sits under the photo, so a photo that fails to load still leaves a background.
  const scene = `url("${sceneUrl(slide)}")`;
  const bg = { backgroundImage: slide.imageUrl ? `url("${slide.imageUrl}"), ${scene}` : scene };
  return (
    <div className={`slide slide-${size}`} style={bg}>
      <div className="slide-text" style={{ top: `${slide.textY * 100}%` }}>
        <span>{slide.text}</span>
      </div>
    </div>
  );
}

interface CarouselProps {
  slides: Slide[];
  size?: "sm" | "md";
  dotsStyle?: "accent" | "light";
  index?: number;
  onIndex?: (i: number) => void;
  children?: React.ReactNode;
}

/** Slide carousel with arrows and dots, as on the Blitz card. */
export function Carousel({ slides, size = "md", dotsStyle = "accent", index, onIndex, children }: CarouselProps) {
  const [local, setLocal] = useState(0);
  const i = Math.min(index ?? local, slides.length - 1);
  const go = (n: number) => {
    const next = (n + slides.length) % slides.length;
    setLocal(next);
    onIndex?.(next);
  };
  useEffect(() => setLocal(0), [slides.length]);
  if (!slides.length) return null;
  return (
    <div className="carousel">
      <SlideView slide={slides[i]} size={size} />
      {slides.length > 1 && (
        <>
          <button className="nav-arrow left" aria-label="Previous slide" onPointerDown={(e) => e.stopPropagation()} onClick={() => go(i - 1)}>
            ‹
          </button>
          <button className="nav-arrow right" aria-label="Next slide" onPointerDown={(e) => e.stopPropagation()} onClick={() => go(i + 1)}>
            ›
          </button>
        </>
      )}
      <div className={`dots dots-${dotsStyle}`}>
        {slides.map((s, n) => (
          <button key={s.id} className={n === i ? "on" : ""} aria-label={`Slide ${n + 1}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => go(n)} />
        ))}
      </div>
      {children}
    </div>
  );
}
