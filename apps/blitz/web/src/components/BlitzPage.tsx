import { AnimatePresence, animate, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Brain, Check, ExternalLink, Link2, Pencil, RefreshCw, Sparkles, Undo2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type AppState, type BlitzCard, type RefMap } from "../api";
import type { Section } from "./SettingsModal";
import { SetupChecklist } from "./SetupChecklist";
import { CardMedia, formatLabel } from "./CardMedia";
import { EditModal } from "./EditModal";
import { RemixedFrom } from "./RemixedFrom";
import { toast } from "./Toaster";
import { serviceIcon } from "./icons";

const REFILL_BELOW = 3;
const SWIPE_DISTANCE = 140;
const SWIPE_VELOCITY = 650;

type Decision = "approve" | "reject";

const WRITING_STEPS = ["Reading what's trending in your niche", "Matching formats to your brand", "Writing hooks and captions", "Picking footage and photos"];

function WritingSteps() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, WRITING_STEPS.length - 1)), 1600);
    return () => clearInterval(t);
  }, []);
  return (
    <ol className="writing-steps">
      {WRITING_STEPS.map((label, i) => (
        <motion.li key={label} initial={{ opacity: 0, x: -6 }} animate={{ opacity: i <= step ? 1 : 0.35, x: 0 }} transition={{ delay: i * 0.08 }} className={i < step ? "done" : i === step ? "now" : ""}>
          <span className="ws-dot">{i < step ? <Check size={10} strokeWidth={3} /> : null}</span>
          {label}
        </motion.li>
      ))}
    </ol>
  );
}

