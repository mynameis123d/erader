import React, { useState, useRef } from "react";
import {
  useSettings,
  useSettingsActions,
  useThemeSettings,
  useTranslationSettings,
  useReadingSettings,
} from "../hooks/useSettings";
import { useLibraryStore } from "../state/library-store";
import "./SettingsPage.css";

export const SettingsPage: React.FC = () => {
  const settings = useSettings();
  const themeSettings = useThemeSettings();
  const translationSettings = useTranslationSettings();
  const readingSettings = useReadingSettings();
  const actions = useSettingsActions();
  const libraryActions = useLibraryStore((state) => ({
    exportLibraryMetadata: state.exportLibraryMetadata,
    importLibraryMetadata: state.importLibraryMetadata,
  }));

  const [showApiKey, setShowApiKey] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const handleThemeChange = (updates: Partial<typeof themeSettings>) => {
    actions.updateThemeSettings(updates);
    applyThemeToRoot(updates);
  };

  const applyThemeToRoot = (theme: Partial<typeof themeSettings>) => {
    const root = document.documentElement;
    if (theme.mode) {
      root.className = `theme-${theme.mode}`;
    }
    if (theme.backgroundColor) {
      root.style.setProperty("--bg-color", theme.backgroundColor);
    }
    if (theme.textColor) {
      root.style.setProperty("--text-color", theme.textColor);
    }
    if (theme.fontSize) {
      root.style.setProperty("--font-size", `${theme.fontSize}px`);
    }
    if (theme.fontFamily) {
      root.style.setProperty("--font-family", theme.fontFamily);
    }
    if (theme.lineHeight) {
      root.style.setProperty("--line-height", theme.lineHeight.toString());
    }
  };

  const handleExportSettings = () => {
    const settingsJson = actions.exportSettings();
    const blob = new Blob([settingsJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ebook-reader-settings-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          actions.importSettings(content);
          alert("Settings imported successfully!");
          window.location.reload();
        } catch (error) {
          alert("Failed to import settings. Please check the file format.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExportLibrary = () => {
    const libraryJson = libraryActions.exportLibraryMetadata();
    const blob = new Blob([libraryJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ebook-reader-library-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportLibrary = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          libraryActions.importLibraryMetadata(content);
          alert("Library metadata imported successfully!");
        } catch (error) {
          alert("Failed to import library. Please check the file format.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleResetSettings = () => {
    if (showResetConfirm) {
      actions.resetSettings();
      setShowResetConfirm(false);
      alert("Settings have been reset to defaults!");
      window.location.reload();
    } else {
      setShowResetConfirm(true);
      setTimeout(() => setShowResetConfirm(false), 5000);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <header className="settings-header">
          <h1>Settings</h1>
          <p>Customize your reading experience</p>
        </header>

        <div className="settings-sections">
          {/* Appearance Section */}
          <section className="settings-section">
            <h2>Appearance</h2>
            <div className="settings-grid">
              <div className="setting-item">
                <label htmlFor="theme-mode">Theme</label>
                <select
                  id="theme-mode"
                  value={themeSettings.mode}
                  onChange={(e) =>
                    handleThemeChange({
                      mode: e.target.value as "light" | "dark" | "sepia" | "custom",
                    })
                  }
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="sepia">Sepia</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {themeSettings.mode === "custom" && (
                <>
                  <div className="setting-item">
                    <label htmlFor="bg-color">Background Color</label>
                    <input
                      type="color"
                      id="bg-color"
                      value={themeSettings.backgroundColor}
                      onChange={(e) =>
                        handleThemeChange({ backgroundColor: e.target.value })
                      }
                    />
                  </div>

                  <div className="setting-item">
                    <label htmlFor="text-color">Text Color</label>
                    <input
                      type="color"
                      id="text-color"
                      value={themeSettings.textColor}
                      onChange={(e) =>
                        handleThemeChange({ textColor: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              <div className="setting-item">
                <label htmlFor="font-family">Font Family</label>
                <select
                  id="font-family"
                  value={themeSettings.fontFamily}
                  onChange={(e) =>
                    handleThemeChange({ fontFamily: e.target.value })
                  }
                >
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="'Palatino', serif">Palatino</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="'Helvetica', sans-serif">Helvetica</option>
                  <option value="'Verdana', sans-serif">Verdana</option>
                  <option value="'Courier New', monospace">Courier New</option>
                </select>
              </div>

              <div className="setting-item">
                <label htmlFor="font-size">
                  Font Size: {themeSettings.fontSize}px
                </label>
                <input
                  type="range"
                  id="font-size"
                  min="12"
                  max="32"
                  value={themeSettings.fontSize}
                  onChange={(e) =>
                    handleThemeChange({ fontSize: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="setting-item">
                <label htmlFor="line-height">
                  Line Height: {themeSettings.lineHeight}
                </label>
                <input
                  type="range"
                  id="line-height"
                  min="1"
                  max="2.5"
                  step="0.1"
                  value={themeSettings.lineHeight}
                  onChange={(e) =>
                    handleThemeChange({
                      lineHeight: parseFloat(e.target.value),
                    })
                  }
                />
              </div>

              <div className="setting-item">
                <label htmlFor="margin-h">
                  Horizontal Margins: {themeSettings.marginHorizontal}px
                </label>
                <input
                  type="range"
                  id="margin-h"
                  min="0"
                  max="100"
                  value={themeSettings.marginHorizontal}
                  onChange={(e) =>
                    handleThemeChange({
                      marginHorizontal: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div className="setting-item">
                <label htmlFor="margin-v">
                  Vertical Margins: {themeSettings.marginVertical}px
                </label>
                <input
                  type="range"
                  id="margin-v"
                  min="0"
                  max="100"
                  value={themeSettings.marginVertical}
                  onChange={(e) =>
                    handleThemeChange({
                      marginVertical: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div className="setting-item">
                <label htmlFor="text-align">Text Alignment</label>
                <select
                  id="text-align"
                  value={themeSettings.textAlign}
                  onChange={(e) =>
                    handleThemeChange({
                      textAlign: e.target.value as "left" | "center" | "right" | "justify",
                    })
                  }
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                  <option value="justify">Justify</option>
                </select>
              </div>
            </div>
          </section>

          {/* Reading Section */}
          <section className="settings-section">
            <h2>Reading</h2>
            <div className="settings-grid">
              <div className="setting-item">
                <label htmlFor="page-layout">Default Page Layout</label>
                <select
                  id="page-layout"
                  value={readingSettings.defaultPageLayout}
                  onChange={(e) =>
                    actions.updateReadingSettings({
                      defaultPageLayout: e.target.value as "single" | "double" | "scroll",
                    })
                  }
                >
                  <option value="single">Single Page</option>
                  <option value="double">Double Page</option>
                  <option value="scroll">Scroll</option>
                </select>
              </div>

              <div className="setting-item">
                <label htmlFor="reading-mode">Reading Mode</label>
                <select
                  id="reading-mode"
                  value={readingSettings.readingMode}
                  onChange={(e) =>
                    actions.updateReadingSettings({
                      readingMode: e.target.value as "paginated" | "continuous",
                    })
                  }
                >
                  <option value="paginated">Paginated</option>
                  <option value="continuous">Continuous</option>
                </select>
              </div>

              <div className="setting-item">
                <label htmlFor="history-retention">
                  History Retention: {readingSettings.historyRetentionDays} days
                </label>
                <input
                  type="range"
                  id="history-retention"
                  min="7"
                  max="365"
                  step="7"
                  value={readingSettings.historyRetentionDays}
                  onChange={(e) =>
                    actions.updateReadingSettings({
                      historyRetentionDays: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div className="setting-item checkbox-item">
                <label>
                  <input
                    type="checkbox"
                    checked={readingSettings.enablePageTransitions}
                    onChange={(e) =>
                      actions.updateReadingSettings({
                        enablePageTransitions: e.target.checked,
                      })
                    }
                  />
                  Enable Page Transitions
                </label>
              </div>

              <div className="setting-item checkbox-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.autoSaveProgress}
                    onChange={actions.toggleAutoSave}
                  />
                  Auto-save Reading Progress
                </label>
              </div>
            </div>
          </section>

          {/* Translation Section */}
          <section className="settings-section">
            <h2>Translation</h2>
            <div className="settings-grid">
              <div className="setting-item checkbox-item">
                <label>
                  <input
                    type="checkbox"
                    checked={translationSettings.enabled}
                    onChange={(e) =>
                      actions.updateTranslationSettings({
                        enabled: e.target.checked,
                      })
                    }
                  />
                  Enable Translation
                </label>
              </div>

              {translationSettings.enabled && (
                <>
                  <div className="setting-item">
                    <label htmlFor="target-language">Preferred Language</label>
                    <input
                      type="text"
                      id="target-language"
                      value={translationSettings.targetLanguage}
                      onChange={(e) =>
                        actions.updateTranslationSettings({
                          targetLanguage: e.target.value,
                        })
                      }
                      placeholder="e.g., en, es, fr"
                    />
                  </div>

                  <div className="setting-item">
                    <label htmlFor="translation-provider">Translation Provider</label>
                    <select
                      id="translation-provider"
                      value={translationSettings.provider}
                      onChange={(e) =>
                        actions.updateTranslationSettings({
                          provider: e.target.value as "google" | "deepl" | "custom",
                        })
                      }
                    >
                      <option value="google">Google Translate</option>
                      <option value="deepl">DeepL</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div className="setting-item">
                    <label htmlFor="api-key">API Key</label>
                    <div className="api-key-input">
                      <input
                        type={showApiKey ? "text" : "password"}
                        id="api-key"
                        value={translationSettings.apiKey || ""}
                        onChange={(e) =>
                          actions.updateTranslationSettings({
                            apiKey: e.target.value,
                          })
                        }
                        placeholder="Enter your API key"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="toggle-visibility-btn"
                      >
                        {showApiKey ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Data Section */}
          <section className="settings-section">
            <h2>Data</h2>
            <div className="settings-grid">
              <div className="setting-item">
                <label>Settings Backup</label>
                <div className="button-group">
                  <button
                    type="button"
                    onClick={handleExportSettings}
                    className="btn btn-secondary"
                  >
                    Export Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary"
                  >
                    Import Settings
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportSettings}
                    style={{ display: "none" }}
                  />
                </div>
              </div>

              <div className="setting-item">
                <label>Library Metadata</label>
                <div className="button-group">
                  <button
                    type="button"
                    onClick={handleExportLibrary}
                    className="btn btn-secondary"
                  >
                    Export Library
                  </button>
                  <button
                    type="button"
                    onClick={() => libraryInputRef.current?.click()}
                    className="btn btn-secondary"
                  >
                    Import Library
                  </button>
                  <input
                    ref={libraryInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportLibrary}
                    style={{ display: "none" }}
                  />
                </div>
              </div>

              <div className="setting-item checkbox-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.enableAnalytics}
                    onChange={actions.toggleAnalytics}
                  />
                  Enable Analytics
                </label>
              </div>

              <div className="setting-item">
                <label>Reset Settings</label>
                <button
                  type="button"
                  onClick={handleResetSettings}
                  className={`btn btn-danger ${showResetConfirm ? "confirm" : ""}`}
                >
                  {showResetConfirm ? "Click again to confirm" : "Reset to Defaults"}
                </button>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section className="settings-section">
            <h2>About</h2>
            <div className="about-content">
              <p>
                <strong>Ebook Reader</strong>
              </p>
              <p>Version 0.1.0</p>
              <p>
                A modern ebook reader with powerful state management, built with
                TypeScript, Zustand, and IndexedDB.
              </p>
              {settings.lastSyncDate && (
                <p className="last-sync">
                  Last sync: {new Date(settings.lastSyncDate).toLocaleString()}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
