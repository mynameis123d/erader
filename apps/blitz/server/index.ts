import { config } from "./config.js";
import { createApp } from "./app.js";

const { app, ready, startBackgroundGeneration } = createApp(config);
try {
  await ready;
} catch (e) {
  console.error(`[supabase] ${(e as Error).message}`);
  process.exit(1);
}
startBackgroundGeneration();

app.listen(config.port, () => {
  const on = (b: unknown) => (b ? "on" : "off");
  console.log(`Blitz API on http://localhost:${config.port}`);
  console.log(
    `  storage=${config.supabaseUrl ? "supabase" : "local"} buffer=${on(config.bufferApiKey)} claude=${on(config.anthropicApiKey)} pexels=${on(config.pexelsApiKey)} public_url=${config.publicBaseUrl ?? "unset"}`,
  );
});
