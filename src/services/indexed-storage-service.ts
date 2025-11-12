import Dexie, { Table } from "dexie";
import type { BookFile } from "../types";

export interface StoredBookFile extends BookFile {
  updatedDate: Date;
}

class LibraryDatabase extends Dexie {
  public files!: Table<StoredBookFile, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      files: "&id, fileName, fileType",
    });
  }
}

const warnUnsupported = () => {
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.warn(
      "IndexedDB is not available in this environment. Falling back to in-memory storage."
    );
  }
};

export class IndexedStorageService {
  private db?: LibraryDatabase;

  private fallback = new Map<string, StoredBookFile>();

  constructor(private readonly dbName = "ebook-reader-storage") {
    if (typeof indexedDB !== "undefined") {
      this.db = new LibraryDatabase(dbName);
      this.db
        .open()
        .catch((error) => {
          warnUnsupported();
          this.db?.close();
          this.db = undefined;
          if (process.env.NODE_ENV !== "test") {
            // eslint-disable-next-line no-console
            console.error("Failed to initialize IndexedDB", error);
          }
        });
    } else {
      warnUnsupported();
    }
  }

  private getStore() {
    return this.db?.files;
  }

  async saveFile(file: BookFile): Promise<void> {
    const record: StoredBookFile = {
      ...file,
      updatedDate: new Date(),
    };

    const store = this.getStore();

    if (store) {
      await store.put(record);
      return;
    }

    this.fallback.set(file.id, record);
  }

  async getFile(fileId: string): Promise<StoredBookFile | undefined> {
    const store = this.getStore();

    if (store) {
      const result = await store.get(fileId);
      if (!result) return undefined;
      return {
        ...result,
        addedDate: new Date(result.addedDate),
        updatedDate: new Date(result.updatedDate),
      };
    }

    const fallbackRecord = this.fallback.get(fileId);
    if (!fallbackRecord) {
      return undefined;
    }

    return {
      ...fallbackRecord,
      addedDate: new Date(fallbackRecord.addedDate),
      updatedDate: new Date(fallbackRecord.updatedDate),
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    const store = this.getStore();

    if (store) {
      await store.delete(fileId);
      return;
    }

    this.fallback.delete(fileId);
  }

  async listFiles(): Promise<StoredBookFile[]> {
    const store = this.getStore();

    if (store) {
      const files = await store.toArray();
      return files.map((file) => ({
        ...file,
        addedDate: new Date(file.addedDate),
        updatedDate: new Date(file.updatedDate),
      }));
    }

    return Array.from(this.fallback.values()).map((file) => ({
      ...file,
      addedDate: new Date(file.addedDate),
      updatedDate: new Date(file.updatedDate),
    }));
  }
}

export const indexedStorageService = new IndexedStorageService();
