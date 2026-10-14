import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const KEYS: [string, string][] = [
  ["→", "Approve"],
  ["←", "Skip"],
  ["E", "Edit the card"],
  ["U", "Undo the last decision"],
  ["?", "Show this list"],
];

/** "?" opens a keyboard shortcut sheet. */
export function Shortcuts() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "?") setOpen((o) => !o);
      else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setOpen(false)}>
          <motion.div
            className="modal small-modal shortcuts"
            role="dialog"
            aria-label="Keyboard shortcuts"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <h2>Keyboard shortcuts</h2>
            <ul>
              {KEYS.map(([k, label]) => (
                <li key={k}>
                  <span>{label}</span>
                  <kbd>{k}</kbd>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
