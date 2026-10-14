import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { useState } from "react";
import { ProfileForm } from "./ProfileForm";
import { ApiKeys } from "./SettingsModal";

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<"keys" | "site">("keys");
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
        <div className="steps">
          <button className={step === "keys" ? "on" : ""} onClick={() => setStep("keys")}>
            1 · Connect your keys
          </button>
          <button className={step === "site" ? "on" : ""} onClick={() => setStep("site")}>
            2 · Your website
          </button>
        </div>
        {step === "keys" ? (
          <>
            <h1>Connect your accounts</h1>
            <p className="lede">Paste each key once. Blitz tests it on the spot. You can change them later in Settings → API keys.</p>
            <div className="onboarding-keys">
              <ApiKeys />
            </div>
            <button className="btn-primary wide" onClick={() => setStep("site")}>
              Continue
            </button>
          </>
        ) : (
          <>
            <h1>What are we marketing?</h1>
            <p className="lede">
              Paste your website, App Store or Shopify link. Blitz reads several pages of it (products, pricing, about), pulls your product
              photos, and learns your audience and tone.
            </p>
            <ProfileForm initial={null} onSaved={onDone} />
          </>
        )}
      </motion.div>
    </div>
  );
}
