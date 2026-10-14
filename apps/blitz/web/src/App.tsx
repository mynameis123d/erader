import { useCallback, useEffect, useState } from "react";
import { api, type AppState } from "./api";
import { BlitzPage } from "./components/BlitzPage";
import { ProfileForm } from "./components/ProfileForm";
import { QueuePage } from "./components/QueuePage";
import { SettingsModal } from "./components/SettingsModal";

type Page = "blitz" | "queue";

export function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<Page>("blitz");
  const [settings, setSettings] = useState(false);
  const [blitzKey, setBlitzKey] = useState(0);

  const refresh = useCallback(() => {
    api
      .state()
      .then(setState)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(refresh, [refresh]);

  if (error) return <div className="center-msg">Can't reach the Blitz API: {error}</div>;
  if (!state) return <div className="center-msg">Loading…</div>;

  if (!state.profile) {
    return (
      <div className="onboarding">
        <div className="brand-mark">⚡ Blitz</div>
        <h1>What are we marketing?</h1>
        <p className="muted">Paste your website, app or store link. Blitz reads your product, audience and tone, then remixes viral formats for it.</p>
        <ProfileForm initial={null} onSaved={refresh} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-mark">⚡ Blitz</div>
        <nav>
          <button className={page === "blitz" ? "on" : ""} onClick={() => setPage("blitz")}>
            Blitz
          </button>
          <button className={page === "queue" ? "on" : ""} onClick={() => setPage("queue")}>
            Approved {state.counts.approved ? <span className="count">{state.counts.approved}</span> : null}
          </button>
        </nav>
        <div className="topbar-right">
          <span className="product-name">{state.profile.name}</span>
          <button className="icon-btn" aria-label="Settings" onClick={() => setSettings(true)}>
            ⚙
          </button>
        </div>
      </header>
      <main>
        {page === "blitz" ? <BlitzPage key={blitzKey} onCountsChange={refresh} /> : <QueuePage onCountsChange={refresh} />}
      </main>
      {settings && (
        <SettingsModal
          profile={state.profile}
          onClose={() => setSettings(false)}
          onProfileSaved={() => {
            setSettings(false);
            setBlitzKey((k) => k + 1);
            refresh();
          }}
        />
      )}
    </div>
  );
}
