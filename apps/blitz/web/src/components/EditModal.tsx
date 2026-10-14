import { motion } from "framer-motion";
import { useState } from "react";
import { MOODS, type Mood } from "../../../shared/scene";
import type { Slide } from "../../../shared/types";
import { api, type BlitzCard } from "../api";
import { CardMedia } from "./CardMedia";

const SCENE_LABELS: Record<Mood, string> = {
  "dusk-forest": "Forest at dusk",
  "city-night": "City at night",
  "golden-hour": "Golden hour hills",
  ocean: "Ocean sunset",
  interior: "Cozy interior",
  mountains: "Misty mountains",
  court: "Outdoor court",
};

interface Props {
  card: BlitzCard;
  startIndex?: number;
  onClose: () => void;
  onSaved: (card: BlitzCard) => void;
}

export function EditModal({ card, startIndex = 0, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<BlitzCard>(() => structuredClone(card));
  const [index, setIndex] = useState(startIndex);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slide = draft.slides[index];
  const isVideo = draft.format === "video";

  const newVideo = async () => {
    setBusy("video");
    setError(null);
    try {
      await api.patchCard(card.id, { slides: draft.slides });
      const { card: updated } = await api.newVideo(card.id, slide.imageQuery);
      setDraft((d) => ({ ...d, video: updated.video }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const setSlide = (patch: Partial<Slide>) =>
    setDraft((d) => ({ ...d, slides: d.slides.map((s, i) => (i === index ? { ...s, ...patch } : s)) }));

  const imageAction = async (label: string, body: { query?: string; imageUrl?: string | null }) => {
    setBusy(label);
    setError(null);
    try {
      // Persist the current text edits first so the server's copy has this slide.
      await api.patchCard(card.id, { slides: draft.slides });
      const { card: updated } = await api.slideImage(card.id, slide.id, body);
      const fresh = updated.slides.find((s) => s.id === slide.id)!;
      setSlide({ imageUrl: fresh.imageUrl, imageQuery: fresh.imageQuery });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy("upload");
    try {
      const { url } = await api.upload(file);
      setSlide({ imageUrl: url });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const addSlide = () => {
    const base = draft.slides[index];
    const s: Slide = { ...base, id: crypto.randomUUID(), text: "New slide" };
    setDraft((d) => ({ ...d, slides: [...d.slides.slice(0, index + 1), s, ...d.slides.slice(index + 1)] }));
    setIndex(index + 1);
  };
  const removeSlide = () => {
    if (draft.slides.length <= 1) return;
    setDraft((d) => ({ ...d, slides: d.slides.filter((_, i) => i !== index) }));
    setIndex(Math.max(0, index - 1));
  };
  const move = (dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= draft.slides.length) return;
    setDraft((d) => {
      const slides = [...d.slides];
      [slides[index], slides[j]] = [slides[j], slides[index]];
      return { ...d, slides };
    });
    setIndex(j);
  };

  const save = async () => {
    setBusy("save");
    setError(null);
    try {
      const { card: saved } = await api.patchCard(card.id, {
        theme: draft.theme,
        slides: draft.slides,
        caption: draft.caption,
        hashtags: draft.hashtags,
      });
      onSaved(saved);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="modal edit-modal" role="dialog" initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ type: "spring", stiffness: 420, damping: 34 }} aria-label="Edit content">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="edit-preview">
          <CardMedia card={draft} index={index} onIndex={setIndex} />
          <div className="slide-tabs" hidden={isVideo}>
            {draft.slides.map((s, i) => (
              <button key={s.id} className={i === index ? "on" : ""} onClick={() => setIndex(i)}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="edit-form">
          <h2>Edit content</h2>
          <label>
            Concept
            <input value={draft.theme} onChange={(e) => setDraft({ ...draft, theme: e.target.value })} />
          </label>

          <div className="slide-editor">
            <div className="row-between" hidden={isVideo}>
              <strong>
                Slide {index + 1} of {draft.slides.length}
              </strong>
              <div className="mini-btns">
                <button onClick={() => move(-1)} disabled={index === 0} title="Move left">
                  ←
                </button>
                <button onClick={() => move(1)} disabled={index === draft.slides.length - 1} title="Move right">
                  →
                </button>
                <button onClick={addSlide} title="Duplicate as new slide">
                  + Slide
                </button>
                <button onClick={removeSlide} disabled={draft.slides.length <= 1} title="Delete slide">
                  Delete
                </button>
              </div>
            </div>
            <label>
              {isVideo ? "Text on video" : "Text"}
              <textarea rows={isVideo ? 7 : 3} value={slide.text} onChange={(e) => setSlide({ text: e.target.value })} autoFocus />
            </label>
            <label>
              Text position
              <input type="range" min={0.1} max={0.9} step={0.01} value={slide.textY} onChange={(e) => setSlide({ textY: Number(e.target.value) })} />
            </label>
            {isVideo ? (
              <label>
                Background video
                <div className="input-row">
                  <input value={slide.imageQuery} onChange={(e) => setSlide({ imageQuery: e.target.value })} placeholder="e.g. woman running sunset path" />
                  <button disabled={!!busy} onClick={newVideo}>
                    {busy === "video" ? "…" : "New video"}
                  </button>
                </div>
                <small className="muted">{draft.video ? `Clip by ${draft.video.credit}` : "No clip yet: add a Pexels or Pixabay key to get matching footage."}</small>
              </label>
            ) : (
            <>
            <label>
              Image search
              <div className="input-row">
                <input value={slide.imageQuery} onChange={(e) => setSlide({ imageQuery: e.target.value })} />
                <button disabled={!!busy} onClick={() => imageAction("search", { query: slide.imageQuery })}>
                  {busy === "search" ? "…" : "New image"}
                </button>
              </div>
            </label>
            <div className="input-row">
              <label className="file-btn">
                {busy === "upload" ? "Uploading…" : "Upload image"}
                <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => upload(e.target.files?.[0])} />
              </label>
              {slide.imageUrl && <button onClick={() => setSlide({ imageUrl: null })}>Use painted scene</button>}
            </div>
            </>
            )}
            {!slide.imageUrl && !draft.video && (
              <label>
                Painted scene
                <select value={slide.scene ?? ""} onChange={(e) => setSlide({ scene: (e.target.value || null) as Mood | null })}>
                  <option value="">Auto (from image search)</option>
                  {MOODS.map((m) => (
                    <option key={m} value={m}>
                      {SCENE_LABELS[m]}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <label>
            Caption
            <textarea rows={3} value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} />
          </label>
          <label>
            Hashtags
            <input
              value={draft.hashtags.map((h) => `#${h}`).join(" ")}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  hashtags: e.target.value
                    .split(/[\s,]+/)
                    .map((h) => h.replace(/^#/, ""))
                    .filter(Boolean),
                })
              }
            />
          </label>

          {error && <div className="banner-error">{error}</div>}
          <div className="modal-footer">
            <button className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" disabled={!!busy} onClick={save}>
              {busy === "save" ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
