import React from "react";
import { useTranslationStore } from "../state/translation-store";
import { useSettingsStore } from "../state/settings-store";
import "./TranslationTooltip.css";

interface TranslationTooltipProps {
  onTranslate: () => void;
}

export const TranslationTooltip: React.FC<TranslationTooltipProps> = ({ onTranslate }) => {
  const {
    showTranslationTooltip,
    tooltipPosition,
    selectedText,
    hideTooltip,
  } = useTranslationStore();

  const { settings } = useSettingsStore();

  if (!showTranslationTooltip || !selectedText.trim()) {
    return null;
  }

  const isTranslationEnabled = settings.translation.enabled;
  const isConfigured = settings.translation.apiKey || settings.translation.provider === "mock";

  const handleTranslate = () => {
    if (isTranslationEnabled && isConfigured) {
      onTranslate();
      hideTooltip();
    }
  };

  const handleClose = () => {
    hideTooltip();
  };

  // Adjust position to keep tooltip in viewport
  const adjustedPosition = {
    x: Math.min(tooltipPosition.x, window.innerWidth - 200),
    y: Math.min(tooltipPosition.y, window.innerHeight - 100),
  };

  return (
    <div
      className="translation-tooltip"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      <div className="translation-tooltip-content">
        <div className="translation-tooltip-text">
          {selectedText.length > 50 ? `${selectedText.substring(0, 50)}...` : selectedText}
        </div>
        
        <div className="translation-tooltip-actions">
          {!isTranslationEnabled ? (
            <button 
              className="translation-tooltip-button disabled"
              disabled
              title="Translation is disabled in settings"
            >
              Enable Translation
            </button>
          ) : !isConfigured ? (
            <button 
              className="translation-tooltip-button disabled"
              disabled
              title="Translation provider not configured"
            >
              Configure Provider
            </button>
          ) : (
            <button 
              className="translation-tooltip-button primary"
              onClick={handleTranslate}
              title={`Translate to ${settings.translation.targetLanguage}`}
            >
              Translate
            </button>
          )}
          
          <button 
            className="translation-tooltip-button secondary"
            onClick={handleClose}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};