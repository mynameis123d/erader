import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { BufferChannel, PublishMode } from "../../../shared/types";
import { api, DEMO, type BlitzCard, type PublishRecord } from "../api";
import { EditModal } from "./EditModal";
import { CardMedia, formatLabel } from "./CardMedia";
import { toast } from "./Toaster";
import { Inbox, Loader2, Pencil, Send, Undo2 } from "lucide-react";
import { serviceIcon, serviceLabel } from "./icons";

export function QueuePage({ onCountsChange }: { onCountsChange: () => void }) {
  const [tab, setTab] = useState<"approved" | "published">("approved");
  const [cards, setCards] = useState<BlitzCard[] | null>(null);
  const [publishing, setPublishing] = useState<BlitzCard | null>(null);
  const [editing, setEditing] = useState<BlitzCard | null>(null);
  const [sending, setSending] = useState(false);

  const load = () => api.cards(tab).then((r) => setCards(r.cards));
  useEffect(() => {
    setCards(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const unapprove = async (c: BlitzCard) => {
    await api.decide(c.id, "undo");
    await load();
    onCountsChange();
  };

  const sendAll = async () => {
    if (!cards?.length) return;
    const settings = await api.publishingSettings().catch(() => null);
    if (!settings?.channelIds.length) {
      toast.info("Pick your channels once in One-click publishing, then Send all uses them");
      return;
    }
    setSending(true);
    let ok = 0;
    for (const c of cards) {
      try {
        const { records } = await api.publish(c.id, { channelIds: settings.channelIds, mode: settings.mode, asVideo: settings.slideshowsAsVideo });
        if (records.some((r) => r.ok)) ok++;
      } catch (e) {
        toast.error(`${c.theme}: ${(e as Error).message}`);
      }
    }
    setSending(false);
    if (ok) toast.success(`Sent ${ok} post${ok === 1 ? "" : "s"} to Buffer`);
    await load();
    onCountsChange();
  };

  return (
    <div className="queue">
      <header className="page-head">
        <div>
          <h1>Content</h1>
          <p className="sub">Approved posts, and everything already sent to Buffer.</p>
        </div>
        {tab === "approved" && cards && cards.length > 0 && (
          <div className="head-actions">
            <button className="btn btn-primary" onClick={sendAll} disabled={sending}>
              {sending ? <Loader2 size={15} className="spin" /> : <Send size={15} />} {sending ? "Sending…" : `Send all ${cards.length}`}
            </button>
          </div>
        )}
      </header>
      <div className="segmented">
        {(
          [
            ["approved", "Approved"],
            ["published", "Sent to Buffer"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
            {tab === id && <motion.span layoutId="content-tab" className="seg-pill" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <span>{label}</span>
          </button>
        ))}
      </div>
      {!cards ? (
        <div className="queue-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="queue-card skeleton-card" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="empty-state">
          {tab === "approved" ? <Inbox size={26} /> : <Send size={26} />}
          <b>{tab === "approved" ? "Nothing approved yet" : "Nothing sent yet"}</b>
          <span>{tab === "approved" ? "Swipe right on cards in Blitz and they land here, ready to send." : "Posts you send to Buffer show up here with their status."}</span>
        </div>
      ) : (
        <motion.div className="queue-grid" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
          <AnimatePresence>
            {cards.map((c) => {
              const sent = c.publishes.filter((r) => r.ok).length;
              const failed = c.publishes.filter((r) => !r.ok).length;
              return (
                <motion.article
                  key={c.id}
                  layout
                  className="queue-card"
                  variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                  exit={{ opacity: 0, scale: 0.96 }}
                >
                  <div className="queue-media">
                    <CardMedia card={c} size="sm" autoPlay={false} />
                  </div>
                  <div className="queue-meta">
                    <div className="queue-badges">
                      <span className="badge">{formatLabel(c)}</span>
                      {sent > 0 && <span className="badge badge-ok">Sent ×{sent}</span>}
                      {failed > 0 && <span className="badge badge-no">{failed} failed</span>}
                    </div>
                    <b className="queue-title">{c.theme}</b>
                    <p className="caption">{c.caption}</p>
                    {c.publishes.length > 0 && <PublishLog records={c.publishes} />}
                    <div className="queue-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => setPublishing(c)}>
                        <Send size={13} /> Publish
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(c)}>
                        <Pencil size={13} /> Edit
                      </button>
                      {tab === "approved" && (
                        <button className="btn btn-ghost btn-sm" onClick={() => void unapprove(c)} title="Move back to the Blitz feed">
                          <Undo2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
      <AnimatePresence>
      {publishing && (
        <PublishDialog
          card={publishing}
          onClose={() => setPublishing(null)}
          onDone={() => {
            void load();
            onCountsChange();
          }}
        />
      )}
      </AnimatePresence>
      <AnimatePresence>{editing && <EditModal card={editing} onClose={() => setEditing(null)} onSaved={() => void load()} />}</AnimatePresence>
    </div>
  );
}

function PublishLog({ records }: { records: PublishRecord[] }) {
  return (
    <ul className="publish-log">
      {records.map((r, i) => (
        <li key={i} className={r.ok ? "ok" : "fail"}>
          {serviceIcon(r.service)} {serviceLabel(r.service)} · {r.mediaType} · {r.ok ? (DEMO ? "would be sent to Buffer (preview)" : "sent to Buffer") : r.error}
        </li>
      ))}
    </ul>
  );
}

const MAIN_SERVICES = ["tiktok", "instagram", "youtube"];

function PublishDialog({ card, onClose, onDone }: { card: BlitzCard; onClose: () => void; onDone: () => void }) {
  const [channels, setChannels] = useState<BufferChannel[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<PublishMode>("addToQueue");
  const [dueAt, setDueAt] = useState("");
  const [asVideo, setAsVideo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<PublishRecord[] | null>(null);
  const [downloads, setDownloads] = useState<{ images: string[]; video?: string } | null>(null);

  useEffect(() => {
    api
      .integrations()
      .then((s) => {
        if (!s.buffer.ok) throw new Error(s.buffer.error ?? "Buffer is not configured");
        const sorted = [...s.buffer.channels].sort((a, b) => rank(a.service) - rank(b.service));
        setChannels(sorted);
        setSelected(sorted.filter((c) => MAIN_SERVICES.includes(c.service)).map((c) => c.id));
      })
      .catch((e) => setLoadError(e.message));
  }, []);

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.publish(card.id, {
        channelIds: selected,
        mode,
        dueAt: mode === "customScheduled" && dueAt ? new Date(dueAt).toISOString() : undefined,
        asVideo,
      });
      setRecords(res.records);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const exportMedia = async () => {
    setBusy(true);
    setError(null);
    try {
      setDownloads(await api.render(card.id, "9:16", true));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="modal publish-modal" role="dialog" initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ type: "spring", stiffness: 420, damping: 34 }} aria-label="Publish">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2>Publish “{card.theme}”</h2>

        {loadError ? (
          <div className="banner-warn">
            {loadError}. Check Settings → Integrations. You can still export the media below and post it yourself.
          </div>
        ) : !channels ? (
          <p className="muted">Loading Buffer channels…</p>
        ) : channels.length === 0 ? (
          <div className="banner-warn">No channels in Buffer yet. Connect TikTok, Instagram and YouTube in Buffer first.</div>
        ) : (
          <div className="channel-list">
            {channels.map((c) => (
              <label key={c.id} className="channel-row">
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={(e) => setSelected((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))}
                />
                {serviceIcon(c.service)}
                <span>
                  <b>{c.displayName || c.name}</b>
                  <small>
                    {serviceLabel(c.service)}
                    {c.service === "youtube" && " · sent as a Short (video)"}
                    {c.isQueuePaused && " · queue paused"}
                  </small>
                </span>
              </label>
            ))}
          </div>
        )}

        <fieldset className="when">
          <legend>When</legend>
          <label>
            <input type="radio" checked={mode === "addToQueue"} onChange={() => setMode("addToQueue")} /> Next free slot in Buffer queue
          </label>
          <label>
            <input type="radio" checked={mode === "shareNow"} onChange={() => setMode("shareNow")} /> Share now
          </label>
          <label>
            <input type="radio" checked={mode === "customScheduled"} onChange={() => setMode("customScheduled")} /> Schedule
            {mode === "customScheduled" && <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />}
          </label>
        </fieldset>

        {card.format === "video" ? (
          <p className="muted small">Wall of Text posts go out as a vertical video everywhere: TikTok, Instagram Reels and YouTube Shorts.</p>
        ) : (
          <label className="toggle">
            <input type="checkbox" checked={asVideo} onChange={(e) => setAsVideo(e.target.checked)} />
            Send TikTok & Instagram as a video (Reel) instead of a photo carousel
          </label>
        )}

        {records && <PublishLog records={records} />}
        {error && <div className="banner-error">{error}</div>}
        {downloads && (
          <div className="downloads">
            <div className="thumbs">
              {downloads.images.map((u, i) => (
                <a key={i} href={u} target="_blank" rel="noreferrer" title={`Slide ${i + 1}`}>
                  <img src={u} alt={`Rendered slide ${i + 1}`} />
                </a>
              ))}
            </div>
            {downloads.video && (
              <a href={downloads.video} target="_blank" rel="noreferrer">
                Open video (MP4)
              </a>
            )}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-ghost" disabled={busy} onClick={exportMedia}>
            Preview export
          </button>
          <button className="btn-primary" disabled={busy || !selected.length || !!loadError || (mode === "customScheduled" && !dueAt)} onClick={publish}>
            {busy ? "Working…" : `Send to ${selected.length} channel${selected.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function rank(service: string) {
  const i = MAIN_SERVICES.indexOf(service);
  return i === -1 ? 99 : i;
}
