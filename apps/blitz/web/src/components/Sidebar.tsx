import { motion } from "framer-motion";
import { Cloud, Film, HardDrive, KeyRound, LayoutGrid, Plug, Settings2, Shuffle, SlidersHorizontal, Zap } from "lucide-react";
import type { ProductProfile } from "../api";
import type { Section } from "./SettingsModal";

export type Page = "blitz" | "content" | "broll";

const NAV: { id: Page; label: string; icon: typeof Zap }[] = [
  { id: "blitz", label: "Blitz", icon: Zap },
  { id: "content", label: "Content", icon: LayoutGrid },
  { id: "broll", label: "Media Bank", icon: Film },
];

export function Sidebar({
  page,
  onPage,
  profile,
  counts,
  onSettings,
  storage,
}: {
  page: Page;
  onPage: (p: Page) => void;
  profile: ProductProfile;
  counts: Record<string, number>;
  onSettings: (s: Section) => void;
  storage?: "supabase" | "local";
}) {
  const host = (() => {
    try {
      return new URL(profile.url).hostname.replace(/^www\./, "");
    } catch {
      return profile.url;
    }
  })();
  return (
    <aside className="sidebar">
      <div className="logo">
        <span className="logo-mark">
          <Zap size={15} strokeWidth={2.6} />
        </span>
        <span className="logo-word">Blitz</span>
      </div>

      <button className="workspace" onClick={() => onSettings("brand")} title="Brand profile">
        <span className="ws-avatar">{profile.name.slice(0, 1).toUpperCase()}</span>
        <span className="ws-text">
          <b>{profile.name}</b>
          <small>{host}</small>
        </span>
      </button>

      <nav className="nav">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-item ${page === id ? "on" : ""}`} onClick={() => onPage(id)}>
            {page === id && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <Icon size={17} />
            <span>{label}</span>
            {id === "content" && counts.approved > 0 && (
              <motion.span key={counts.approved} className="nav-count" initial={{ scale: 1.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 14 }}>
                {counts.approved}
              </motion.span>
            )}
          </button>
        ))}
      </nav>

      <div className="nav-section">Workspace</div>
      <nav className="nav">
        <button className="nav-item" onClick={() => onSettings("keys")}>
          <KeyRound size={17} />
          <span>API keys</span>
        </button>
        <button className="nav-item" onClick={() => onSettings("integrations")}>
          <Plug size={17} />
          <span>Integrations</span>
        </button>
        <button className="nav-item" onClick={() => onSettings("blitz")}>
          <SlidersHorizontal size={17} />
          <span>Blitz preferences</span>
        </button>
        <button className="nav-item" onClick={() => onSettings("publishing")}>
          <Zap size={17} />
          <span>One-click publishing</span>
        </button>
        <button className="nav-item" onClick={() => onSettings("remix")}>
          <Shuffle size={17} />
          <span>Remix library</span>
        </button>
      </nav>

      <div className="sidebar-foot">
        <div className={`storage-pill ${storage === "supabase" ? "cloud" : ""}`} title={storage === "supabase" ? "Data, keys and media are saved in your Supabase project" : "Data is saved on this computer"}>
          {storage === "supabase" ? <Cloud size={13} /> : <HardDrive size={13} />}
          {storage === "supabase" ? "Synced to Supabase" : "Saved on this computer"}
        </div>
        <div className="stat-row">
          <div>
            <b>{counts.published ?? 0}</b>
            <small>posted</small>
          </div>
          <div>
            <b>{counts.approved ?? 0}</b>
            <small>approved</small>
          </div>
          <div>
            <b>{counts.rejected ?? 0}</b>
            <small>skipped</small>
          </div>
        </div>
        <button className="nav-item" onClick={() => onSettings("keys")}>
          <Settings2 size={17} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
