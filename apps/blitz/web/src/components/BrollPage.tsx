import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, Download, ExternalLink, Eye, Film, Heart, Loader2, Search, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { USABLE_RIGHTS, type ClipRights } from "../../../shared/types";
import { api, fmtCount, type BrollClip } from "../api";
import { toast } from "./Toaster";

type Filter = "all" | "ready" | "permission";

const RIGHTS: Record<ClipRights, { label: string; tone: string }> = {
  owned: { label: "Your footage", tone: "ok" },
  licensed: { label: "Licensed", tone: "ok" },
  cleared: { label: "Permission granted", tone: "ok" },
  needs_permission: { label: "Needs permission", tone: "warn" },
  requested: { label: "Permission requested", tone: "info" },
  declined: { label: "Declined", tone: "muted" },
};

export function BrollPage() {
  const [clips, setClips] = useState<BrollClip[] | null>(null);
  const [apify, setApify] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState<BrollClip | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .broll()
      .then((r) => {
        setClips(r.clips);
        setApify(r.apify);
      })
      .catch((e) => toast.error(e.message));
  }, []);

  const replace = (c: BrollClip) => setClips((xs) => (xs ?? []).map((x) => (x.id === c.id ? c : x)));

  const shown = useMemo(() => {
    const list = clips ?? [];
    if (filter === "ready") return list.filter((c) => c.fileUrl && USABLE_RIGHTS.includes(c.rights));
    if (filter === "permission") return list.filter((c) => c.rights === "needs_permission" || c.rights === "requested");
    return list;
  }, [clips, filter]);

  const ready = (clips ?? []).filter((c) => c.fileUrl && USABLE_RIGHTS.includes(c.rights)).length;

  const discover = async () => {
    setDiscovering(true);
    try {
      const r = await api.discoverBroll(query.trim() || undefined);
      setClips((xs) => [...(xs ?? []), ...r.clips]);
      toast.success(r.added ? `Found ${r.added} popular clips. Ask the creators before using them` : "No new clips for that search");
      setFilter("permission");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDiscovering(false);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const title = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
        const { clip } = await api.uploadBroll(f, title, title);
        setClips((xs) => [clip, ...(xs ?? [])]);
      }
      toast.success("Added to your B-roll library");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const setRights = async (c: BrollClip, rights: ClipRights, rightsNote?: string) => {
    try {
      const { clip } = await api.patchBroll(c.id, { rights, rightsNote });
      replace(clip);
      return clip;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    }
  };

  const download = async (c: BrollClip) => {
    replace({ ...c, fileUrl: null, title: c.title });
    try {
      const { clip } = await api.fetchBroll(c.id);
      replace(clip);
      toast.success("Clip downloaded. Blitz will use it for matching posts");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (c: BrollClip) => {
    await api.deleteBroll(c.id);
    setClips((xs) => (xs ?? []).filter((x) => x.id !== c.id));
  };

  return (
    <div className="broll">
      <header className="page-head">
        <div>
          <h1>B-roll</h1>
          <p className="sub">
            {ready} clip{ready === 1 ? "" : "s"} ready. Wall of Text posts use these first, then stock footage.
          </p>
        </div>
        <div className="head-actions">
          <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm" multiple hidden onChange={(e) => upload(e.target.files)} />
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />} Upload clips
          </button>
        </div>
      </header>

      <div className="discover">
        <div className="discover-text">
          <b>Find popular clips in your niche</b>
          <span>
            Searches TikTok through Apify. Clips land here as candidates: message the creator, and once they say yes, mark the clip as
            cleared and download it.
          </span>
        </div>
        <div className="discover-form">
          <div className="input-icon">
            <Search size={15} />
            <input
              placeholder="Hashtags, e.g. running, sneakers (blank = your brand topics)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apify && !discovering && discover()}
            />
          </div>
          <button className="btn btn-dark" onClick={discover} disabled={!apify || discovering} title={apify ? "" : "Set APIFY_TOKEN on the server"}>
            {discovering ? <Loader2 size={15} className="spin" /> : <Search size={15} />} {discovering ? "Searching TikTok…" : "Search TikTok"}
          </button>
        </div>
        {!apify && <small className="muted">Add APIFY_TOKEN to apps/blitz/.env to turn this on.</small>}
      </div>

      <div className="segmented">
        {(
          [
            ["all", "All"],
            ["ready", "Ready to use"],
            ["permission", "Needs permission"],
          ] as [Filter, string][]
        ).map(([id, label]) => (
          <button key={id} className={filter === id ? "on" : ""} onClick={() => setFilter(id)}>
            {filter === id && <motion.span layoutId="seg" className="seg-pill" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {!clips ? (
        <div className="grid-clips">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="clip skeleton" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="empty-state">
          <Film size={26} />
          <b>{filter === "ready" ? "No clips ready yet" : "Nothing here yet"}</b>
          <span>Upload your own footage, or search TikTok for clips to request.</span>
        </div>
      ) : (
        <motion.div layout className="grid-clips">
          <AnimatePresence initial={false}>
            {shown.map((c) => (
              <ClipTile
                key={c.id}
                clip={c}
                onRequested={() => setRights(c, "requested")}
                onClear={() => setClearing(c)}
                onDecline={() => setRights(c, "declined")}
                onDownload={() => download(c)}
                onRemove={() => remove(c)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {clearing && (
          <ClearDialog
            clip={clearing}
            onClose={() => setClearing(null)}
            onConfirm={async (note) => {
              const updated = await setRights(clearing, "cleared", note);
              setClearing(null);
              if (updated) void download(updated);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ClipTile({
  clip,
  onRequested,
  onClear,
  onDecline,
  onDownload,
  onRemove,
}: {
  clip: BrollClip;
  onRequested: () => void;
  onClear: () => void;
  onDecline: () => void;
  onDownload: () => void;
  onRemove: () => void;
}) {
  const [hover, setHover] = useState(false);
  const usable = Boolean(clip.fileUrl) && USABLE_RIGHTS.includes(clip.rights);
  const r = RIGHTS[clip.rights];
  return (
    <motion.div
      layout
      className={`clip ${clip.rights === "declined" ? "dim" : ""}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
    >
      <div className="clip-media" style={clip.thumbnail ? { backgroundImage: `url("${clip.thumbnail}")` } : undefined}>
        {usable && hover && <video src={clip.fileUrl!} autoPlay muted loop playsInline />}
        {!clip.thumbnail && !usable && <Film size={22} className="clip-placeholder" />}
        <span className={`rights rights-${r.tone}`}>
          {r.tone === "ok" ? <ShieldCheck size={12} /> : r.tone === "info" ? <Clock size={12} /> : null}
          {r.label}
        </span>
        {(clip.views !== undefined || clip.likes !== undefined) && (
          <div className="clip-stats">
            {clip.views !== undefined && (
              <span>
                <Eye size={12} /> {fmtCount(clip.views)}
              </span>
            )}
            {clip.likes !== undefined && (
              <span>
                <Heart size={12} /> {fmtCount(clip.likes)}
              </span>
            )}
          </div>
        )}
        <button className="clip-remove" aria-label="Remove" onClick={onRemove}>
          <Trash2 size={13} />
        </button>
      </div>
      <div className="clip-body">
        <b title={clip.title}>{clip.title}</b>
        <small>{clip.creator ? `@${clip.creator}` : clip.source === "upload" ? "Uploaded" : "TikTok"}</small>
        <div className="clip-actions">
          {clip.source === "tiktok" && clip.sourceUrl && (
            <a className="btn btn-xs btn-ghost" href={clip.sourceUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={12} /> Open
            </a>
          )}
          {clip.rights === "needs_permission" && (
            <button className="btn btn-xs btn-ghost" onClick={onRequested}>
              <Clock size={12} /> I asked them
            </button>
          )}
          {clip.rights === "requested" && (
            <>
              <button className="btn btn-xs btn-primary" onClick={onClear}>
                <Check size={12} /> They said yes
              </button>
              <button className="btn btn-xs btn-ghost" onClick={onDecline}>
                <X size={12} />
              </button>
            </>
          )}
          {clip.rights === "cleared" && !clip.fileUrl && (
            <button className="btn btn-xs btn-primary" onClick={onDownload}>
              <Download size={12} /> Download
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ClearDialog({ clip, onClose, onConfirm }: { clip: BrollClip; onClose: () => void; onConfirm: (note: string) => void }) {
  const [note, setNote] = useState(`@${clip.creator ?? "creator"} approved use by DM on ${new Date().toLocaleDateString()}`);
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="modal small-modal"
        role="dialog"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
      >
        <h2>Confirm permission</h2>
        <p className="muted">Keep a short record of how the creator agreed. It's saved with the clip in case anyone asks later.</p>
        <label>
          Permission note
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!note.trim()} onClick={() => onConfirm(note.trim())}>
            <ShieldCheck size={15} /> Mark cleared & download
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
