import { useEffect, useRef, useState } from "react";
import { FORMAT_LABELS, type BlitzCard, type CardVideo, type Slide } from "../../../shared/types";
import { sceneUrl } from "../scene-cache";
import { Carousel } from "./Slides";

/** The visual of a card, laid out the way the exported post will look. */
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
  switch (card.format) {
    case "video":
      return <WallOfText card={card} autoPlay={autoPlay} />;
    case "green_screen":
      return <GreenScreen card={card} autoPlay={autoPlay} />;
    case "hook_demo":
      return <HookDemo card={card} autoPlay={autoPlay} />;
    default:
      return <Carousel slides={card.slides} index={index} onIndex={onIndex} size={size} />;
  }
}

export const formatLabel = (c: Pick<BlitzCard, "format">) => FORMAT_LABELS[c.format] ?? "Post";

const stop = (e: React.PointerEvent) => e.stopPropagation();

/** Looping clip, or a slowly moving painted scene when there's no clip. */
function Backdrop({ video, slide, autoPlay, muted = true }: { video?: CardVideo | null; slide: Slide; autoPlay: boolean; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);
  return (
    <>
      <div className={`slide ${video ? "" : "kenburns"}`} style={{ backgroundImage: `url("${video?.poster ?? slide.imageUrl ?? sceneUrl(slide)}")` }} />
      {video && <video ref={ref} key={video.previewUrl} className="bg-video" src={video.previewUrl} poster={video.poster ?? undefined} autoPlay={autoPlay} muted loop playsInline />}
    </>
  );
}

function SoundAndCredit({ video, muted, onToggle }: { video?: CardVideo | null; muted: boolean; onToggle: () => void }) {
  if (!video) return null;
  return (
    <>
      <button className="sound-btn" aria-label={muted ? "Unmute" : "Mute"} onPointerDown={stop} onClick={onToggle}>
        {muted ? "🔇" : "🔊"}
      </button>
      <a className="credit" href={video.pageUrl} target="_blank" rel="noreferrer" onPointerDown={stop}>
        {video.credit}
      </a>
    </>
  );
}

function WallOfText({ card, autoPlay }: { card: BlitzCard; autoPlay: boolean }) {
  const [muted, setMuted] = useState(true);
  const slide = card.slides[0];
  return (
    <div className="carousel video-post">
      <Backdrop video={card.video} slide={slide} autoPlay={autoPlay} muted={muted} />
      <div className="slide-text outline" style={{ top: `${slide.textY * 100}%` }}>
        <span>{slide.text}</span>
      </div>
      <SoundAndCredit video={card.video} muted={muted} onToggle={() => setMuted((m) => !m)} />
    </div>
  );
}

function GreenScreen({ card, autoPlay }: { card: BlitzCard; autoPlay: boolean }) {
  const [muted, setMuted] = useState(true);
  const slide = card.slides[0];
  const creatorSlide = { ...slide, id: `${slide.id}-c`, imageQuery: "interior", imageUrl: null, scene: null };
  return (
    <div className="carousel video-post green-screen">
      <div className="gs-top" style={{ backgroundImage: `url("${slide.imageUrl ?? sceneUrl(slide)}")` }}>
        <div className="slide-text outline" style={{ top: `${Math.min(slide.textY, 0.5) * 100 * 1.72}%` }}>
          <span>{slide.text}</span>
        </div>
      </div>
      <div className="gs-bottom">
        <Backdrop video={card.video} slide={creatorSlide} autoPlay={autoPlay} muted={muted} />
      </div>
      <SoundAndCredit video={card.video} muted={muted} onToggle={() => setMuted((m) => !m)} />
    </div>
  );
}

const HOOK_MS = 3500;
const DEMO_MS = 5500;

function HookDemo({ card, autoPlay }: { card: BlitzCard; autoPlay: boolean }) {
  const [part, setPart] = useState<0 | 1>(0);
  const [hook, demo] = card.slides;
  useEffect(() => {
    if (!autoPlay) return;
    const t = setTimeout(() => setPart((p) => (p === 0 ? 1 : 0)), part === 0 ? HOOK_MS : DEMO_MS);
    return () => clearTimeout(t);
  }, [part, autoPlay]);
  const demoSlide = demo ?? hook;
  return (
    <div className="carousel video-post hook-demo" onClick={() => setPart((p) => (p === 0 ? 1 : 0))}>
      {part === 0 ? (
        <>
          <Backdrop video={card.video} slide={hook} autoPlay={autoPlay} />
          <div className="slide-text outline" style={{ top: `${hook.textY * 100}%` }}>
            <span>{hook.text}</span>
          </div>
        </>
      ) : (
        <>
          <Backdrop video={card.demoVideo} slide={{ ...demoSlide, imageQuery: "interior desk laptop" }} autoPlay={autoPlay} />
          {!card.demoVideo && <div className="demo-missing">Add a clip tagged "demo" to your Media Bank</div>}
          <div className="slide-text" style={{ top: `${demoSlide.textY * 100}%` }}>
            <span>{demoSlide.text}</span>
          </div>
        </>
      )}
      <div className="story-bars" aria-hidden>
        <span className={part === 0 ? "active" : "done"} style={{ animationDuration: `${HOOK_MS}ms` }} />
        <span className={part === 1 ? "active" : ""} style={{ animationDuration: `${DEMO_MS}ms` }} />
      </div>
      <div className="segment-label">{part === 0 ? "Hook" : "Demo"}</div>
    </div>
  );
}
