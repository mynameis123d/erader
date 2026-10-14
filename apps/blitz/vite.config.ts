import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

const apiPort = process.env.PORT ?? "8787";
const here = path.dirname(fileURLToPath(import.meta.url));

// `vite build --mode demo` makes a single self-contained HTML preview that swaps the
// HTTP API for an in-browser stand-in (web/src/demo/api.ts).
export default defineConfig(({ mode }) => {
  const demo = mode === "demo";
  return {
    root: "web",
    plugins: demo ? [react(), viteSingleFile()] : [react()],
    resolve: demo ? { alias: [{ find: /^\.\.?\/api$/, replacement: path.join(here, "web/src/demo/api.ts") }] } : undefined,
    build: { outDir: demo ? "../preview" : "dist", emptyOutDir: true },
    server: {
      port: 5173,
      proxy: {
        "/api": `http://localhost:${apiPort}`,
        "/media": `http://localhost:${apiPort}`,
      },
    },
    test: { root: ".", include: ["tests/**/*.test.ts"], environment: "node" },
  } as never;
});
