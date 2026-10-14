import { useEffect, useState } from "react";
import { api, fmtCount, type IntegrationsStatus, type ProductProfile, type ViralReference } from "../api";
import { ProfileForm } from "./ProfileForm";
import { serviceIcon, serviceLabel } from "./icons";

type Section = "integrations" | "brand" | "remix";

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
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal settings-modal" role="dialog" aria-label="Settings">
        <nav className="settings-nav">
          <div className="settings-label">SETTINGS</div>
          <button className={section === "integrations" ? "on" : ""} onClick={() => setSection("integrations")}>
            <span aria-hidden>🔌</span> Integrations
          </button>
          <button className={section === "brand" ? "on" : ""} onClick={() => setSection("brand")}>
            <span aria-hidden>🏷️</span> Brand profile
          </button>
          <button className={section === "remix" ? "on" : ""} onClick={() => setSection("remix")}>
            <span aria-hidden>🔀</span> Remix library
          </button>
        </nav>
        <div className="settings-body">
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
          {section === "integrations" && <Integrations />}
          {section === "brand" && (
            <>
              <h2>Brand profile</h2>
              <p className="muted">Blitz reads this to remix viral formats for your product.</p>
              <ProfileForm initial={profile} onSaved={onProfileSaved} />
            </>
          )}
          {section === "remix" && <RemixLibrary />}
        </div>
      </div>
    </div>
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
        <b>Content AI</b>
        <ul className="plain">
          <li>Claude (site analysis & remixes): {status?.claude ? "on" : "off (set ANTHROPIC_API_KEY)"}</li>
          <li>Pexels stock photos: {status?.pexels ? "on" : "off (set PEXELS_API_KEY)"}</li>
        </ul>
      </div>
    </>
  );
}

function RemixLibrary() {
  const [refs, setRefs] = useState<ViralReference[]>([]);
  const [form, setForm] = useState({ hook: "", slides: "", sourceUrl: "", likes: "", views: "", whyItWorks: "" });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.references().then((r) => setRefs(r.references));
  }, []);

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
        <button className="btn-primary" disabled={!form.hook} onClick={add}>
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
