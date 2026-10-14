import { useEffect, useState } from "react";
import type { BufferChannel, PublishMode } from "../../../shared/types";
import { api, type BlitzCard, type PublishRecord } from "../api";
import { EditModal } from "./EditModal";
import { Carousel } from "./Slides";
import { serviceIcon, serviceLabel } from "./icons";

export function QueuePage({ onCountsChange }: { onCountsChange: () => void }) {
  const [tab, setTab] = useState<"approved" | "published">("approved");
  const [cards, setCards] = useState<BlitzCard[] | null>(null);
  const [publishing, setPublishing] = useState<BlitzCard | null>(null);
  const [editing, setEditing] = useState<BlitzCard | null>(null);

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

  return (
    <div className="queue">
      <div className="tabs">
        <button className={tab === "approved" ? "on" : ""} onClick={() => setTab("approved")}>
          Approved
        </button>
        <button className={tab === "published" ? "on" : ""} onClick={() => setTab("published")}>
          Sent to Buffer
        </button>
      </div>
      {!cards ? (
        <div className="center-msg">Loading…</div>
      ) : cards.length === 0 ? (
        <div className="center-msg">{tab === "approved" ? "Approve cards in Blitz and they'll show up here." : "Nothing sent yet."}</div>
      ) : (
        <div className="queue-grid">
          {cards.map((c) => (
            <div key={c.id} className="queue-card">
              <Carousel slides={c.slides} size="sm" />
              <div className="queue-meta">
                <span className="chip chip-green">{c.theme}</span>
                <p className="caption">{c.caption}</p>
                {c.publishes.length > 0 && <PublishLog records={c.publishes} />}
                <div className="queue-actions">
                  <button className="btn-primary" onClick={() => setPublishing(c)}>
                    Publish
                  </button>
                  <button className="btn-ghost" onClick={() => setEditing(c)}>
                    Edit
                  </button>
                  {tab === "approved" && (
                    <button className="btn-ghost" onClick={() => void unapprove(c)}>
                      Back to Blitz
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
      {editing && <EditModal card={editing} onClose={() => setEditing(null)} onSaved={() => void load()} />}
    </div>
  );
}

function PublishLog({ records }: { records: PublishRecord[] }) {
  return (
    <ul className="publish-log">
      {records.map((r, i) => (
        <li key={i} className={r.ok ? "ok" : "fail"}>
          {serviceIcon(r.service)} {serviceLabel(r.service)} · {r.mediaType} · {r.ok ? "queued in Buffer" : r.error}
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
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal publish-modal" role="dialog" aria-label="Publish">
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

        <label className="toggle">
          <input type="checkbox" checked={asVideo} onChange={(e) => setAsVideo(e.target.checked)} />
          Send TikTok & Instagram as a video (Reel) instead of a photo carousel
        </label>

        {records && <PublishLog records={records} />}
        {error && <div className="banner-error">{error}</div>}
        {downloads && (
          <div className="downloads">
            {downloads.video && (
              <a href={downloads.video} download>
                Download video
              </a>
            )}
            {downloads.images.map((u, i) => (
              <a key={u} href={u} download>
                Slide {i + 1}
              </a>
            ))}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-ghost" disabled={busy} onClick={exportMedia}>
            Export media
          </button>
          <button className="btn-primary" disabled={busy || !selected.length || !!loadError || (mode === "customScheduled" && !dueAt)} onClick={publish}>
            {busy ? "Working…" : `Send to ${selected.length} channel${selected.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function rank(service: string) {
  const i = MAIN_SERVICES.indexOf(service);
  return i === -1 ? 99 : i;
}
