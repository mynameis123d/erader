import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FileIngestionService } from "../src/services/file-ingestion-service";
import { useLibraryStore } from "../src/state/library-store";
import {
  indexedStorageService,
  IndexedStorageService,
} from "../src/services/indexed-storage-service";

const COVER_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=";

vi.mock("epubjs", () => {
  const epubMock = vi.fn(() => ({
    loaded: {
      metadata: Promise.resolve({
        title: "Mock EPUB",
        creator: "Mock Author",
        language: "en",
        subject: ["fiction", "epub"],
      }),
      navigation: Promise.resolve({
        toc: [
          {
            id: "chap1",
            label: "Chapter 1",
            href: "chap1.xhtml",
            subitems: [],
          },
        ],
      }),
    },
    spine: {
      items: [
        {
          id: "item-1",
          href: "chap1.xhtml",
          type: "application/xhtml+xml",
          label: "Chapter 1",
        },
      ],
    },
    coverUrl: vi.fn(async () => COVER_DATA_URL),
  }));

  return { default: epubMock };
});

vi.mock("pdfjs-dist", () => {
  const getDocument = vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 2,
      getMetadata: vi.fn(async () => ({
        info: {
          Title: "Mock PDF",
          Author: "PDF Author",
          Producer: "PDF Producer",
        },
        metadata: {
          getAll: () => [
            ["dc:title", "Mock PDF"],
            ["dc:creator", "PDF Author"],
          ],
        },
      })),
      getPage: vi.fn(async (pageNumber: number) => ({
        getViewport: () => ({ width: 200, height: 300 }),
        getTextContent: vi.fn(async () => ({ items: [] })),
        render: vi.fn(() => ({ promise: Promise.resolve() })),
      })),
    }),
  }));

  return { getDocument };
});

const clearIndexedStorage = async (storage: IndexedStorageService) => {
  const files = await storage.listFiles();
  await Promise.all(files.map((file) => storage.deleteFile(file.id)));
};

const createFile = (content: BlobPart[], name: string, type: string) =>
  new File(content, name, { type });

describe("FileIngestionService", () => {
  beforeEach(async () => {
    useLibraryStore.getState().clearLibrary();
    useLibraryStore.getState().setError(null);
    await clearIndexedStorage(indexedStorageService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("ingests EPUB files and stores normalized metadata", async () => {
    const service = new FileIngestionService();
    const file = createFile([
      "<epub>content</epub>",
    ], "sample.epub", "application/epub+zip");

    const results = await service.ingestFiles([file]);

    expect(results).toHaveLength(1);
    const [result] = results;
    expect(result.status).toBe("success");
    expect(result.metadata?.title).toBe("Mock EPUB");
    expect(result.manifest?.format).toBe("epub");

    const state = useLibraryStore.getState();
    expect(state.books).toHaveLength(1);
    expect(state.books[0].metadata.title).toBe("Mock EPUB");
    expect(state.books[0].metadata.coverImage).toContain("data:image/png");
    expect(state.books[0].manifest?.spine).toHaveLength(1);

    const storedFiles = await indexedStorageService.listFiles();
    const stored = storedFiles.find((item) => item.fileName === "sample.epub");
    expect(stored?.manifest?.format).toBe("epub");
  });

  it("prevents duplicate uploads when strategy is skip", async () => {
    const service = new FileIngestionService();
    const fileOne = createFile([
      "duplicate content",
    ], "duplicate.epub", "application/epub+zip");
    const fileTwo = createFile([
      "duplicate content",
    ], "duplicate.epub", "application/epub+zip");

    const [first] = await service.ingestFiles([fileOne]);
    expect(first.status).toBe("success");

    const second = await service.ingestFile(fileTwo);
    expect(second.status).toBe("duplicate");
    expect(useLibraryStore.getState().books).toHaveLength(1);
  });

  it("ingests PDF files and creates a manifest", async () => {
    const service = new FileIngestionService();
    const pdfFile = createFile([
      "%PDF-1.4", "mock"
    ], "sample.pdf", "application/pdf");

    const result = await service.ingestFile(pdfFile);

    expect(result.status).toBe("success");
    expect(result.manifest?.format).toBe("pdf");
    expect(result.manifest?.spine?.length).toBeGreaterThan(0);
    expect(result.metadata?.format).toBe("pdf");

    const book = useLibraryStore.getState().books[0];
    const storedFile = await indexedStorageService.getFile(book.fileId);
    expect(storedFile?.manifest?.format).toBe("pdf");
    expect(book.manifest?.textLayers?.length).toBeGreaterThan(0);
  });

  it("returns unsupported status for unknown formats", async () => {
    const service = new FileIngestionService();
    const file = createFile(["binary"], "unknown.xyz", "application/octet-stream");

    const result = await service.ingestFile(file);

    expect(result.status).toBe("unsupported");
    expect(useLibraryStore.getState().error).toBe("Unsupported file format");
  });

  it("respects configured file size limits", async () => {
    const service = new FileIngestionService(
      useLibraryStore,
      indexedStorageService,
      { maxFileSize: 8 }
    );

    const largeContent = new Uint8Array(16).fill(1);
    const oversized = createFile([largeContent], "large.epub", "application/epub+zip");

    const result = await service.ingestFile(oversized);

    expect(result.status).toBe("error");
    expect(result.error).toContain("File exceeds");
    expect(useLibraryStore.getState().books).toHaveLength(0);
  });
});
