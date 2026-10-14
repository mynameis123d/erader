import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiPort = process.env.PORT ?? "8787";

export default defineConfig({
  root: "web",
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
  server: {
    port: 5173,
    proxy: {
      "/api": `http://localhost:${apiPort}`,
      "/media": `http://localhost:${apiPort}`,
    },
  },
  test: { root: ".", include: ["tests/**/*.test.ts"], environment: "node" },
} as never);