export function BlitzPage({
  onCountsChange,
  caps,
  onOpenSettings,
}: {
  onCountsChange: () => void;
  caps?: AppState["capabilities"];
  onOpenSettings?: (s: Section) => void;
}) {
  const [cards, setCards] = useState<BlitzCard[]>([]);
  const [refs, setRefs] = useState<RefMap>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [exitDir, setExitDir] = useState<1 | -1>(1);
  const [lastDecided, setLastDecided] = useState<{ card: BlitzCard; decision: Decision } | null>(null);
  const [session, setSession] = useState({ approved: 0, skipped: 0 });
  const busy = useRef(false);
  const undoRef = useRef<() => Promise<void>>(async () => undefined);

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

  useEffect(() => setSlideIndex(0), [top?.id]);

  const decide = useCallback(
    (decision: Decision) => {
      if (!top || busy.current) return;
      busy.current = true;
      setExitDir(decision === "approve" ? 1 : -1);
      setCards((c) => c.slice(1));
      setLastDecided({ card: top, decision });
      setSession((s) => (decision === "approve" ? { ...s, approved: s.approved + 1 } : { ...s, skipped: s.skipped + 1 }));
      setTimeout(() => (busy.current = false), 220);
      api
        .decide(top.id, decision)
        .then((r) => {
          if (r.publishing) toast.success(`“${top.theme}” is on its way to your channels`);
          else if (decision === "approve") toast.info(`Approved “${top.theme}”`, { label: "Undo", run: () => void undoRef.current() });
          onCountsChange();
        })
        .catch((e) => toast.error(e.message));
    },
    [top, onCountsChange],
  );

  const undo = useCallback(async () => {
    if (!lastDecided) return;
    const { card, decision } = lastDecided;
    setLastDecided(null);
    setSession((s) => (decision === "approve" ? { ...s, approved: s.approved - 1 } : { ...s, skipped: s.skipped - 1 }));
    await api.decide(card.id, "undo");
    setExitDir(decision === "approve" ? 1 : -1);
    setCards((c) => [card, ...c]);
    onCountsChange();
  }, [lastDecided, onCountsChange]);

  undoRef.current = undo;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing || (e.target as HTMLElement).closest("input, textarea, select, [role=dialog]")) return;
      if (e.key === "ArrowRight") decide("approve");
      else if (e.key === "ArrowLeft") decide("reject");
      else if (e.key.toLowerCase() === "e" && top) setEditing(true);
      else if ((e.key.toLowerCase() === "z" && (e.metaKey || e.ctrlKey)) || e.key.toLowerCase() === "u") void undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, undo, editing, top]);

  const reference = top ? refs[top.referenceId] : undefined;

  return (
    <div className="blitz">
      <header className="page-head">
        <div>
          <h1>Blitz</h1>
          <p className="sub">
            {loading ? "Loading your feed…" : `${cards.length} idea${cards.length === 1 ? "" : "s"} ready`}
            {generating && <span className="live-dot"> · writing more</span>}
          </p>
        </div>
        <div className="head-actions">
          <div className="session-pill" title="This session">
            <span className="ok">
              <Check size={13} /> {session.approved}
            </span>
            <span className="no">
              <X size={13} /> {session.skipped}
            </span>
          </div>
          <button className="btn btn-ghost" onClick={() => void refill()} disabled={generating}>
            <RefreshCw size={15} className={generating ? "spin" : ""} /> More ideas
          </button>
        </div>
      </header>

      {caps && onOpenSettings && <SetupChecklist caps={caps} onOpen={onOpenSettings} />}

      <div className="stage">
        <section className="side-panel left">
          <AnimatePresence mode="wait">
            {top && !reference && (
              <motion.div key={`orig-${top.id}`} className="remixed-from original-panel" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                <div className="remixed-title">
                  <Sparkles size={13} /> Create New
                </div>
                <p className="orig-angle">{top.angle ?? "Original idea"}</p>
                <p className="ref-structure">Written from scratch for this content angle in your brand voice. Change angles and voice in Blitz preferences.</p>
              </motion.div>
            )}
            {reference && (
              <motion.div
                key={reference.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <RemixedFrom reference={reference} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="center">
          {top ? (
            <motion.div className="chips" key={`chips-${top.id}`} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
              <span className="chip chip-muted">{formatLabel(top)}</span>
              <span className={`chip ${top.origin === "original" ? "chip-info" : "chip-muted"}`}>{top.origin === "original" ? "Create New" : "Remix"}</span>
              <span className="chip chip-accent">{top.theme}</span>
            </motion.div>
          ) : (
            <div className="chips" />
          )}

          <div className={`deck ${top?.format === "video" ? "tall" : ""}`}>
            {loading || (!top && generating) ? (
              <div className="card-skeleton">
                <div className="shimmer" />
                {loading ? <span>Loading…</span> : <WritingSteps />}
              </div>
            ) : !top ? (
              <div className="deck-empty">
                <Sparkles size={22} />
                <b>{error ? "Couldn't write new ideas" : "You're all caught up"}</b>
                <span>{error ?? "Get another batch whenever you're ready."}</span>
                <button className="btn btn-primary" onClick={() => void refill()}>
                  {error ? "Try again" : "Generate ideas"}
                </button>
              </div>
            ) : (
              <>
                {cards.slice(1, 3).map((c, i) => (
                  <motion.div
                    key={c.id}
                    className="deck-back"
                    initial={false}
                    animate={{ scale: 1 - (i + 1) * 0.045, y: (i + 1) * 14, opacity: 1 - (i + 1) * 0.25 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    style={{ zIndex: 2 - i }}
                  />
                ))}
                <AnimatePresence custom={exitDir} initial={false}>
                  <SwipeCard key={top.id} card={top} dir={exitDir} slideIndex={slideIndex} onSlideIndex={setSlideIndex} onDecide={decide} />
                </AnimatePresence>
              </>
            )}
          </div>

          <div className="actions">
            <ActionButton label="Skip" hint="←" tone="no" onClick={() => decide("reject")} disabled={!top}>
              <X size={28} strokeWidth={2.4} />
            </ActionButton>
            <motion.button className="edit-btn" whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} onClick={() => setEditing(true)} disabled={!top}>
              <Pencil size={16} /> Edit <kbd>E</kbd>
            </motion.button>
            <ActionButton label="Approve" hint="→" tone="yes" onClick={() => decide("approve")} disabled={!top}>
              <Check size={30} strokeWidth={2.6} />
            </ActionButton>
          </div>
          <div className="undo-row">
            <AnimatePresence>
              {lastDecided && (
                <motion.button className="undo" onClick={() => void undo()} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Undo2 size={14} /> Undo {lastDecided.decision === "approve" ? "approve" : "skip"} <kbd>U</kbd>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </section>

        <section className="side-panel right">
          <AnimatePresence mode="wait">
            {top && (
              <motion.div
                key={top.id}
                className="details"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="details-block why">
                  <div className="details-label">
                    <Brain size={14} /> Why this content
                  </div>
                  <p>{top.why}</p>
                  <small>{top.generator === "claude" ? "Written by Claude for your brand" : "Template remix. Add an Anthropic key for AI-written posts"}</small>
                </div>
                <div className="details-block">
                  <div className="details-label">Caption</div>
                  <p className="caption-text">{top.caption}</p>
                  <div className="tags">
                    {top.hashtags.map((h) => (
                      <span key={h}>#{h}</span>
                    ))}
                  </div>
                </div>
                <div className="details-block">
                  <div className="details-label">Goes out as</div>
                  <ul className="targets">
                    <li>
                      {serviceIcon("tiktok", 18)} TikTok <em>{top.format === "slideshow" ? "photo carousel" : "video"}</em>
                    </li>
                    <li>
                      {serviceIcon("instagram", 18)} Instagram <em>{top.format === "slideshow" ? "carousel" : "Reel"}</em>
                    </li>
                    <li>
                      {serviceIcon("youtube", 18)} YouTube <em>Short</em>
                    </li>
                  </ul>
                  {top.video && <small className="credit-line">Footage: {top.video.credit}</small>}
                  {top.format === "hook_demo" && !top.demoVideo && <small className="credit-line">No demo clip yet: upload one to the Media Bank and tag it "demo".</small>}
                </div>
                <div className="details-block">
                  <div className="details-label">
                    <Link2 size={14} /> Sources
                  </div>
                  {top.sources?.length ? (
                    <ul className="sources">
                      {top.sources.map((src, i) => (
                        <li key={i} className={`src-${src.kind}`}>
                          <span className="src-dot" />
                          <div>
                            {src.url ? (
                              <a href={src.url} target="_blank" rel="noreferrer">
                                {src.label} <ExternalLink size={11} />
                              </a>
                            ) : (
                              <b>{src.label}</b>
                            )}
                            {src.detail && <small>{src.detail}</small>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Written from your brand profile. No outside post or footage was used.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      <AnimatePresence>
        {editing && top && (
          <EditModal
            card={top}
            startIndex={slideIndex}
            onClose={() => setEditing(false)}
            onSaved={(card) => {
              setCards((c) => c.map((x) => (x.id === card.id ? card : x)));
              toast.success("Changes saved");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SwipeCard({
  card,
  dir,
  slideIndex,
  onSlideIndex,
  onDecide,
}: {
  card: BlitzCard;
  dir: 1 | -1;
  slideIndex: number;
  onSlideIndex: (i: number) => void;
  onDecide: (d: Decision) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-14, 0, 14]);
  const yes = useTransform(x, [20, SWIPE_DISTANCE], [0, 1]);
  const no = useTransform(x, [-SWIPE_DISTANCE, -20], [1, 0]);
  const glow = useTransform(x, [-SWIPE_DISTANCE, 0, SWIPE_DISTANCE], [
    "0 30px 60px -20px rgba(229,72,77,0.55), 0 0 0 3px rgba(229,72,77,0.7)",
    "0 30px 60px -20px rgba(23,23,26,0.35), 0 0 0 0px rgba(0,0,0,0)",
    "0 30px 60px -20px rgba(19,163,90,0.55), 0 0 0 3px rgba(19,163,90,0.7)",
  ]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) onDecide("approve");
    else if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) onDecide("reject");
    else animate(x, 0, { type: "spring", stiffness: 500, damping: 32 });
  };

  return (
    <motion.div
      className="swipe-card"
      style={{ x, rotate, zIndex: 5, boxShadow: glow }}
      drag="x"
      dragElastic={0.9}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={onDragEnd}
      custom={dir}
      initial={{ scale: 0.94, y: 14, opacity: 0.6 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      variants={{
        exit: (d: 1 | -1) => ({
          x: d * 620,
          rotate: d * 22,
          opacity: 0,
          transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] },
        }),
      }}
      exit="exit"
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
    >
      <CardMedia card={card} index={slideIndex} onIndex={onSlideIndex} />
      <motion.div className="stamp stamp-yes" style={{ opacity: yes }}>
        <Check size={18} strokeWidth={3} /> Approve
      </motion.div>
      <motion.div className="stamp stamp-no" style={{ opacity: no }}>
        <X size={18} strokeWidth={3} /> Skip
      </motion.div>
    </motion.div>
  );
}

function ActionButton({
  children,
  label,
  hint,
  tone,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  hint: string;
  tone: "yes" | "no";
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="action-col">
      <motion.button
        className={`round-btn ${tone}`}
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        whileHover={{ scale: 1.06, y: -2 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 500, damping: 22 }}
      >
        {children}
      </motion.button>
      <kbd>{hint}</kbd>
    </div>
  );
}
