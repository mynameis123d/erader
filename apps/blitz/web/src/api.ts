import type {
  BlitzCard,
  IntegrationsStatus,
  ProductProfile,
  PublishRecord,
  PublishingSettings,
  PublishRequest,
  ViralReference,
} from "../../shared/types";

export type { BlitzCard, IntegrationsStatus, ProductProfile, PublishingSettings, PublishRecord, PublishRequest, ViralReference };
export type RefMap = Record<string, ViralReference | undefined>;

export interface AppState {
  profile: ProductProfile | null;
  capabilities: { claude: boolean; pexels: boolean; photos: string; videos: string | null; apify: boolean; buffer: boolean };
  counts: Record<string, number>;
}

async function call<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: init?.json !== undefined ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  return body as T;
}

export const api = {
  state: () => call<AppState>("/api/state"),
  analyze: (url: string) =>
    call<{ profile: Omit<ProductProfile, "updatedAt">; source: string }>("/api/profile/analyze", { method: "POST", json: { url } }),
  saveProfile: (p: Omit<ProductProfile, "updatedAt">) => call<{ profile: ProductProfile }>("/api/profile", { method: "PUT", json: p }),
  feed: () => call<{ cards: BlitzCard[]; references: RefMap }>("/api/blitz/feed"),
  generate: (count = 3) => call<{ cards: BlitzCard[]; references: RefMap }>("/api/blitz/generate", { method: "POST", json: { count } }),
  cards: (status: string) => call<{ cards: BlitzCard[]; references: RefMap }>(`/api/cards?status=${status}`),
  decide: (id: string, decision: "approve" | "reject" | "undo") =>
    call<{ card: BlitzCard; publishing?: boolean }>(`/api/cards/${id}/decision`, { method: "POST", json: { decision } }),
  newVideo: (id: string, query?: string) => call<{ card: BlitzCard }>(`/api/cards/${id}/video`, { method: "POST", json: { query } }),
  publishingSettings: () => call<PublishingSettings>("/api/settings/publishing"),
  savePublishingSettings: (s: PublishingSettings) => call<PublishingSettings>("/api/settings/publishing", { method: "PUT", json: s }),
  pullTrending: () => call<{ added: number; references: ViralReference[] }>("/api/references/trending", { method: "POST" }),
  patchCard: (id: string, patch: Partial<Pick<BlitzCard, "theme" | "slides" | "caption" | "hashtags">>) =>
    call<{ card: BlitzCard }>(`/api/cards/${id}`, { method: "PATCH", json: patch }),
  slideImage: (id: string, slideId: string, body: { query?: string; imageUrl?: string | null }) =>
    call<{ card: BlitzCard }>(`/api/cards/${id}/slides/${slideId}/image`, { method: "POST", json: body }),
  upload: (file: File) => call<{ url: string }>("/api/uploads", { method: "POST", body: file, headers: { "Content-Type": file.type } }),
  render: (id: string, aspect: "4:5" | "9:16", video: boolean) =>
    call<{ images: string[]; video?: string }>(`/api/cards/${id}/render`, { method: "POST", json: { aspect, video } }),
  publish: (id: string, req: PublishRequest) =>
    call<{ card: BlitzCard; records: PublishRecord[] }>(`/api/cards/${id}/publish`, { method: "POST", json: req }),
  integrations: (refresh = false) => call<IntegrationsStatus>(`/api/integrations${refresh ? "?refresh=1" : ""}`),
  references: () => call<{ references: ViralReference[] }>("/api/references"),
  addReference: (r: Partial<ViralReference>) => call<{ reference: ViralReference }>("/api/references", { method: "POST", json: r }),
};

export const fmtCount = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);
export const DEMO = false;
