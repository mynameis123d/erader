import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { api, DEMO, type AppState } from "./api";
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
  const [page, setPage] = useState<Page>("blitz");
  const [settings, setSettings] = useState<Section | null>(null);
  const [blitzKey, setBlitzKey] = useState(0);

  const refresh = useCallback(() => {
    api
      .state()
      .then(setState)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(refresh, [refresh]);

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
      <Sidebar page={page} onPage={setPage} profile={state.profile} counts={state.counts} onSettings={(s) => setSettings(s)} />
      <main className="main">
        {DEMO && (
          <div className="preview-banner">
            Preview with sample cards and sample channels. Nothing is posted. Video cards show a moving scene here; the real app plays the
            matching clip.
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
