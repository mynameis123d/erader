import { useMemo } from "react";
import type { Slide, ViralReference } from "../../../shared/types";
import { fmtCount } from "../api";
import { Carousel } from "./Slides";

/** Left panel: the viral post or format the current card remixes. */
export function RemixedFrom({ reference }: { reference: ViralReference | undefined }) {
  const slides: Slide[] = useMemo(
    () =>
      (reference?.slides ?? []).map((text, i) => ({
        id: `${reference!.id}-${i}`,
        text,
        imageQuery: "",
        imageUrl: null,
        background: ["#111111", "#2b2b2b"] as [string, string],
        textY: 0.5,
      })),
    [reference],
  );
  if (!reference) return <div className="remixed-from empty" />;
  return (
    <aside className="remixed-from">
      <div className="remixed-title">
        Remixed From
        {reference.isTemplate && <span className="pill-muted">Format</span>}
      </div>
      <Carousel key={reference.id} slides={slides} size="sm" dotsStyle="light">
        {(reference.likes !== undefined || reference.views !== undefined) && (
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
        )}
      </Carousel>
      <p className="ref-structure">{reference.structure}</p>
      {reference.sourceUrl && (
        <a className="ref-link" href={reference.sourceUrl} target="_blank" rel="noreferrer">
          View original ↗
        </a>
      )}
    </aside>
  );
}
