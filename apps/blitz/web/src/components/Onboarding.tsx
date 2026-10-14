import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { ProfileForm } from "./ProfileForm";

export function Onboarding({ onDone }: { onDone: () => void }) {
  return (
    <div className="onboarding">
      <div className="onboarding-glow" aria-hidden />
      <motion.div
        className="onboarding-inner"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="logo">
          <span className="logo-mark">
            <Zap size={15} strokeWidth={2.6} />
          </span>
          <span className="logo-word">Blitz</span>
        </div>
        <h1>What are we marketing?</h1>
        <p className="lede">
          Paste your website, App Store or Shopify link. Blitz reads your product, audience and tone, then turns proven viral formats into
          posts for it.
        </p>
        <ProfileForm initial={null} onSaved={onDone} />
      </motion.div>
    </div>
  );
}
