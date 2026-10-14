import fs from "node:fs";
import path from "node:path";
import type { BlitzCard, ProductProfile, PublishingSettings, ViralReference } from "../shared/types.js";

export interface DbShape {
  profile: ProductProfile | null;
  cards: BlitzCard[];
  /** User-imported references; merged with the built-in library. */
  references: ViralReference[];
  publishing: PublishingSettings;
}

const empty = (): DbShape => ({
  profile: null,
  cards: [],
  references: [],
  publishing: { autoPublish: false, channelIds: [], mode: "addToQueue", slideshowsAsVideo: false },
});

/** Tiny JSON-file store. Good enough for a single-user tool; swap for SQLite/Postgres later. */
export class Db {
  private data: DbShape;

  constructor(private file: string) {
    this.data = empty();
    if (fs.existsSync(file)) {
      try {
        this.data = { ...empty(), ...JSON.parse(fs.readFileSync(file, "utf8")) };
      } catch {
        fs.renameSync(file, `${file}.corrupt-${Date.now()}`);
      }
    }
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
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }
}
