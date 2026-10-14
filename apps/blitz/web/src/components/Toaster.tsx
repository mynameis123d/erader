import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useEffect, useState } from "react";

type Kind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: Kind;
  text: string;
}

let push: ((t: Omit<Toast, "id">) => void) | null = null;
let next = 1;

/** Show a short message at the bottom of the screen. */
export const toast = {
  success: (text: string) => push?.({ kind: "success", text }),
  error: (text: string) => push?.({ kind: "error", text }),
  info: (text: string) => push?.({ kind: "info", text }),
};

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    push = (t) => {
      const id = next++;
      setItems((xs) => [...xs.slice(-2), { ...t, id }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), t.kind === "error" ? 6000 : 3500);
    };
    return () => {
      push = null;
    };
  }, []);
  return (
    <div className="toaster" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              className={`toast toast-${t.kind}`}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            >
              <Icon size={16} />
              <span>{t.text}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
