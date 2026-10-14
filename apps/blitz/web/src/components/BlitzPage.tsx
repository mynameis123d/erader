import { useCallback, useEffect, useRef, useState } from "react";
import { api, type BlitzCard, type RefMap } from "../api";
import { EditModal } from "./EditModal";
import { RemixedFrom } from "./RemixedFrom";
import { CardMedia, formatLabel } from "./CardMedia";

const REFILL_BELOW = 3;
const SWIPE_THRESHOLD = 120;

type Fly = "left" | "right" | null;

export function BlitzPage({ onCountsChange }: { onCountsChange: () => void }) {
  const [cards, setCards] = useState<BlitzCard[]>([]);
  const [refs, setRefs] = useState<RefMap>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dx, setDx] = useState(0);
  const [fly, setFly] = useState<Fly>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [lastDecided, setLastDecided] = useState<{ card: BlitzCard; decision: "approve" | "reject" } | null>(null);
  const drag = useRef<{ x: number; id: number } | null>(null);

  const top = cards[0];

  const refill = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await api.generate(3);
      setRefs((r) => ({ ...r, ...res.references }));
      setCards((c) => [...c, ...res.cards.filter((n) => !c.some((x) => x.id === n.id))]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }, []);

  useEffect(() => {
    api
      .feed()
      .then((res) => {
        setCards(res.cards);
        setRefs(res.references);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && !generating && !error && cards.length < REFILL_BELOW) void refill();
  }, [loading, generating, error, cards.length, refill]);

  useEffect(() => {
    setSlideIndex(0);
    setWhyOpen(false);
  }, [top?.id]);

  const decide = useCallback(
    (decision: "approve" | "reject") => {
      if (!top || fly) return;
      setFly(decision === "approve" ? "right" : "left");
      setTimeout(() => {
        setCards((c) => c.slice(1));
        setFly(null);
        setDx(0);
        setLastDecided({ card: top, decision });
        api
          .decide(top.id, decision)
          .then((r) => {
            if (r.publishing) {
              setToast(`Sending "${top.theme}" to your channels via Buffer…`);
              setTimeout(() => setToast(null), 3500);
            }
            onCountsChange();
          })
          .catch((e) => setError(e.message));
      }, 260);
    },
    [top, fly, onCountsChange],
  );

  const undo = useCallback(async () => {
    if (!lastDecided) return;
    const { card } = lastDecided;
    setLastDecided(null);
    await api.decide(card.id, "undo");
    setCards((c) => [card, ...c]);
    onCountsChange();
  }, [lastDecided, onCountsChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing || (e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "ArrowRight") decide("approve");
      else if (e.key === "ArrowLeft") decide("reject");
      else if (e.key.toLowerCase() === "e" && top) setEditing(true);
      else if ((e.key.toLowerCase() === "z" && (e.metaKey || e.ctrlKey)) || e.key.toLowerCase() === "u") void undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, undo, editing, top]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (fly) return;
    drag.current = { x: e.clientX, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (drag.current?.id === e.pointerId) setDx(e.clientX - drag.current.x);
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    if (dx > SWIPE_THRESHOLD) decide("approve");
    else if (dx < -SWIPE_THRESHOLD) decide("reject");
    else setDx(0);
  };

  const transform = fly
    ? `translateX(${fly === "right" ? 140 : -140}%) rotate(${fly === "right" ? 18 : -18}deg)`
    : `translateX(${dx}px) rotate(${dx / 18}deg)`;

  if (loading) return <div className="center-msg">Loading…</div>;

  return (
    <div className="blitz">
      <RemixedFrom reference={top ? refs[top.referenceId] : undefined} />

      <section className="blitz-main">
        {top ? (
          <>
            <div className="chips">
              <span className="chip chip-gray">{formatLabel(top)}</span>
              <span className="chip chip-green">{top.theme}</span>
            </div>
            <div className="why-wrap">
              <button className="why-btn" onClick={() => setWhyOpen((o) => !o)}>
                <span aria-hidden>🧠</span> Why This Content?
              </button>
              {whyOpen && (
                <div className="why-pop" role="dialog">
                  <p>{top.why}</p>
                  <small>{top.generator === "claude" ? "Remixed by Claude" : "Template remix (add ANTHROPIC_API_KEY for AI remixes)"}</small>
                </div>
              )}
            </div>

            <div className={`stack ${top.format === "video" ? "tall" : ""}`}>
              {cards[2] && <div className="stack-ghost ghost-2" />}
              {cards[1] && <div className="stack-ghost ghost-1" />}
              <div
                className={`card ${fly ? "flying" : dx === 0 ? "settle" : ""}`}
                style={{ transform }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                <CardMedia card={top} index={slideIndex} onIndex={setSlideIndex} />
                <div className="stamp stamp-yes" style={{ opacity: Math.max(0, dx / SWIPE_THRESHOLD) }}>
                  APPROVE
                </div>
                <div className="stamp stamp-no" style={{ opacity: Math.max(0, -dx / SWIPE_THRESHOLD) }}>
                  SKIP
                </div>
              </div>
            </div>

            <div className="actions">
              <div className="action-col">
                <button className="round-btn big" aria-label="Reject" onClick={() => decide("reject")}>
                  <svg viewBox="0 0 24 24" width="30" height="30" stroke="#ef3340" strokeWidth="2.4" fill="none" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
                <kbd>←</kbd>
              </div>
              <button className="edit-btn" onClick={() => setEditing(true)}>
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                </svg>
                Edit
              </button>
              <div className="action-col">
                <button className="round-btn big" aria-label="Approve" onClick={() => decide("approve")}>
                  <svg viewBox="0 0 24 24" width="32" height="32" stroke="#16b364" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12.5l5 5L20 6.5" />
                  </svg>
                </button>
                <kbd>→</kbd>
              </div>
            </div>
          </>
        ) : (
          <div className="center-msg">{generating ? "Finding fresh viral formats for you…" : error ? null : "No cards right now."}</div>
        )}

        {error && (
          <div className="banner-error">
            {error} <button onClick={() => void refill()}>Retry</button>
          </div>
        )}
        {lastDecided && (
          <button className="undo" onClick={() => void undo()}>
            ↶ Undo {lastDecided.decision === "approve" ? "approve" : "skip"}
          </button>
        )}
        {generating && top && <div className="generating">Generating more…</div>}
        {toast && <div className="toast">{toast}</div>}
      </section>

      {editing && top && (
        <EditModal
          card={top}
          startIndex={slideIndex}
          onClose={() => setEditing(false)}
          onSaved={(card) => setCards((c) => c.map((x) => (x.id === card.id ? card : x)))}
        />
      )}
    </div>
  );
}
