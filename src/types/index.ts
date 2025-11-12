export type BookFormat = "epub" | "pdf" | "html" | "text" | "unknown";

export interface ManifestResource {
  id: string;
  href?: string;
  mediaType?: string;
  title?: string;
  order: number;
  properties?: Record<string, unknown>;
}

export interface ContentManifestItem {
  id: string;
  title?: string;
  href?: string;
  order: number;
  level?: number;
  spineItemId?: string;
  children?: ContentManifestItem[];
}

export interface ManifestTextLayer {
  id: string;
  page: number;
  label?: string;
}

export interface ContentManifest {
  format: BookFormat;
  spine: ManifestResource[];
  tableOfContents: ContentManifestItem[];
  pageCount?: number;
  textLayers?: ManifestTextLayer[];
  resources?: ManifestResource[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BookMetadata {
  title: string;
  author?: string;
  publisher?: string;
  publishedDate?: string;
  isbn?: string;
  language?: string;
  description?: string;
  coverImage?: string;
  tags?: string[];
  format?: BookFormat;
  identifiers?: Record<string, string>;
  pageCount?: number;
}

export interface BookFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  blob: Blob;
  addedDate: Date;
  manifest?: ContentManifest;
  coverImageBlob?: Blob;
}

export interface Book {
  id: string;
  fileId: string;
  metadata: BookMetadata;
  manifest?: ContentManifest;
  isFavorite: boolean;
  dateAdded: Date;
  lastOpened?: Date;
  collectionIds?: string[];
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  bookIds: string[];
  createdDate: Date;
  updatedDate: Date;
}

export interface ReadingLocation {
  cfi?: string;
  position?: number;
  chapter?: string;
  page?: number;
}

export interface Highlight {
  id: string;
  bookId: string;
  text: string;
  location: ReadingLocation;
  color?: string;
  note?: string;
  createdDate: Date;
  updatedDate?: Date;
}

export interface Bookmark {
  id: string;
  bookId: string;
  location: ReadingLocation;
  label?: string;
  createdDate: Date;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  startTime: Date;
  endTime?: Date;
  startLocation: ReadingLocation;
  endLocation?: ReadingLocation;
  progressPercentage: number;
}

export interface ThemeSettings {
  mode: "light" | "dark" | "sepia" | "custom";
  backgroundColor?: string;
  textColor?: string;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  textAlign: "left" | "center" | "right" | "justify";
  marginHorizontal: number;
  marginVertical: number;
}

export interface TranslationSettings {
  enabled: boolean;
  sourceLanguage?: string;
  targetLanguage: string;
  provider: "google" | "deepl" | "custom";
  apiKey?: string;
}

export interface ReadingSettings {
  defaultPageLayout: "single" | "double" | "scroll";
  readingMode: "paginated" | "continuous";
  historyRetentionDays: number;
  enablePageTransitions: boolean;
}

export interface AppSettings {
  theme: ThemeSettings;
  translation: TranslationSettings;
  reading: ReadingSettings;
  autoSaveProgress: boolean;
  enableAnalytics: boolean;
  lastSyncDate?: Date;
}

export interface ActivityHistoryEntry {
  id: string;
  bookId: string;
  type:
    | "added"
    | "removed"
    | "opened"
    | "progress"
    | "completed"
    | "highlight"
    | "bookmark";
  timestamp: Date;
  details?: Record<string, any>;
}

export type IngestionStatus = "success" | "duplicate" | "unsupported" | "error";

export interface FileIngestionResult {
  status: IngestionStatus;
  fileName: string;
  bookId?: string;
  metadata?: BookMetadata;
  manifest?: ContentManifest;
  duplicateOf?: string;
  error?: string;
}
