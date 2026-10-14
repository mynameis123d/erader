import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { api, appPassword, AuthError, DEMO, type AppState } from "./api";
import { BlitzPage } from "./components/BlitzPage";
import { BrollPage } from "./components/BrollPage";
import { Onboarding } from "./components/Onboarding";
import { QueuePage } from "./components/QueuePage";
import { SettingsModal, type Section } from "./components/SettingsModal";
import { Sidebar, type Page } from "./components/Sidebar";
import { Toaster } from "./components/Toaster";

export function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [page, setPage] = useState<Page>("blitz");
  const [settings, setSettings] = useState<Section | null>(null);
  const [blitzKey, setBlitzKey] = useState(0);

  const refresh = useCallback(() => {
    api
      .state()
      .then(setState)
      .then(() => setLocked(null))
      .catch((e) => (e instanceof AuthError ? setLocked(e.message) : setError(e.message)));
  }, []);
  useEffect(refresh, [refresh]);

  if (locked)
    return (
      <div className="lock-screen">
        <form
          className="lock-card"
          onSubmit={(e) => {
            e.preventDefault();
            appPassword.set(pw);
            refresh();
          }}
        >
          <div className="logo">
            <span className="logo-mark">⚡</span>
            <span className="logo-word">Blitz</span>
          </div>
          <h1>Enter your app password</h1>
          <p className="muted">{locked}</p>
          <input id="app-password" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className="btn-primary" type="submit" disabled={!pw}>
            Unlock
          </button>
        </form>
      </div>
    );
  if (error)
    return (
      <div className="fullscreen-msg">
        <b>Can't reach the Blitz server</b>
        <span>{error}</span>
      </div>
    );
  if (!state)
    return (
      <div className="fullscreen-msg">
        <span className="spinner" />
      </div>
    );
  if (!state.profile) return <Onboarding onDone={refresh} />;

  return (
    <div className="shell">
      <Sidebar page={page} onPage={setPage} profile={state.profile} counts={state.counts} storage={state.capabilities.storage} onSettings={(s) => setSettings(s)} />
      <main className="main">
        {DEMO && (
          <div className="preview-banner">
            <b>This is a clickable preview, not the working app.</b> It has no server, so it can't use your keys, scrape or post. To run the
            real app: open the apps/blitz folder and double-click “Start Blitz”, or deploy it with the Render button in the README.
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            className="page"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {page === "blitz" && <BlitzPage key={blitzKey} onCountsChange={refresh} />}
            {page === "content" && <QueuePage onCountsChange={refresh} />}
            {page === "broll" && <BrollPage />}
          </motion.div>
        </AnimatePresence>
      </main>
      <AnimatePresence>
        {settings && (
          <SettingsModal
            key="settings"
            profile={state.profile}
            initial={settings}
            onClose={() => setSettings(null)}
            onProfileSaved={() => {
              setSettings(null);
              setBlitzKey((k) => k + 1);
              refresh();
            }}
          />
        )}
      </AnimatePresence>
      <Toaster />
    </div>
  );
}
