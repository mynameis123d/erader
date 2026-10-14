// Types shared by the API server and the web client.

import type { Mood } from "./scene";

/**
 * Post formats. "video" is Wall of Text (one clip, a block of text over it).
 * "green_screen": a background image (screenshot, product shot, post) on top, a creator clip below, text on top.
 * "hook_demo": a short hook clip with a hook line, then a product demo clip from the Media Bank.
 */
export type ContentFormat = "slideshow" | "video" | "green_screen" | "hook_demo";

export const FORMAT_LABELS: Record<ContentFormat, string> = {
  slideshow: "Slideshow",
  video: "Wall of Text",
  green_screen: "Green Screen",
  hook_demo: "Hook + Demo",
};

/** How Blitz decides what to write. Mirrors Fastlane's voice / angles / format weights / remix %. */
export interface BlitzPreferences {
  /** How posts should sound, in the user's words. */
  voice: string;
  /** Recurring themes to write about, e.g. "behind the scenes", "customer wins". */
  angles: string[];
  /** Relative weight of each format (0 = never). */
  formatWeights: Record<ContentFormat, number>;
  /** Share of cards that remix a trending post; the rest are original ("Create New"). 0-100. */
  remixPercent: number;
  /** Keep at least this many cards waiting in the feed (generated in the background). */
  feedTarget: number;
}

export const DEFAULT_PREFERENCES: BlitzPreferences = {
  voice: "",
  angles: [],
  formatWeights: { slideshow: 3, video: 3, green_screen: 1, hook_demo: 1 },
  remixPercent: 60,
  feedTarget: 8,
};

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
  /** Cover image of the original post (from Apify), if known. */
  thumbnail?: string;
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
  /** Gradient kept for older cards; painted scenes are used when there is no photo. */
  background: [string, string];
  /** Painted scene used when there is no photo. Unset = picked from imageQuery. */
  scene?: Mood | null;
  /** Vertical position of the text block, 0 (top) to 1 (bottom). */
  textY: number;
}

/** Stock background clip (Pexels / Pixabay) behind a video post. */
export interface CardVideo {
  query: string;
  source: "pexels" | "pixabay" | "library";
  /** High-res MP4 used for the export. */
  url: string;
  /** Lighter MP4 for the in-app preview. */
  previewUrl: string;
  poster: string | null;
  duration: number;
  width: number;
  height: number;
  credit: string;
  pageUrl: string;
}

export type CardStatus = "pending" | "approved" | "rejected" | "published";

export interface BlitzCard {
  id: string;
  format: ContentFormat;
  /** Short concept name, e.g. "One Shoe, Full Day". */
  theme: string;
  referenceId: string;
  /** Slideshow: one entry per slide. Video ("Wall of Text"): exactly one entry, the text over the clip. */
  slides: Slide[];
  /** Background clip for video posts (Wall of Text), the creator clip (Green Screen) or the hook clip (Hook + Demo). */
  video?: CardVideo | null;
  /** Hook + Demo: the product demo clip that follows the hook. */
  demoVideo?: CardVideo | null;
  /** "remix" adapts a trending post; "original" is a Create New idea. */
  origin?: "remix" | "original";
  /** The content angle an original idea was written for. */
  angle?: string;
  caption: string;
  hashtags: string[];
  why: string;
  status: CardStatus;
  generator: "claude" | "template";
  createdAt: string;
  decidedAt?: string;
  publishes: PublishRecord[];
}

/** One-click publishing: approving a card sends it straight to these Buffer channels. */
export interface PublishingSettings {
  autoPublish: boolean;
  channelIds: string[];
  mode: "addToQueue" | "shareNow";
  /** Send slideshows to TikTok/Instagram as video too. */
  slideshowsAsVideo: boolean;
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
  /** Which photo source new slides use. */
  photos: "pexels" | "openverse" | "scenes";
  /** Where background videos come from (null = no key, video posts use painted scenes). */
  videos: "pexels" | "pixabay" | null;
  apify: boolean;
}

/**
 * Usage rights of a B-roll clip. Only "owned", "licensed" and "cleared" clips can be published.
 * TikTok clips found through Apify start as "needs_permission" until the creator agrees.
 */
export type ClipRights = "owned" | "licensed" | "needs_permission" | "requested" | "cleared" | "declined";

export interface BrollClip {
  id: string;
  /** Media Bank items can be clips or still images. Missing = video (older data). */
  kind?: "video" | "image";
  source: "tiktok" | "upload";
  title: string;
  tags: string[];
  creator?: string;
  sourceUrl?: string;
  thumbnail?: string;
  duration?: number;
  views?: number;
  likes?: number;
  rights: ClipRights;
  /** Proof of permission, e.g. "Creator approved by DM on Oct 14". */
  rightsNote?: string;
  /** Local /media path once the file is in the library. */
  fileUrl: string | null;
  addedAt: string;
}

export const USABLE_RIGHTS: ClipRights[] = ["owned", "licensed", "cleared"];
