import { useEffect, useRef, useState } from "react";
import type { BlitzCard } from "../../../shared/types";
import { sceneUrl } from "../scene-cache";
import { Carousel } from "./Slides";

/** The visual of a card: a slide carousel, or for "Wall of Text" posts a looping clip with the text on top. */
export function CardMedia({
  card,
  index,
  onIndex,
  size = "md",
  autoPlay = true,
}: {
  card: BlitzCard;
  index?: number;
  onIndex?: (i: number) => void;
  size?: "sm" | "md";
  autoPlay?: boolean;
}) {
  if (card.format !== "video") return <Carousel slides={card.slides} index={index} onIndex={onIndex} size={size} />;
  return <VideoPost card={card} autoPlay={autoPlay} />;
}

function VideoPost({ card, autoPlay }: { card: BlitzCard; autoPlay: boolean }) {
  const [muted, setMuted] = useState(true);
  const ref = useRef<HTMLVideoElement>(null);
  const slide = card.slides[0];
  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);
  return (
    <div className="carousel video-post">
      <div className={`slide ${card.video ? "" : "kenburns"}`} style={{ backgroundImage: `url("${card.video?.poster ?? sceneUrl(slide)}")` }} />
      {card.video && (
        <video
          ref={ref}
          key={card.video.previewUrl}
          className="bg-video"
          src={card.video.previewUrl}
          poster={card.video.poster ?? undefined}
          autoPlay={autoPlay}
          muted
          loop
          playsInline
        />
      )}
      <div className="slide-text outline" style={{ top: `${slide.textY * 100}%` }}>
        <span>{slide.text}</span>
      </div>
      {card.video && (
        <>
          <button
            className="sound-btn"
            aria-label={muted ? "Unmute" : "Mute"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <a className="credit" href={card.video.pageUrl} target="_blank" rel="noreferrer" onPointerDown={(e) => e.stopPropagation()}>
            {card.video.credit}
          </a>
        </>
      )}
    </div>
  );
}

export const formatLabel = (c: Pick<BlitzCard, "format">) => (c.format === "video" ? "Wall of Text" : "Slideshow");
