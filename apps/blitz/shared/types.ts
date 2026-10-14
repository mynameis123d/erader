// Types shared by the API server and the web client.

export type ContentFormat = "slideshow" | "video";

/** What Fastlane calls the brand context: built from the user's website. */
export interface ProductProfile {
  url: string;
  name: string;
  oneLiner: string;
  audience: string;
  tone: string;
  painPoints: string[];
  benefits: string[];
  keywords: string[];
  updatedAt: string;
}

/** A viral post (or post format) that Blitz remixes, shown as "Remixed From". */
export interface ViralReference {
  id: string;
  format: ContentFormat;
  platform: "tiktok" | "instagram" | "youtube";
  /** Hook shown on the first slide. */
  hook: string;
  /** Text of each slide, including the hook slide. */
  slides: string[];
  /** One-line description of the format's structure. */
  structure: string;
  /** Why the format performs; used for "Why This Content?". */
  whyItWorks: string;
  /** Search terms for the visual mood of the original. */
  imageQueries: string[];
  sourceUrl?: string;
  /** Only real numbers. Library templates leave these empty. */
  likes?: number;
  views?: number;
  /** True for formats from the built-in library rather than a real post. */
  isTemplate: boolean;
}

export interface Slide {
  id: string;
  text: string;
  imageQuery: string;
  imageUrl: string | null;
  /** Gradient used when no image is available. */
  background: [string, string];
  /** Vertical position of the text block, 0 (top) to 1 (bottom). */
  textY: number;
}

export type CardStatus = "pending" | "approved" | "rejected" | "published";

export interface BlitzCard {
  id: string;
  format: ContentFormat;
  /** Short concept name, e.g. "One Shoe, Full Day". */
  theme: string;
  referenceId: string;
  slides: Slide[];
  caption: string;
  hashtags: string[];
  why: string;
  status: CardStatus;
  generator: "claude" | "template";
  createdAt: string;
  decidedAt?: string;
  publishes: PublishRecord[];
}

export type PublishMode = "addToQueue" | "shareNow" | "customScheduled";

export interface PublishRequest {
  channelIds: string[];
  mode: PublishMode;
  /** ISO time, required for customScheduled. */
  dueAt?: string;
  /** Send TikTok/Instagram as a video instead of a photo carousel. YouTube is always video. */
  asVideo?: boolean;
}

export interface PublishRecord {
  channelId: string;
  service: string;
  ok: boolean;
  bufferPostId?: string;
  error?: string;
  mediaType: "images" | "video";
  at: string;
}

export interface BufferChannel {
  id: string;
  name: string;
  displayName: string | null;
  service: string;
  avatar: string | null;
  isQueuePaused: boolean;
}

export interface IntegrationsStatus {
  buffer: {
    configured: boolean;
    ok: boolean;
    error?: string;
    organizationId?: string;
    channels: BufferChannel[];
  };
  publicBaseUrl: string | null;
  claude: boolean;
  pexels: boolean;
}
