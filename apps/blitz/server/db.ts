import fs from "node:fs";
import path from "node:path";
import { DEFAULT_PREFERENCES, type BlitzCard, type BlitzPreferences, type BrollClip, type ProductProfile, type PublishingSettings, type ViralReference } from "../shared/types.js";

/** One Apify scrape: a run started here, or an existing run imported by ID. */
export interface ScrapeJob {
  runId: string;
  datasetId?: string;
  hashtags: string[];
  status: string;
  startedAt: string;
  finishedAt?: string;
  imported?: { references: number; clips: number };
  error?: string;
}

export interface DbShape {
  profile: ProductProfile | null;
  cards: BlitzCard[];
  /** User-imported references; merged with the built-in library. */
  references: ViralReference[];
  publishing: PublishingSettings;
  broll: BrollClip[];
  preferences: BlitzPreferences;
  scrapes: ScrapeJob[];
}

const empty = (): DbShape => ({
  profile: null,
  cards: [],
  references: [],
  publishing: { autoPublish: false, channelIds: [], mode: "addToQueue", slideshowsAsVideo: false },
  broll: [],
  preferences: structuredClone(DEFAULT_PREFERENCES),
  scrapes: [],
});

/** Tiny JSON-file store. Good enough for a single-user tool; swap for SQLite/Postgres later. */
export class Db {
  private data: DbShape;

  /** Called after every local save, e.g. to mirror the state to Supabase. */
  onSave: (() => void) | null = null;

  constructor(private file: string) {
    this.data = empty();
    if (fs.existsSync(file)) {
      try {
        this.data = Db.migrate(JSON.parse(fs.readFileSync(file, "utf8")));
      } catch {
        fs.renameSync(file, `${file}.corrupt-${Date.now()}`);
      }
    }
  }

  /** Fill in fields added in later versions. */
  static migrate(saved: Partial<DbShape>): DbShape {
    const base = empty();
    return {
      ...base,
      ...saved,
      preferences: { ...base.preferences, ...saved.preferences, formatWeights: { ...base.preferences.formatWeights, ...saved.preferences?.formatWeights } },
    } as DbShape;
  }

  /** Replace the whole state (loaded from Supabase at startup). */
  hydrate(saved: Partial<DbShape>) {
    this.data = Db.migrate(saved);
    this.writeLocal();
  }

  get state(): DbShape {
    return this.data;
  }

  update<T>(fn: (d: DbShape) => T): T {
    const result = fn(this.data);
    this.flush();
    return result;
  }

  findCard(id: string): BlitzCard | undefined {
    return this.data.cards.find((c) => c.id === id);
  }

  private flush() {
    this.writeLocal();
    this.onSave?.();
  }

  private writeLocal() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }
}
