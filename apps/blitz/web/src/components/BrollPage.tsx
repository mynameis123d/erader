import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, Download, ExternalLink, Eye, Film, Heart, Image as ImageIcon, Loader2, Search, ShieldCheck, Square, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { USABLE_RIGHTS, type ClipRights } from "../../../shared/types";
import { api, fmtCount, type BrollClip, type ScrapeJob } from "../api";
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
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [runId, setRunId] = useState("");
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

  // Poll scrape jobs while any is running; reload clips when one finishes.
  const running = jobs.some((j) => !["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(j.status));
  useEffect(() => {
    api.scrapes().then((r) => setJobs(r.scrapes)).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(async () => {
      const r = await api.scrapes().catch(() => null);
      if (!r) return;
      const finished = r.scrapes.filter((j) => j.imported && !jobs.find((o) => o.runId === j.runId)?.imported);
      setJobs(r.scrapes);
      if (finished.length) {
        const fresh = await api.broll();
        setClips(fresh.clips);
        const n = finished.reduce((a, j) => a + (j.imported?.clips ?? 0), 0);
        const refs = finished.reduce((a, j) => a + (j.imported?.references ?? 0), 0);
        toast.success(`Scrape finished: ${n} clips here, ${refs} trending posts for Remix`);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [running, jobs]);

  const importRun = async () => {
    try {
      const { job } = await api.startScrape({ runId: runId.trim() });
      setJobs((j) => [job, ...j.filter((x) => x.runId !== job.runId)]);
      setRunId("");
      toast.info(`Importing Apify run ${job.runId}…`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

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
      const { job } = await api.discoverBroll(query.trim() || undefined);
      setJobs((j) => [job, ...j]);
      toast.info("Scraping TikTok through Apify. Results land here in a minute or two");
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
          <h1>Media Bank</h1>
          <p className="sub">
            {ready} item{ready === 1 ? "" : "s"} ready. Blitz uses your media first, then stock photos and footage. Tag product demos with "demo" for Hook + Demo posts.
          </p>
        </div>
        <div className="head-actions">
          <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} />
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />} Upload media
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
          <button className="btn btn-dark" onClick={discover} disabled={!apify || discovering} title={apify ? "" : "Add your Apify token in Settings → API keys"}>
            {discovering ? <Loader2 size={15} className="spin" /> : <Search size={15} />} {discovering ? "Searching TikTok…" : "Search TikTok"}
          </button>
        </div>
        {!apify && <small className="muted">Add your Apify token in Settings → API keys to turn this on.</small>}
        <div className="discover-form run-import">
          <input placeholder="Or import an existing Apify run ID (e.g. shAvi3SgXuKTxZUCG)" value={runId} onChange={(e) => setRunId(e.target.value)} />
          <button className="btn btn-ghost" disabled={!apify || !/^[A-Za-z0-9]{8,32}$/.test(runId.trim())} onClick={importRun}>
            Import run
          </button>
        </div>
        {jobs.length > 0 && (
          <div className="jobs">
            {jobs.slice(0, 5).map((j) => (
              <div className="job" key={j.runId}>
                <span className={`job-status ${j.status}`}>{j.status === "RUNNING" || j.status === "READY" ? <Loader2 size={11} className="spin" /> : null} {j.status.toLowerCase()}</span>
                <span className="tags-inline">
                  {j.hashtags.map((h) => `#${h}`).join(" ")} · run {j.runId}
                  {j.imported && ` · ${j.imported.clips} clips, ${j.imported.references} trending posts`}
                  {j.error && ` · ${j.error}`}
                </span>
                {(j.status === "RUNNING" || j.status === "READY") && (
                  <button className="btn btn-xs btn-ghost" onClick={() => api.abortScrape(j.runId).then(() => setJobs((xs) => xs.map((x) => (x.runId === j.runId ? { ...x, status: "ABORTED" } : x))))}>
                    <Square size={11} /> Stop
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
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
  const r = clip.source === "website" ? { label: "Your website", tone: "ok" } : clip.kind === "image" && clip.rights === "owned" ? { label: "Your photo", tone: "ok" } : RIGHTS[clip.rights];
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
        {usable && hover && clip.kind !== "image" && <video src={clip.fileUrl!} autoPlay muted loop playsInline />}
        {!clip.thumbnail && !usable && (clip.kind === "image" ? <ImageIcon size={22} className="clip-placeholder" /> : <Film size={22} className="clip-placeholder" />)}
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
        <small>{clip.creator ? `@${clip.creator}` : clip.source === "upload" ? "Uploaded" : clip.source === "website" ? "From your website" : "TikTok"}</small>
        <div className="clip-actions">
          {clip.sourceUrl && (
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
