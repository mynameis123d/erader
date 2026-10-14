import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import type { AppState } from "../api";
import type { Section } from "./SettingsModal";

const DISMISS_KEY = "blitz.checklist.dismissed";
const read = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

/** What each missing key unlocks, so "no real content" always has a visible next step. */
export function SetupChecklist({ caps, onOpen }: { caps: AppState["capabilities"]; onOpen: (s: Section) => void }) {
  const [hidden, setHidden] = useState(read);
  const items = [
    { done: caps.claude, label: "Claude writes every post", hint: "Without it, posts come from templates and repeat", section: "keys" as Section },
    { done: Boolean(caps.videos), label: "Real background videos", hint: "Pexels key (free): footage matched to each post", section: "keys" as Section },
    { done: caps.apify, label: "Trending TikToks to remix", hint: "Apify token: scrapes what's working in your niche", section: "keys" as Section },
    { done: caps.buffer, label: "Post to TikTok, Instagram, YouTube", hint: "Buffer key, then connect channels in Buffer", section: "keys" as Section },
  ];
  const done = items.filter((i) => i.done).length;
  const show = !hidden && done < items.length;
  return (
    <AnimatePresence>
      {show && (
        <motion.section
          className="checklist"
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="checklist-head">
            <div className="checklist-ring" style={{ ["--p" as string]: `${(done / items.length) * 100}%` }} aria-hidden />
            <div>
              <b>Get real content</b>
              <span>
                {done}/{items.length} connected
              </span>
            </div>
            <button
              className="icon-ghost"
              aria-label="Hide"
              onClick={() => {
                setHidden(true);
                try {
                  localStorage.setItem(DISMISS_KEY, "1");
                } catch {
                  /* not remembered in private mode */
                }
              }}
            >
              <X size={15} />
            </button>
          </div>
          <div className="checklist-items" role="list">
            {items.map((i) => (
              <button key={i.label} className={`check-item ${i.done ? "done" : ""}`} onClick={() => !i.done && onOpen(i.section)} disabled={i.done} title={i.done ? "Connected" : i.hint}>
                <span className="check-box">{i.done && <Check size={11} strokeWidth={3} />}</span>
                <span className="check-text">{i.label}</span>
                {!i.done && <ChevronRight size={14} className="check-go" />}
              </button>
            ))}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
