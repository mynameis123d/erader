import { useMemo } from "react";
import type { BlitzCard, Slide, ViralReference } from "../../../shared/types";
import { fmtCount } from "../api";
import { CardMedia } from "./CardMedia";
import { Carousel } from "./Slides";

/** Left panel: the viral post or format the current card remixes. */
export function RemixedFrom({ reference }: { reference: ViralReference | undefined }) {
  const slides: Slide[] = useMemo(
    () =>
      (reference?.slides ?? []).map((text, i) => ({
        id: `${reference!.id}-${i}`,
        text,
        imageQuery: reference!.imageQueries[i % Math.max(1, reference!.imageQueries.length)] ?? "",
        imageUrl: i === 0 && reference!.thumbnail ? reference!.thumbnail : null,
        background: ["#111111", "#2b2b2b"] as [string, string],
        textY: 0.5,
        scene: null,
      })),
    [reference],
  );
  if (!reference) return <div className="remixed-from empty" />;
  const pseudoCard = { format: "video", slides: slides.slice(0, 1), video: null } as unknown as BlitzCard;
  return (
    <aside className="remixed-from">
      <div className="remixed-title">
        Remixed From
        {reference.isTemplate && <span className="pill-muted">Format</span>}
      </div>
      {reference.format === "video" ? (
        <div className="ref-video">
          <CardMedia key={reference.id} card={pseudoCard} size="sm" />
          <RefStats reference={reference} />
        </div>
      ) : (
        <Carousel key={reference.id} slides={slides} size="sm" dotsStyle="light">
          <RefStats reference={reference} />
        </Carousel>
      )}
      <p className="ref-structure">{reference.structure}</p>
      {reference.sourceUrl && (
        <a className="ref-link" href={reference.sourceUrl} target="_blank" rel="noreferrer">
          View original ↗
        </a>
      )}
    </aside>
  );
}

function RefStats({ reference }: { reference: ViralReference }) {
  if (reference.likes === undefined && reference.views === undefined) return null;
  return (
    <div className="ref-stats">
      {reference.likes !== undefined && (
        <div>
          <span aria-hidden>♡</span>
          <b>{fmtCount(reference.likes)}</b>
        </div>
      )}
      {reference.views !== undefined && (
        <div>
          <span aria-hidden>👁</span>
          <b>{fmtCount(reference.views)}</b>
        </div>
      )}
    </div>
  );
}
