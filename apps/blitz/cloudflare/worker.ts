// Cloudflare entry point: a Worker in front of one Blitz container (Docker image from ../Dockerfile).
// All traffic goes to the container; a cron trigger wakes it so new content keeps coming
// even when nobody has the app open. State lives in Supabase, so the container can sleep safely.
import { Container, getContainer } from "@cloudflare/containers";

interface Env {
  BLITZ: DurableObjectNamespace<BlitzContainer>;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  APP_PASSWORD?: string;
}

export class BlitzContainer extends Container<Env> {
  defaultPort = 8787;
  // Stay up long enough for background generation and scrapes to finish.
  sleepAfter = "20m";

  constructor(ctx: DurableObjectState<Env>, env: Env) {
    super(ctx, env);
    this.envVars = {
      NODE_ENV: "production",
      PORT: "8787",
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
      ...(env.APP_PASSWORD ? { APP_PASSWORD: env.APP_PASSWORD } : {}),
    };
  }
}

const blitz = (env: Env) => getContainer(env.BLITZ, "main");

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return blitz(env).fetch(request);
  },

  // Cron: refresh trending posts and top up the feed (see "triggers" in wrangler.jsonc).
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(blitz(env).fetch(new Request("http://blitz.internal/api/cron/tick", { method: "POST" })).then((r) => r.text()));
  },
} satisfies ExportedHandler<Env>;
