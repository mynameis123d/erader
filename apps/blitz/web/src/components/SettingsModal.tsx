import { motion } from "framer-motion";
import { CheckCircle2, ExternalLink, KeyRound, Loader2, Plug, Shuffle, SlidersHorizontal, Tag, X, XCircle, Zap } from "lucide-react";
import { FORMAT_LABELS, type ContentFormat } from "../../../shared/types";
import { type BlitzPreferences, type Check, type KeyInfo } from "../api";
import { useEffect, useState } from "react";
import { api, DEMO, fmtCount, type IntegrationsStatus, type ProductProfile, type PublishingSettings, type ViralReference } from "../api";
import { ProfileForm } from "./ProfileForm";
import { serviceIcon, serviceLabel } from "./icons";

export type Section = "keys" | "integrations" | "blitz" | "publishing" | "brand" | "remix";

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
          <button className={section === "keys" ? "on" : ""} onClick={() => setSection("keys")}>
            <KeyRound size={16} /> API keys
          </button>
          <button className={section === "integrations" ? "on" : ""} onClick={() => setSection("integrations")}>
            <Plug size={16} /> Integrations
          </button>
          <button className={section === "blitz" ? "on" : ""} onClick={() => setSection("blitz")}>
            <SlidersHorizontal size={16} /> Blitz preferences
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
          {section === "keys" && <ApiKeys />}
          {section === "integrations" && <Integrations />}
          {section === "publishing" && <Publishing />}
          {section === "blitz" && <BlitzPrefs />}
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
      <ConnectionTest />
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
                  ? "No key yet. Add it under API keys"
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
                ? "Openverse public-domain photos (add a Pexels key for better ones)"
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
    setPulling("Starting an Apify run…");
    setError(null);
    try {
      const { job } = await api.pullTrending();
      setPulling(`Apify run ${job.runId} started. Trending posts appear here and in the Media Bank when it finishes (usually 1-3 minutes).`);
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

function ConnectionTest() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.testIntegrations>> | null>(null);
  const run = async () => {
    setBusy(true);
    try {
      setResult(await api.testIntegrations());
    } catch (e) {
      const fail = { ok: false, detail: (e as Error).message };
      setResult({ buffer: fail, apify: fail, videos: fail, claude: fail, public: fail, supabase: fail });
    } finally {
      setBusy(false);
    }
  };
  const rows: [keyof NonNullable<typeof result>, string][] = [
    ["buffer", "Buffer"],
    ["apify", "Apify"],
    ["videos", "Videos"],
    ["claude", "Claude"],
    ["supabase", "Supabase"],
    ["public", "Public URL"],
  ];
  return (
    <div className="int-card">
      <div className="int-head">
        <div>
          <b>Test connections</b>
          <small>Calls Buffer, Apify, Supabase and the video source with your keys and reports what comes back.</small>
        </div>
        <div className="int-right">
          <button className="btn-primary" onClick={run} disabled={busy}>
            {busy ? <Loader2 size={15} className="spin" /> : <Plug size={15} />} {busy ? "Testing…" : "Run test"}
          </button>
        </div>
      </div>
      {result && (
        <div className="test-results">
          {rows.map(([k, label]) => (
            <div key={k} className={`test-row ${result[k].ok ? "ok" : "fail"}`}>
              {result[k].ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              <b>{label}</b>
              <span>{result[k].detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const FORMATS: ContentFormat[] = ["slideshow", "video", "green_screen", "hook_demo"];
const FORMAT_HINTS: Record<ContentFormat, string> = {
  slideshow: "Photo slides with caption pills",
  video: "One clip, a block of text over it",
  green_screen: "Image on top, creator clip below",
  hook_demo: "Hook clip, then your product demo",
};

function BlitzPrefs() {
  const [prefs, setPrefs] = useState<BlitzPreferences | null>(null);
  const [angle, setAngle] = useState("");
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.preferences().then(setPrefs).catch((e) => setError(e.message));
  }, []);

  const save = async (next: BlitzPreferences) => {
    setPrefs(next);
    setSaved("saving");
    try {
      setPrefs(await api.savePreferences(next));
      setSaved("saved");
    } catch (e) {
      setError((e as Error).message);
      setSaved("idle");
    }
  };

  if (!prefs) return <p className="muted">{error ?? "Loading…"}</p>;
  const totalWeight = FORMATS.reduce((a, f) => a + prefs.formatWeights[f], 0) || 1;
  const addAngle = () => {
    const a = angle.trim();
    if (a && !prefs.angles.includes(a)) void save({ ...prefs, angles: [...prefs.angles, a] });
    setAngle("");
  };

  return (
    <>
      <h2>Blitz preferences</h2>
      <p className="muted">Blitz writes new cards in the background from your brand, these preferences and what's trending. Changes apply to the next cards it writes.</p>

      <div className="int-card">
        <label>
          Brand voice
          <textarea
            rows={3}
            placeholder="e.g. Dry humour, short sentences, talks like a runner friend, never salesy"
            value={prefs.voice}
            onChange={(e) => setPrefs({ ...prefs, voice: e.target.value })}
            onBlur={() => save(prefs)}
          />
        </label>
      </div>

      <div className="int-card">
        <b>Content angles</b>
        <p className="muted small">Themes for Create New ideas. Blitz rotates through them.</p>
        <div className="chip-input">
          {prefs.angles.map((a) => (
            <span key={a}>
              {a}
              <button aria-label={`Remove ${a}`} onClick={() => save({ ...prefs, angles: prefs.angles.filter((x) => x !== a) })}>
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            placeholder={prefs.angles.length ? "Add another…" : "e.g. behind the scenes, customer wins, myths in our niche"}
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addAngle();
              }
            }}
            onBlur={addAngle}
          />
        </div>
      </div>

      <div className="int-card">
        <b>Remix vs Create New</b>
        <p className="muted small">Remix adapts trending posts to your niche. Create New writes original ideas from your angles.</p>
        <input type="range" min={0} max={100} step={5} value={prefs.remixPercent} onChange={(e) => setPrefs({ ...prefs, remixPercent: Number(e.target.value) })} onPointerUp={() => save(prefs)} onKeyUp={() => save(prefs)} />
        <div className="split-bar">
          <span style={{ width: `${prefs.remixPercent}%` }} />
          <span style={{ width: `${100 - prefs.remixPercent}%` }} />
        </div>
        <div className="split-legend">
          <span>Remix {prefs.remixPercent}%</span>
          <span>Create New {100 - prefs.remixPercent}%</span>
        </div>
      </div>

      <div className="int-card">
        <b>Formats</b>
        <p className="muted small">How often each format appears in your feed. 0 turns a format off.</p>
        <div className="weights">
          {FORMATS.map((f) => (
            <div className="weight-row" key={f}>
              <span>
                {FORMAT_LABELS[f]}
                <small className="muted" style={{ display: "block", fontWeight: 400 }}>
                  {FORMAT_HINTS[f]}
                </small>
              </span>
              <input
                type="range"
                min={0}
                max={5}
                value={prefs.formatWeights[f]}
                onChange={(e) => setPrefs({ ...prefs, formatWeights: { ...prefs.formatWeights, [f]: Number(e.target.value) } })}
                onPointerUp={() => save(prefs)}
                onKeyUp={() => save(prefs)}
              />
              <output>{Math.round((prefs.formatWeights[f] / totalWeight) * 100)}%</output>
            </div>
          ))}
        </div>
      </div>

      <div className="int-card">
        <label>
          Cards to keep ready
          <input type="number" min={1} max={30} value={prefs.feedTarget} onChange={(e) => setPrefs({ ...prefs, feedTarget: Number(e.target.value) || 1 })} onBlur={() => save(prefs)} style={{ maxWidth: 120 }} />
        </label>
        <p className="muted small">Blitz writes new cards in the background until this many are waiting.</p>
      </div>
      {error && <div className="banner-error">{error}</div>}
      {saved !== "idle" && <p className="muted small">{saved === "saving" ? "Saving…" : "Saved."}</p>}
    </>
  );
}

export function ApiKeys() {
  const [keys, setKeys] = useState<KeyInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () =>
    api
      .keys()
      .then((r) => setKeys(r.keys))
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);

  if (!keys) return <p className="muted">{error ?? "Loading…"}</p>;
  const required = ["APIFY_TOKEN", "BUFFER_API_KEY", "ANTHROPIC_API_KEY", "PEXELS_API_KEY", "PUBLIC_BASE_URL"];
  const done = keys.filter((k) => required.includes(k.name) && k.set).length;
  return (
    <>
      <h2>API keys</h2>
      {DEMO && (
        <div className="banner-warn">
          This preview has no server, so keys can't be saved or tested here. Start the real app (double-click “Start Blitz” in apps/blitz, or
          deploy it) and paste your keys on this same page there.
        </div>
      )}
      <p className="muted">
        Paste a key and press Save. It's tested right away and starts working immediately. Keys are stored only on the computer running Blitz
        (data/keys.json) and are never shown in full again.
      </p>
      <div className="key-progress">
        <div className="key-progress-bar">
          <span style={{ width: `${(done / required.length) * 100}%` }} />
        </div>
        <small>
          {done} of {required.length} essentials set
        </small>
      </div>
      {keys.map((k) => (
        <KeyRow key={k.name} info={k} essential={required.includes(k.name)} onSaved={load} />
      ))}
    </>
  );
}

function KeyRow({ info, essential, onSaved }: { info: KeyInfo; essential: boolean; onSaved: () => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [test, setTest] = useState<Check | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = async (v: string) => {
    setBusy(true);
    setError(null);
    setTest(null);
    try {
      const r = await api.saveKey(info.name, v);
      setTest(r.test);
      setValue("");
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="int-card key-row">
      <div className="int-head">
        <div>
          <b>
            {info.label}
            {essential && !info.set && <span className="pill-need">needed</span>}
          </b>
          <small>{info.purpose}</small>
        </div>
        <div className="int-right">
          {info.set ? (
            <span className="key-set" title={info.from === "env" ? "From .env" : "Saved in Settings"}>
              <CheckCircle2 size={14} /> {info.preview}
            </span>
          ) : (
            <span className="key-missing">Not set</span>
          )}
        </div>
      </div>
      <div className="input-row key-input">
        <input
          type={info.secret ? "password" : "text"}
          autoComplete="off"
          spellCheck={false}
          placeholder={info.set ? "Paste a new value to replace it" : info.secret ? "Paste key" : "https://…"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && value.trim() && save(value)}
        />
        <button className="btn-primary" disabled={busy || !value.trim()} onClick={() => save(value)}>
          {busy ? <Loader2 size={14} className="spin" /> : null} Save
        </button>
        {info.from === "settings" && (
          <button className="btn-ghost" disabled={busy} onClick={() => save("")}>
            Remove
          </button>
        )}
      </div>
      {info.getUrl && (
        <a className="key-link" href={info.getUrl} target="_blank" rel="noreferrer">
          Get your {info.label} key <ExternalLink size={11} />
        </a>
      )}
      {error && <div className="banner-error">{error}</div>}
      {test && (
        <div className={`test-row ${test.ok ? "ok" : "fail"}`} style={{ marginTop: 10 }}>
          {test.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span>{test.detail}</span>
        </div>
      )}
    </div>
  );
}
