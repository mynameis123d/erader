import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { SettingsPage } from "./components/SettingsPage";
import { AnnotationsDemo } from "./components/AnnotationsDemo";
import { initializeStores } from "./init";
import "./demo.css";

function App() {
  const [activeDemo, setActiveDemo] = useState<"settings" | "annotations">("settings");

  return (
    <div className="demo-app">
      <header className="demo-header">
        <h1>eBook Reader Demo</h1>
        <nav className="demo-nav">
          <button
            className={`nav-button ${activeDemo === "settings" ? "active" : ""}`}
            onClick={() => setActiveDemo("settings")}
          >
            Settings
          </button>
          <button
            className={`nav-button ${activeDemo === "annotations" ? "active" : ""}`}
            onClick={() => setActiveDemo("annotations")}
          >
            Annotations
          </button>
        </nav>
      </header>
      
      <main className="demo-main">
        {activeDemo === "settings" && <SettingsPage />}
        {activeDemo === "annotations" && <AnnotationsDemo />}
      </main>
    </div>
  );
}

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
