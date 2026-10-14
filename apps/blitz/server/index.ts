import { config } from "./config.js";
import { createApp } from "./app.js";

const { app, startBackgroundGeneration } = createApp(config);
startBackgroundGeneration();

app.listen(config.port, () => {
  const on = (b: unknown) => (b ? "on" : "off");
  console.log(`Blitz API on http://localhost:${config.port}`);
  console.log(
    `  buffer=${on(config.bufferApiKey)} claude=${on(config.anthropicApiKey)} pexels=${on(config.pexelsApiKey)} public_url=${config.publicBaseUrl ?? "unset"}`,
  );
});
