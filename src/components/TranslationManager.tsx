import React from "react";
import { useTranslationStore } from "../state/translation-store";
import { useSettingsStore } from "../state/settings-store";
import { TranslationTooltip } from "./TranslationTooltip";
import { TranslationPanel } from "./TranslationPanel";

export const TranslationManager: React.FC = () => {
  const { translateText, selectedText } = useTranslationStore();
  const { settings } = useSettingsStore();

  const handleTranslate = () => {
    if (selectedText && settings.translation.enabled) {
      translateText(selectedText, settings.translation);
    }
  };

  return (
    <>
      <TranslationTooltip onTranslate={handleTranslate} />
      <TranslationPanel />
    </>
  );
};