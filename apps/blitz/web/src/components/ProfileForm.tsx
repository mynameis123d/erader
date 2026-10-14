import { useState } from "react";
import { api, type ProductProfile } from "../api";

type Draft = Omit<ProductProfile, "updatedAt">;

const listToText = (l: string[]) => l.join("\n");
const textToList = (t: string) =>
  t
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);

/** Paste a URL, let the AI read it, then review the profile. Used by onboarding and Settings. */
export function ProfileForm({ initial, onSaved }: { initial: ProductProfile | null; onSaved: (p: ProductProfile) => void }) {
  const [url, setUrl] = useState(initial?.url ?? "");
  const [draft, setDraft] = useState<Draft | null>(initial);
  const [busy, setBusy] = useState<"analyze" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const analyze = async () => {
    setBusy("analyze");
    setError(null);
    try {
      const res = await api.analyze(url);
      setDraft(res.profile);
      setSource(res.source);
    } catch (e) {
      setError((e as Error).message);
      if (!draft) setDraft({ url, name: "", oneLiner: "", audience: "", tone: "", painPoints: [], benefits: [], keywords: [] });
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!draft) return;
    setBusy("save");
    setError(null);
    try {
      const { profile } = await api.saveProfile({ ...draft, url: draft.url || url });
      onSaved(profile);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const field = (key: keyof Draft, label: string, multiline = false) => {
    if (!draft) return null;
    const v = draft[key];
    const isList = Array.isArray(v);
    const value = isList ? listToText(v as string[]) : (v as string);
    const set = (s: string) => setDraft({ ...draft, [key]: isList ? textToList(s) : s });
    return (
      <label>
        {label}
        {multiline || isList ? (
          <textarea rows={isList ? 4 : 2} value={value} onChange={(e) => set(e.target.value)} placeholder={isList ? "One per line" : undefined} />
        ) : (
          <input value={value} onChange={(e) => set(e.target.value)} />
        )}
      </label>
    );
  };

  return (
    <div className="profile-form">
      <div className="input-row url-row">
        <input
          placeholder="yourwebsite.com, an App Store link or a Shopify store"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && url && analyze()}
        />
        <button className="btn-primary" disabled={!url || !!busy} onClick={analyze}>
          {busy === "analyze" ? "Reading your site…" : "Analyze"}
        </button>
      </div>
      {source === "heuristic" && <p className="muted">Basic analysis from page metadata. Add ANTHROPIC_API_KEY for a full AI read, or edit below.</p>}
      {error && <div className="banner-error">{error}. You can fill in the profile manually.</div>}
      {draft?.site && (
        <div className="site-read">
          <b>
            Read {draft.site.pages.length} page{draft.site.pages.length === 1 ? "" : "s"} from {(() => { try { return new URL(draft.url).host; } catch { return draft.url; } })()}
            {draft.site.analyzedBy === "claude" ? " · analyzed by Claude" : ""}
          </b>
          <ul>
            {draft.site.pages.map((p) => (
              <li key={p}>
                <a href={p} target="_blank" rel="noreferrer">
                  {(() => { try { return new URL(p).pathname || "/"; } catch { return p; } })()}
                </a>
              </li>
            ))}
          </ul>
          {draft.site.products.length > 0 && (
            <p>
              Products: {draft.site.products.slice(0, 6).map((p) => `${p.name}${p.price ? ` (${p.price})` : ""}`).join(", ")}
              {draft.site.products.length > 6 ? ` and ${draft.site.products.length - 6} more` : ""}
            </p>
          )}
          {draft.site.imageCount > 0 && <p>{draft.site.imageCount} product images added to your Media Bank.</p>}
        </div>
      )}
      {draft && (
        <div className="profile-fields">
          {field("name", "Product name")}
          {field("oneLiner", "What it is", true)}
          {field("audience", "Audience", true)}
          {field("tone", "Brand tone")}
          {field("benefits", "Benefits")}
          {field("painPoints", "Pain points")}
          {field("keywords", "Topics your audience follows")}
          <button className="btn-primary wide" disabled={!draft.name || !!busy} onClick={save}>
            {busy === "save" ? "Saving…" : "Save & start Blitz"}
          </button>
        </div>
      )}
    </div>
  );
}
