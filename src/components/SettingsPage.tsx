import React, { useState, useRef, useEffect, useCallback } from "react";
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
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 's':
          event.preventDefault();
          handleExportSettings();
          break;
        case 'o':
          event.preventDefault();
          fileInputRef.current?.click();
          break;
        case 'r':
          event.preventDefault();
          handleResetSettings();
          break;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Focus management
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

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

  const handleExportSettings = async () => {
    setIsLoading(true);
    try {
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
    } catch (error) {
      alert("Failed to export settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      try {
        const content = await file.text();
        actions.importSettings(content);
        alert("Settings imported successfully!");
        window.location.reload();
      } catch (error) {
        alert("Failed to import settings. Please check the file format.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleExportLibrary = async () => {
    setIsLoading(true);
    try {
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
    } catch (error) {
      alert("Failed to export library. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportLibrary = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      try {
        const content = await file.text();
        libraryActions.importLibraryMetadata(content);
        alert("Library metadata imported successfully!");
      } catch (error) {
        alert("Failed to import library. Please check the file format.");
      } finally {
        setIsLoading(false);
      }
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
    <div className="settings-page" ref={containerRef} tabIndex={-1}>
      <div className="settings-container">
        <header className="settings-header">
          <h1>Settings</h1>
          <p>Customize your reading experience</p>
        </header>

        {isLoading && (
          <div className="loading-overlay" role="status" aria-live="polite">
            <div className="loading-spinner"></div>
            <span>Loading...</span>
          </div>
        )}

        <div className="settings-sections">
          {/* Appearance Section */}
          <section className="settings-section" aria-labelledby="appearance-heading">
            <h2 id="appearance-heading">Appearance</h2>
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
                  aria-describedby="theme-mode-description"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="sepia">Sepia</option>
                  <option value="custom">Custom</option>
                </select>
                <span id="theme-mode-description" className="sr-only">
                  Choose the color theme for the reader interface
                </span>
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
                      aria-describedby="bg-color-description"
                    />
                    <span id="bg-color-description" className="sr-only">
                      Select a custom background color for reading
                    </span>
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
                      aria-describedby="text-color-description"
                    />
                    <span id="text-color-description" className="sr-only">
                      Select a custom text color for reading
                    </span>
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
                  aria-describedby="font-family-description"
                >
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="'Palatino', serif">Palatino</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="'Helvetica', sans-serif">Helvetica</option>
                  <option value="'Verdana', sans-serif">Verdana</option>
                  <option value="'Courier New', monospace">Courier New</option>
                </select>
                <span id="font-family-description" className="sr-only">
                  Choose the font family for text display
                </span>
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
                  aria-describedby="font-size-description"
                  aria-valuemin={12}
                  aria-valuemax={32}
                  aria-valuenow={themeSettings.fontSize}
                />
                <span id="font-size-description" className="sr-only">
                  Adjust the font size for text display
                </span>
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
                  aria-describedby="line-height-description"
                  aria-valuemin={1}
                  aria-valuemax={2.5}
                  aria-valuenow={themeSettings.lineHeight}
                />
                <span id="line-height-description" className="sr-only">
                  Adjust the line height for better readability
                </span>
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
                  aria-describedby="margin-h-description"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={themeSettings.marginHorizontal}
                />
                <span id="margin-h-description" className="sr-only">
                  Adjust horizontal margins for text layout
                </span>
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
                  aria-describedby="margin-v-description"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={themeSettings.marginVertical}
                />
                <span id="margin-v-description" className="sr-only">
                  Adjust vertical margins for text layout
                </span>
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
                  aria-describedby="text-align-description"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                  <option value="justify">Justify</option>
                </select>
                <span id="text-align-description" className="sr-only">
                  Choose text alignment for reading content
                </span>
              </div>
            </div>
          </section>

          {/* Reading Section */}
          <section className="settings-section" aria-labelledby="reading-heading">
            <h2 id="reading-heading">Reading</h2>
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
                  aria-describedby="page-layout-description"
                >
                  <option value="single">Single Page</option>
                  <option value="double">Double Page</option>
                  <option value="scroll">Scroll</option>
                </select>
                <span id="page-layout-description" className="sr-only">
                  Choose the default page layout for reading
                </span>
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
                  aria-describedby="reading-mode-description"
                >
                  <option value="paginated">Paginated</option>
                  <option value="continuous">Continuous</option>
                </select>
                <span id="reading-mode-description" className="sr-only">
                  Choose between paginated or continuous reading mode
                </span>
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
                  aria-describedby="history-retention-description"
                  aria-valuemin={7}
                  aria-valuemax={365}
                  aria-valuenow={readingSettings.historyRetentionDays}
                />
                <span id="history-retention-description" className="sr-only">
                  Set how many days to retain reading history
                </span>
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
                    aria-describedby="page-transitions-description"
                  />
                  Enable Page Transitions
                  <span id="page-transitions-description" className="sr-only">
                    Enable smooth transitions between pages
                  </span>
                </label>
              </div>

              <div className="setting-item checkbox-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.autoSaveProgress}
                    onChange={actions.toggleAutoSave}
                    aria-describedby="auto-save-description"
                  />
                  Auto-save Reading Progress
                  <span id="auto-save-description" className="sr-only">
                    Automatically save reading progress
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* Translation Section */}
          <section className="settings-section" aria-labelledby="translation-heading">
            <h2 id="translation-heading">Translation</h2>
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
                    aria-describedby="translation-enabled-description"
                  />
                  Enable Translation
                  <span id="translation-enabled-description" className="sr-only">
                    Enable text translation features
                  </span>
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
                      aria-describedby="target-language-description"
                    />
                    <span id="target-language-description" className="sr-only">
                      Enter your preferred language code for translation
                    </span>
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
                      aria-describedby="translation-provider-description"
                    >
                      <option value="google">Google Translate</option>
                      <option value="deepl">DeepL</option>
                      <option value="custom">Custom</option>
                    </select>
                    <span id="translation-provider-description" className="sr-only">
                      Choose your preferred translation service
                    </span>
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
                        aria-describedby="api-key-description"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="toggle-visibility-btn"
                        aria-label={showApiKey ? "Hide API key" : "Show API key"}
                      >
                        {showApiKey ? "Hide" : "Show"}
                      </button>
                    </div>
                    <span id="api-key-description" className="sr-only">
                      Enter your translation service API key
                    </span>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Data Section */}
          <section className="settings-section" aria-labelledby="data-heading">
            <h2 id="data-heading">Data</h2>
            <div className="settings-grid">
              <div className="setting-item">
                <span>Settings Backup</span>
                <div className="button-group">
                  <button
                    type="button"
                    onClick={handleExportSettings}
                    className="btn btn-secondary"
                    disabled={isLoading}
                    aria-describedby="export-settings-description"
                  >
                    {isLoading ? 'Exporting...' : 'Export Settings'}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary"
                    disabled={isLoading}
                    aria-describedby="import-settings-description"
                  >
                    {isLoading ? 'Importing...' : 'Import Settings'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportSettings}
                    style={{ display: "none" }}
                    aria-label="Import settings file"
                  />
                  <span id="export-settings-description" className="sr-only">
                    Export your current settings to a JSON file
                  </span>
                  <span id="import-settings-description" className="sr-only">
                    Import settings from a previously saved JSON file
                  </span>
                </div>
              </div>

              <div className="setting-item">
                <span>Library Metadata</span>
                <div className="button-group">
                  <button
                    type="button"
                    onClick={handleExportLibrary}
                    className="btn btn-secondary"
                    disabled={isLoading}
                    aria-describedby="export-library-description"
                  >
                    {isLoading ? 'Exporting...' : 'Export Library'}
                  </button>
                  <button
                    type="button"
                    onClick={() => libraryInputRef.current?.click()}
                    className="btn btn-secondary"
                    disabled={isLoading}
                    aria-describedby="import-library-description"
                  >
                    {isLoading ? 'Importing...' : 'Import Library'}
                  </button>
                  <input
                    ref={libraryInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportLibrary}
                    style={{ display: "none" }}
                    aria-label="Import library metadata file"
                  />
                  <span id="export-library-description" className="sr-only">
                    Export your library metadata to a JSON file
                  </span>
                  <span id="import-library-description" className="sr-only">
                    Import library metadata from a previously saved JSON file
                  </span>
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
                <span>Reset Settings</span>
                <button
                  type="button"
                  onClick={handleResetSettings}
                  disabled={isLoading}
                  className={`btn btn-danger ${showResetConfirm ? "confirm" : ""}`}
                  aria-describedby="reset-settings-description"
                  aria-label="Reset settings to default values"
                >
                  {showResetConfirm ? "Click again to confirm" : "Reset to Defaults"}
                </button>
                <span id="reset-settings-description" className="sr-only">
                  Reset all settings to their default values. This action cannot be undone.
                </span>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section className="settings-section" aria-labelledby="about-heading">
            <h2 id="about-heading">About</h2>
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
