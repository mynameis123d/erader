// Cloud persistence on Supabase Storage (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
//   blitz-private (private bucket): state/db.json and state/keys.json
//   blitz-media   (public bucket):  rendered posts and Media Bank uploads, so Buffer can
//                                   download them straight from Supabase (no tunnel needed)
// Buckets are created on first start; nothing to set up by hand in Supabase.
// Without Supabase configured, everything stays on local disk (data/).

type FetchLike = typeof fetch;

export const PRIVATE_BUCKET = "blitz-private";
export const MEDIA_BUCKET = "blitz-media";

export class SupabaseStore {
  private base: string;

  constructor(
    url: string,
    private key: string,
    private fetchImpl: FetchLike = fetch,
  ) {
    this.base = url.replace(/\/+$/, "");
  }

  private headers(extra: Record<string, string> = {}) {
    return { apikey: this.key, Authorization: `Bearer ${this.key}`, ...extra };
  }

  private async req(path: string, init: RequestInit = {}): Promise<Response> {
    try {
      return await this.fetchImpl(`${this.base}${path}`, { ...init, headers: this.headers(init.headers as Record<string, string>), signal: AbortSignal.timeout(60000) });
    } catch (e) {
      throw new Error(`Could not reach Supabase: ${(e as Error).message}`);
    }
  }

  /** Create both buckets if they don't exist yet. */
  async ensureBuckets(): Promise<void> {
    for (const [id, isPublic] of [
      [PRIVATE_BUCKET, false],
      [MEDIA_BUCKET, true],
    ] as const) {
      const res = await this.req("/storage/v1/bucket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: id, public: isPublic }),
      });
      if (res.ok) continue;
      const text = await res.text();
      if (res.status === 401 || res.status === 403) throw new Error("Supabase rejected the key. Use the service_role (secret) key, not the anon key");
      if (!/exist|duplicate/i.test(text)) throw new Error(`Supabase bucket ${id}: HTTP ${res.status} ${text.slice(0, 160)}`);
    }
  }

  async upload(bucket: string, path: string, data: Buffer | string, contentType: string): Promise<void> {
    const res = await this.req(`/storage/v1/object/${bucket}/${encodePath(path)}`, {
      method: "POST",
      headers: { "Content-Type": contentType, "x-upsert": "true", "cache-control": "max-age=3600" },
      body: typeof data === "string" ? data : new Uint8Array(data),
    });
    if (!res.ok) throw new Error(`Supabase upload ${path}: HTTP ${res.status} ${(await res.text()).slice(0, 160)}`);
  }

  async download(bucket: string, path: string): Promise<string | null> {
    const res = await this.req(`/storage/v1/object/${bucket}/${encodePath(path)}`);
    if (res.status === 404 || res.status === 400) return null;
    if (!res.ok) throw new Error(`Supabase download ${path}: HTTP ${res.status}`);
    return res.text();
  }

  publicUrl(path: string): string {
    return `${this.base}/storage/v1/object/public/${MEDIA_BUCKET}/${encodePath(path)}`;
  }

  async loadJson<T>(name: string): Promise<T | null> {
    const text = await this.download(PRIVATE_BUCKET, `state/${name}`);
    if (!text) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }

  saveJson(name: string, value: unknown): Promise<void> {
    return this.upload(PRIVATE_BUCKET, `state/${name}`, JSON.stringify(value), "application/json");
  }

  /** Upload a public media file and return its URL. */
  async publish(path: string, data: Buffer, contentType: string): Promise<string> {
    await this.upload(MEDIA_BUCKET, path, data, contentType);
    return this.publicUrl(path);
  }
}

const encodePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");

export const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

export const contentTypeFor = (file: string) => CONTENT_TYPES[file.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";

/** Debounced writer so rapid state changes become one upload. */
export function debounced(fn: () => Promise<void>, ms = 800) {
  let timer: NodeJS.Timeout | null = null;
  let running: Promise<void> = Promise.resolve();
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      running = running.then(fn).catch((e: Error) => console.warn("[supabase] save failed:", e.message));
    }, ms);
  };
  const flush = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      running = running.then(fn);
    }
    await running;
  };
  return { schedule, flush };
}
