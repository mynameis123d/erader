import React from "react";
import { createRoot } from "react-dom/client";
import { SettingsPage } from "./components/SettingsPage";
import { initializeStores } from "./init";

async function bootstrap() {
  await initializeStores();

  const container = document.getElementById("root");
  if (container) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <SettingsPage />
      </React.StrictMode>
    );
  }
}

bootstrap();
