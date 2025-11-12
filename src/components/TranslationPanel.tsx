import React, { useState } from "react";
import { useTranslationStore } from "../state/translation-store";
import { useSettingsStore } from "../state/settings-store";
import { secureStorage } from "../services/secure-storage";
import "./TranslationPanel.css";

export const TranslationPanel: React.FC = () => {
  const {
    isTranslationPanelOpen,
    isTranslating,
    selectedText,
    translationResult,
    translationError,
    translationHistory,
    closeTranslationPanel,
    clearTranslation,
    removeFromHistory,
    clearHistory,
  } = useTranslationStore();

  const { settings, updateTranslationSettings } = useSettingsStore();
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const handleSaveTranslation = () => {
    if (translationResult) {
      // This would integrate with the highlights/notes system
      console.log("Save translation:", translationResult);
      // For now, just show a success message
      alert("Translation saved to highlights!");
    }
  };

  const handleApiKeyChange = async (value: string) => {
    setApiKeyInput(value);
    
    if (value) {
      try {
        await secureStorage.setItem(`${settings.translation.provider}-api-key`, value);
        updateTranslationSettings({ apiKey: value });
      } catch (error) {
        console.error("Failed to save API key:", error);
      }
    } else {
      try {
        await secureStorage.removeItem(`${settings.translation.provider}-api-key`);
        updateTranslationSettings({ apiKey: undefined });
      } catch (error) {
        console.error("Failed to remove API key:", error);
      }
    }
  };

  const loadApiKey = async () => {
    try {
      const storedKey = await secureStorage.getItem(`${settings.translation.provider}-api-key`);
      if (storedKey && storedKey !== settings.translation.apiKey) {
        setApiKeyInput(storedKey);
        updateTranslationSettings({ apiKey: storedKey });
      } else if (settings.translation.apiKey) {
        setApiKeyInput(settings.translation.apiKey);
      }
    } catch (error) {
      console.error("Failed to load API key:", error);
    }
  };

  React.useEffect(() => {
    loadApiKey();
  }, [settings.translation.provider]);

  if (!isTranslationPanelOpen) {
    return null;
  }

  return (
    <div className="translation-panel-overlay">
      <div className="translation-panel">
        <div className="translation-panel-header">
          <h3>Translation</h3>
          <button className="close-button" onClick={closeTranslationPanel}>
            ✕
          </button>
        </div>

        <div className="translation-panel-content">
          {/* Settings Section */}
          <div className="translation-settings">
            <div className="setting-group">
              <label>Provider:</label>
              <select
                value={settings.translation.provider}
                onChange={(e) => updateTranslationSettings({ 
                  provider: e.target.value as any 
                })}
              >
                <option value="google">Google Translate</option>
                <option value="deepl">DeepL</option>
                <option value="libretranslate">LibreTranslate</option>
                <option value="mock">Mock (Testing)</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Target Language:</label>
              <select
                value={settings.translation.targetLanguage}
                onChange={(e) => updateTranslationSettings({ 
                  targetLanguage: e.target.value 
                })}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ru">Russian</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
              </select>
            </div>

            {settings.translation.provider !== "mock" && (
              <div className="setting-group">
                <label>API Key:</label>
                <div className="api-key-input">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="Enter API key..."
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>
            )}

            <div className="setting-group">
              <label>
                <input
                  type="checkbox"
                  checked={settings.translation.enabled}
                  onChange={(e) => updateTranslationSettings({ 
                    enabled: e.target.checked 
                  })}
                />
                Enable translation
              </label>
            </div>
          </div>

          {/* Current Translation */}
          {selectedText && (
            <div className="translation-current">
              <div className="original-text">
                <h4>Original Text:</h4>
                <p>{selectedText}</p>
              </div>

              {isTranslating && (
                <div className="translation-loading">
                  <div className="spinner"></div>
                  <p>Translating...</p>
                </div>
              )}

              {translationError && (
                <div className="translation-error">
                  <p>{translationError}</p>
                  <button onClick={clearTranslation}>Clear</button>
                </div>
              )}

              {translationResult && (
                <div className="translation-result">
                  <div className="translation-meta">
                    <span className="language-info">
                      {translationResult.sourceLanguage} → {translationResult.targetLanguage}
                    </span>
                    <span className="provider-info">
                      via {translationResult.provider}
                      {translationResult.cached && " (cached)"}
                    </span>
                  </div>
                  
                  <div className="translated-text">
                    <h4>Translation:</h4>
                    <p>{translationResult.translatedText}</p>
                  </div>

                  <div className="translation-actions">
                    <button 
                      className="save-button"
                      onClick={handleSaveTranslation}
                    >
                      Save to Highlights
                    </button>
                    <button 
                      className="clear-button"
                      onClick={clearTranslation}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History Section */}
          <div className="translation-history">
            <div className="history-header">
              <h4>
                Translation History 
                {translationHistory.length > 0 && ` (${translationHistory.length})`}
              </h4>
              <div className="history-actions">
                {translationHistory.length > 0 && (
                  <button 
                    className="clear-history-button"
                    onClick={clearHistory}
                  >
                    Clear All
                  </button>
                )}
                <button 
                  className="toggle-history-button"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {showHistory ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {showHistory && translationHistory.length > 0 && (
              <div className="history-list">
                {translationHistory.map((result, index) => (
                  <div key={index} className="history-item">
                    <div className="history-text">
                      <div className="history-original">
                        {result.originalText.length > 100 
                          ? `${result.originalText.substring(0, 100)}...`
                          : result.originalText}
                      </div>
                      <div className="history-translated">
                        {result.translatedText.length > 100 
                          ? `${result.translatedText.substring(0, 100)}...`
                          : result.translatedText}
                      </div>
                    </div>
                    <div className="history-meta">
                      <span className="history-languages">
                        {result.sourceLanguage} → {result.targetLanguage}
                      </span>
                      <span className="history-provider">{result.provider}</span>
                      <button 
                        className="remove-history-button"
                        onClick={() => removeFromHistory(index)}
                        title="Remove from history"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};