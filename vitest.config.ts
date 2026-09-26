import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // notion-clone/ is a standalone app with its own dependencies and test setup.
    exclude: [...configDefaults.exclude, "notion-clone/**"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
