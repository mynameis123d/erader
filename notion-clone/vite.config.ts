import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// `vite build --mode single` inlines everything into one portable index.html.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "single" ? [viteSingleFile()] : [])],
  base: "./",
  build: {
    outDir: mode === "single" ? "dist-single" : "dist",
    // The landing page ships alongside the app in normal builds.
    rollupOptions: mode === "single" ? {} : { input: { app: "index.html", landing: "landing.html" } },
  },
  test: { environment: "jsdom" },
}));
