import { motion } from "framer-motion";
import { Plug, Shuffle, Tag, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { api, DEMO, fmtCount, type IntegrationsStatus, type ProductProfile, type PublishingSettings, type ViralReference } from "../api";
import { ProfileForm } from "./ProfileForm";
import { serviceIcon, serviceLabel } from "./icons";

export type Section = "integrations" | "publishing" | "brand" | "remix";

const BUFFER_APP = "https://publish.buffer.com";
const PLATFORMS: { service: string; note?: string }[] = [
  { service: "tiktok", note: "To add another account, log out of TikTok in your browser first, then connect it in Buffer." },
  { service: "youtube", note: "Blitz posts to YouTube as Shorts (vertical video, rendered automatically)." },
  { service: "instagram", note: "Use an Instagram Business or Creator account and stay logged in to Instagram while connecting it in Buffer." },
];

export function SettingsModal({
  profile,
  initial = "integrations",
  onClose,
  onProfileSaved,
}: {
  profile: ProductProfile | null;
  initial?: Section;
  onClose: () => void;
  onProfileSaved: (p: ProductProfile) => void;
}) {
  const [section, setSection] = useState<Section>(initial);
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="modal settings-modal" role="dialog" initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ type: "spring", stiffness: 420, damping: 34 }} aria-label="Settings">
        <nav className="settings-nav">
          <div className="settings-label">SETTINGS</div>
          <button className={section === "integrations" ? "on" : ""} onClick={() => setSection("integrations")}>
            <Plug size={16} /> Integrations
          </button>
          <button className={section === "publishing" ? "on" : ""} onClick={() => setSection("publishing")}>
            <Zap size={16} /> One-click publishing
          </button>
          <button className={section === "brand" ? "on" : ""} onClick={() => setSection("brand")}>
            <Tag size={16} /> Brand profile
          </button>
          <button className={section === "remix" ? "on" : ""} onClick={() => setSection("remix")}>
            <Shuffle size={16} /> Remix library
          </button>
        </nav>
        <div className="settings-body">
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
          {section === "integrations" && <Integrations />}
          {section === "publishing" && <Publishing />}
          {section === "brand" && (
            <>
              <h2>Brand profile</h2>
              <p className="muted">Blitz reads this to remix viral formats for your product.</p>
              <ProfileForm initial={profile} onSaved={onProfileSaved} />
            </>
          )}
          {section === "remix" && <RemixLibrary />}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Integrations() {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = (refresh = false) => {
    setRefreshing(true);
    api
      .integrations(refresh)
      .then(setStatus)
      .finally(() => setRefreshing(false));
  };
  useEffect(() => load(), []);

  const channels = status?.buffer.channels ?? [];
  const connected = channels.filter((c) => PLATFORMS.some((p) => p.service === c.service)).length;

  return (
    <>
      <h2>Integrations</h2>
      <p className="muted">Publishing goes through Buffer. Connect your social accounts in Buffer and they show up here.</p>
      {DEMO && <div className="note">Preview: these are sample channels. In the real app this list comes live from your Buffer account.</div>}

      <div className="int-card">
        <div className="int-head">
          <span className="svc-fallback buffer">B</span>
          <div>
            <b>Buffer</b>
            <small>
              {!status
                ? "Checking…"
                : !status.buffer.configured
                  ? "No API key. Set BUFFER_API_KEY in apps/blitz/.env"
                  : status.buffer.ok
                    ? `Connected · ${channels.length} channel${channels.length === 1 ? "" : "s"}`
                    : `Error: ${status.buffer.error}`}
            </small>
          </div>
          <div className="int-right">
            {status?.buffer.ok && <span className="ok-dot" title="Connected">✓</span>}
            <button className="btn-small" disabled={refreshing} onClick={() => load(true)}>
              {refreshing ? "…" : "Refresh"}
            </button>
          </div>
        </div>
        {status && !status.publicBaseUrl && (
          <div className="note">
            PUBLIC_BASE_URL is not set. Buffer fetches your rendered slides and videos by URL, so set it to this server's public address (a
            deployment, or a tunnel such as cloudflared or ngrok).
          </div>
        )}
      </div>

      <div className="muted small">{connected}/3 main platforms connected</div>

      {PLATFORMS.map(({ service, note }) => {
        const accounts = channels.filter((c) => c.service === service);
        return (
          <div className="int-card" key={service}>
            <div className="int-head">
              {serviceIcon(service, 28)}
              <div>
                <b>{serviceLabel(service)}</b>
                <small>{accounts.length ? accounts.map((a) => `@${a.displayName || a.name}`).join(", ") : "Not connected"}</small>
              </div>
              <div className="int-right">
                {accounts.length > 0 && <span className="ok-dot">✓</span>}
                <a className={accounts.length ? "btn-small" : "btn-connect"} href={BUFFER_APP} target="_blank" rel="noreferrer">
                  {accounts.length ? "+ Add Account" : "Connect"}
                </a>
              </div>
            </div>
            {note && <div className="note">{note}</div>}
          </div>
        );
      })}

      {channels.filter((c) => !PLATFORMS.some((p) => p.service === c.service)).length > 0 && (
        <div className="int-card">
          <b>Other Buffer channels</b>
          <ul className="plain">
            {channels
              .filter((c) => !PLATFORMS.some((p) => p.service === c.service))
              .map((c) => (
                <li key={c.id}>
                  {serviceIcon(c.service, 18)} {serviceLabel(c.service)}: {c.displayName || c.name}
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="int-card">
        <b>Content sources</b>
        <ul className="plain">
          <li>
            Background videos:{" "}
            {status?.videos === "pexels" ? "Pexels" : status?.videos === "pixabay" ? "Pixabay" : "off. Add PEXELS_API_KEY (free) for real footage behind Wall of Text posts"}
          </li>
          <li>Trending TikToks (Apify): {status?.apify ? "on" : "off. Add APIFY_TOKEN to pull real viral posts to remix"}</li>
        </ul>
      </div>

      <div className="int-card">
        <b>Content AI</b>
        <ul className="plain">
          <li>Claude (site analysis & remixes): {status?.claude ? "on" : "off (set ANTHROPIC_API_KEY)"}</li>
          <li>
            Slide photos:{" "}
            {status?.photos === "pexels"
              ? "Pexels"
              : status?.photos === "openverse"
                ? "Openverse public-domain photos (set PEXELS_API_KEY for better ones)"
                : "painted scenes only"}
            . Painted scenes fill in whenever a photo is missing.
          </li>
        </ul>
      </div>
    </>
  );
}

const MAIN = ["tiktok", "instagram", "youtube"];

function Publishing() {
  const [settings, setSettings] = useState<PublishingSettings | null>(null);
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.publishingSettings().then(setSettings).catch((e) => setError(e.message));
    api.integrations().then(setStatus);
  }, []);

  const channels = (status?.buffer.channels ?? []).filter((c) => MAIN.includes(c.service));
  const update = async (patch: Partial<PublishingSettings>) => {
    if (!settings) return;
    let next = { ...settings, ...patch };
    // Turning it on with nothing picked selects every TikTok/Instagram/YouTube channel.
    if (patch.autoPublish && !next.channelIds.length) next = { ...next, channelIds: channels.map((c) => c.id) };
    setSettings(next);
    setSaved(false);
    try {
      setSettings(await api.savePublishingSettings(next));
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!settings) return <p className="muted">{error ?? "Loading…"}</p>;
  return (
    <>
      <h2>One-click publishing</h2>
      <p className="muted">When this is on, pressing ✓ in Blitz renders the post and sends it to Buffer for every channel below. No extra steps.</p>
      <div className="int-card">
        <label className="toggle big-toggle">
          <input type="checkbox" checked={settings.autoPublish} onChange={(e) => update({ autoPublish: e.target.checked })} />
          Publish automatically when I approve a card
        </label>
      </div>
      <div className="int-card">
        <b>Post to</b>
        {!status ? (
          <p className="muted">Loading channels…</p>
        ) : !status.buffer.ok ? (
          <div className="note">Buffer isn't connected: {status.buffer.error ?? "set BUFFER_API_KEY"}.</div>
        ) : channels.length === 0 ? (
          <div className="note">No TikTok, Instagram or YouTube channels in Buffer yet. Connect them in Buffer, then refresh Integrations.</div>
        ) : (
          <div className="channel-list">
            {channels.map((c) => (
              <label key={c.id} className="channel-row">
                <input
                  type="checkbox"
                  checked={settings.channelIds.includes(c.id)}
                  onChange={(e) =>
                    update({ channelIds: e.target.checked ? [...settings.channelIds, c.id] : settings.channelIds.filter((x) => x !== c.id) })
                  }
                />
                {serviceIcon(c.service)}
                <span>
                  <b>{c.displayName || c.name}</b>
                  <small>{c.service === "youtube" ? "YouTube Shorts" : c.service === "instagram" ? "Instagram (Reels / carousels)" : "TikTok"}</small>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="int-card when">
        <label>
          <input type="radio" checked={settings.mode === "addToQueue"} onChange={() => update({ mode: "addToQueue" })} /> Add to my Buffer queue (posts at
          my scheduled times)
        </label>
        <label>
          <input type="radio" checked={settings.mode === "shareNow"} onChange={() => update({ mode: "shareNow" })} /> Post immediately
        </label>
        <label>
          <input type="checkbox" checked={settings.slideshowsAsVideo} onChange={(e) => update({ slideshowsAsVideo: e.target.checked })} /> Send
          slideshows to TikTok and Instagram as video too (YouTube always gets video)
        </label>
      </div>
      {error && <div className="banner-error">{error}</div>}
      {saved && <p className="muted small">Saved.</p>}
    </>
  );
}

function RemixLibrary() {
  const [refs, setRefs] = useState<ViralReference[]>([]);
  const [form, setForm] = useState({ hook: "", slides: "", sourceUrl: "", likes: "", views: "", whyItWorks: "" });
  const [error, setError] = useState<string | null>(null);
  const [pulling, setPulling] = useState<string | null>(null);
  useEffect(() => {
    api.references().then((r) => setRefs(r.references));
  }, []);

  const pull = async () => {
    setPulling("Pulling trending TikToks through Apify. This can take a minute or two…");
    setError(null);
    try {
      const { added, references } = await api.pullTrending();
      setRefs((r) => [...references, ...r]);
      setPulling(`Added ${added} trending post${added === 1 ? "" : "s"}. Blitz remixes them first.`);
    } catch (e) {
      setError((e as Error).message);
      setPulling(null);
    }
  };

  const add = async () => {
    setError(null);
    try {
      const num = (s: string) => (s.trim() ? Math.round(Number(s.replace(/[, ]/g, ""))) : undefined);
      const { reference } = await api.addReference({
        hook: form.hook,
        slides: form.slides.split("\n").map((s) => s.trim()).filter(Boolean),
        sourceUrl: form.sourceUrl || undefined,
        likes: num(form.likes),
        views: num(form.views),
        whyItWorks: form.whyItWorks || undefined,
      });
      setRefs((r) => [reference, ...r]);
      setForm({ hook: "", slides: "", sourceUrl: "", likes: "", views: "", whyItWorks: "" });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <h2>Remix library</h2>
      <p className="muted">
        Blitz remixes these formats. Add a viral post you've seen and it is used first. Its stats then show in the "Remixed From" panel.
      </p>
      <div className="int-card">
        <div className="int-head">
          <div>
            <b>Trending on TikTok</b>
            <small>Uses your brand topics as hashtags and imports the most-viewed posts with their real stats.</small>
          </div>
          <div className="int-right">
            <button className="btn-primary" disabled={!!pulling && pulling.startsWith("Pulling")} onClick={pull}>
              Pull trending
            </button>
          </div>
        </div>
        {pulling && <p className="muted small">{pulling}</p>}
      </div>
      <div className="int-card ref-form">
        <label>
          Hook (first slide)
          <input value={form.hook} onChange={(e) => setForm({ ...form, hook: e.target.value })} />
        </label>
        <label>
          Other slides, one per line
          <textarea rows={4} value={form.slides} onChange={(e) => setForm({ ...form, slides: e.target.value })} />
        </label>
        <div className="input-row">
          <input placeholder="Post URL (optional)" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} />
          <input placeholder="Likes" value={form.likes} onChange={(e) => setForm({ ...form, likes: e.target.value })} />
          <input placeholder="Views" value={form.views} onChange={(e) => setForm({ ...form, views: e.target.value })} />
        </div>
        <label>
          Why it works (optional)
          <input value={form.whyItWorks} onChange={(e) => setForm({ ...form, whyItWorks: e.target.value })} />
        </label>
        {error && <div className="banner-error">{error}</div>}
        <button className="btn-primary" style={{ justifySelf: "start" }} disabled={!form.hook} onClick={add}>
          Add to library
        </button>
      </div>
      <ul className="ref-list">
        {refs.map((r) => (
          <li key={r.id}>
            <b>{r.hook}</b>
            <small>
              {r.isTemplate ? "Built-in format" : "Imported"} · {r.slides.length} slides
              {r.views !== undefined && ` · ${fmtCount(r.views)} views`}
            </small>
          </li>
        ))}
      </ul>
    </>
  );
}
