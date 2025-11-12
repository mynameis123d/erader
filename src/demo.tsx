import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { SettingsPage, TranslationManager } from "./components";
import { useTextSelection } from "./hooks/useTextSelection";
import { initializeStores } from "./init";

// Demo reader component
const ReaderDemo: React.FC = () => {
  const [showTranslation, setShowTranslation] = useState(true);
  useTextSelection();

  const sampleText = `
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
    
    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
    
    Select any text above to see the translation tooltip appear. Double-click for word selection or drag for sentence selection. Click "Translate" to see the translation in the panel.
  `;

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1>Ebook Reader - Translation Demo</h1>
        <p>This demo showcases the translation functionality. Select text to translate!</p>
        <button 
          onClick={() => setShowTranslation(!showTranslation)}
          style={{
            padding: "10px 20px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginRight: "10px"
          }}
        >
          {showTranslation ? "Hide" : "Show"} Translation
        </button>
        <button 
          onClick={() => window.location.hash = "#settings"}
          style={{
            padding: "10px 20px",
            background: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Go to Settings
        </button>
      </div>

      <div 
        style={{
          background: "white",
          padding: "30px",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          lineHeight: "1.6",
          fontSize: "16px",
          fontFamily: "Georgia, serif"
        }}
      >
        {sampleText.split('\n').map((paragraph, index) => (
          <p key={index} style={{ marginBottom: "1em", textAlign: "justify" }}>
            {paragraph.trim() || <br />}
          </p>
        ))}
      </div>

      {showTranslation && <TranslationManager />}
    </div>
  );
};

// Settings page component
const SettingsDemo: React.FC = () => {
  return (
    <div>
      <div style={{ 
        padding: "20px", 
        background: "#f8f9fa", 
        borderBottom: "1px solid #dee2e6",
        textAlign: "center"
      }}>
        <button 
          onClick={() => window.location.hash = "#"}
          style={{
            padding: "10px 20px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Back to Reader Demo
        </button>
      </div>
      <SettingsPage />
      <TranslationManager />
    </div>
  );
};

// Main app component
const App: React.FC = () => {
  const [currentView, setCurrentView] = useState(window.location.hash || "#reader");

  React.useEffect(() => {
    const handleHashChange = () => {
      setCurrentView(window.location.hash || "#reader");
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      {currentView === "#settings" ? <SettingsDemo /> : <ReaderDemo />}
    </div>
  );
};

async function bootstrap() {
  await initializeStores();

  const container = document.getElementById("root");
  if (container) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

bootstrap();
