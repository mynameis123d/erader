import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MEDIA_BUCKET, SupabaseStore } from "../server/storage";

const KEY = "service-role-key";

/** Minimal Supabase Storage stand-in: buckets, upsert uploads, authenticated and public downloads. */
function fakeSupabase() {
  const buckets = new Map<string, boolean>();
  const objects = new Map<string, { type: string; data: Buffer }>();
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      const url = new URL(req.url ?? "/", "http://x");
      const send = (status: number, payload: unknown, type = "application/json") => {
        res.writeHead(status, { "content-type": type });
        res.end(Buffer.isBuffer(payload) ? payload : JSON.stringify(payload));
      };
      const pub = url.pathname.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
      if (pub) {
        const o = objects.get(`${pub[1]}/${decodeURIComponent(pub[2])}`);
        if (!buckets.get(pub[1]) || !o) return send(400, { error: "not found" });
        return send(200, o.data, o.type);
      }
      if (req.headers.apikey !== KEY || req.headers.authorization !== `Bearer ${KEY}`) return send(403, { error: "bad key" });
      if (url.pathname === "/storage/v1/bucket" && req.method === "POST") {
        const { id, public: isPublic } = JSON.parse(body.toString());
        if (buckets.has(id)) return send(400, { statusCode: "409", error: "Duplicate", message: "The resource already exists" });
        buckets.set(id, isPublic);
        return send(200, { name: id });
      }
      const obj = url.pathname.match(/^\/storage\/v1\/object\/([^/]+)\/(.+)$/);
      if (obj) {
        const key = `${obj[1]}/${decodeURIComponent(obj[2])}`;
        if (req.method === "POST") {
          if (objects.has(key) && req.headers["x-upsert"] !== "true") return send(400, { error: "exists" });
          objects.set(key, { type: String(req.headers["content-type"]), data: body });
          return send(200, { Key: key });
        }
        const o = objects.get(key);
        return o ? send(200, o.data, o.type) : send(400, { error: "not_found" });
      }
      send(404, {});
    });
  });
  return new Promise<{ url: string; buckets: typeof buckets; objects: typeof objects; close: () => void }>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve({ url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, buckets, objects, close: () => server.close() })),
  );
}

let sb: Awaited<ReturnType<typeof fakeSupabase>>;
beforeAll(async () => {
  sb = await fakeSupabase();
});
afterAll(() => sb?.close());

describe("SupabaseStore", () => {
  it("creates buckets idempotently and round-trips JSON and public media", async () => {
    const store = new SupabaseStore(sb.url, KEY);
    await store.ensureBuckets();
    await store.ensureBuckets();
    expect([...sb.buckets]).toEqual([
      ["blitz-private", false],
      ["blitz-media", true],
    ]);
    await store.saveJson("x.json", { a: 1 });
    expect(await store.loadJson("x.json")).toEqual({ a: 1 });
    expect(await store.loadJson("missing.json")).toBeNull();
    const url = await store.publish("renders/c1/video.mp4", Buffer.from("mp4data"), "video/mp4");
    expect(url).toBe(`${sb.url}/storage/v1/object/public/${MEDIA_BUCKET}/renders/c1/video.mp4`);
    expect(await (await fetch(url)).text()).toBe("mp4data");
  });

  it("explains a wrong key", async () => {
    await expect(new SupabaseStore(sb.url, "anon").ensureBuckets()).rejects.toThrow(/service_role/);
  });
});

describe("app on Supabase", () => {
  const boot = async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "blitz-sb-"));
    const { config } = await import("../server/config");
    const { createApp } = await import("../server/app");
    const made = createApp({ ...config, dataDir, mediaDir: path.join(dataDir, "media"), supabaseUrl: sb.url, supabaseKey: KEY, webDist: "/nope", anthropicApiKey: null, pexelsApiKey: null, pixabayApiKey: null, openverse: false, apifyToken: null, bufferApiKey: null, publicBaseUrl: null, appPassword: null });
    await made.ready;
    const server = made.app.listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    return { ...made, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, close: () => server.close() };
  };

  it("keeps profile, cards, keys and uploads across a restart on a fresh machine", async () => {
    const a = await boot();
    const put = (p: string, body: unknown) => fetch(`${a.url}${p}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    await put("/api/profile", { url: "https://stride.example/", name: "Stride", oneLiner: "Sneakers", audience: "a", tone: "b", painPoints: [], benefits: ["comfy"], keywords: ["sneakers"] });
    await put("/api/keys/PEXELS_API_KEY", { value: "a".repeat(40) });
    const gen = await (await fetch(`${a.url}/api/blitz/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ count: 2 }) })).json();
    expect(gen.cards).toHaveLength(2);
    const up = await fetch(`${a.url}/api/uploads`, { method: "POST", headers: { "content-type": "image/png" }, body: Buffer.from("png") });
    const { url } = await up.json();
    expect(url).toMatch(new RegExp(`^${sb.url}/storage/v1/object/public/blitz-media/uploads/.+\\.png$`));
    await new Promise((r) => setTimeout(r, 1200)); // debounced save
    a.close();

    const b = await boot(); // new temp dir: nothing local survives
    const state = await (await fetch(`${b.url}/api/state`)).json();
    expect(state.profile.name).toBe("Stride");
    expect(state.capabilities.storage).toBe("supabase");
    const feed = await (await fetch(`${b.url}/api/blitz/feed`)).json();
    expect(feed.cards.map((c: { id: string }) => c.id).sort()).toEqual(gen.cards.map((c: { id: string }) => c.id).sort());
    const keys = await (await fetch(`${b.url}/api/keys`)).json();
    expect(keys.keys.find((k: { name: string }) => k.name === "PEXELS_API_KEY")).toMatchObject({ set: true, from: "settings" });
    b.close();
  }, 30000);
});
