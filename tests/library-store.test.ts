import { describe, it, expect, beforeEach } from "vitest";
import { useLibraryStore } from "../src/state/library-store";
import type { BookFile, BookMetadata, ContentManifest } from "../src/types";

const createManifest = (format: ContentManifest["format"] = "epub"): ContentManifest => ({
  format,
  spine: [],
  tableOfContents: [],
});

describe("LibraryStore", () => {
  const createMockFile = (): BookFile => ({
    id: "file-1",
    fileName: "test-book.epub",
    fileType: "application/epub+zip",
    fileSize: 1024,
    blob: new Blob(["test content"]),
    addedDate: new Date(),
    manifest: createManifest(),
  });

  beforeEach(() => {
    useLibraryStore.getState().clearLibrary();
  });

  it("should initialize with empty state", () => {
    const state = useLibraryStore.getState();
    expect(state.books).toEqual([]);
    expect(state.collections).toEqual([]);
    expect(state.activity).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("should add a book", async () => {
    const store = useLibraryStore.getState();

    const mockFile = createMockFile();

    const mockMetadata: BookMetadata = {
      title: "Test Book",
      author: "Test Author",
      tags: ["fiction"],
    };

    await store.addBook(mockFile, mockMetadata, mockFile.manifest);

    const state = useLibraryStore.getState();
    expect(state.books).toHaveLength(1);
    expect(state.books[0].metadata.title).toBe("Test Book");
    expect(state.books[0].metadata.author).toBe("Test Author");
    expect(state.books[0].manifest?.format).toBe("epub");
    expect(state.books[0].fileId).toBe("file-1");
    expect(state.books[0].isFavorite).toBe(false);
  });

  it("should remove a book", async () => {
    const store = useLibraryStore.getState();

    const mockFile = createMockFile();

    const mockMetadata: BookMetadata = {
      title: "Test Book",
      author: "Test Author",
    };

    await store.addBook(mockFile, mockMetadata, mockFile.manifest);
    const bookId = useLibraryStore.getState().books[0].id;

    await store.removeBook(bookId);

    const state = useLibraryStore.getState();
    expect(state.books).toHaveLength(0);
  });

  it("should toggle favorite", async () => {
    const store = useLibraryStore.getState();

    const mockFile = createMockFile();

    const mockMetadata: BookMetadata = {
      title: "Test Book",
    };

    await store.addBook(mockFile, mockMetadata, mockFile.manifest);
    const bookId = useLibraryStore.getState().books[0].id;

    store.toggleFavorite(bookId);
    expect(useLibraryStore.getState().books[0].isFavorite).toBe(true);

    store.toggleFavorite(bookId);
    expect(useLibraryStore.getState().books[0].isFavorite).toBe(false);
  });

  it("should update metadata", async () => {
    const store = useLibraryStore.getState();

    const mockFile = createMockFile();

    const mockMetadata: BookMetadata = {
      title: "Test Book",
    };

    await store.addBook(mockFile, mockMetadata, mockFile.manifest);
    const bookId = useLibraryStore.getState().books[0].id;

    store.updateMetadata(bookId, { author: "New Author", tags: ["test"] });

    const book = useLibraryStore.getState().books[0];
    expect(book.metadata.author).toBe("New Author");
    expect(book.metadata.tags).toEqual(["test"]);
    expect(book.metadata.title).toBe("Test Book");
  });

  it("should create and delete collections", () => {
    const store = useLibraryStore.getState();

    const collectionId = store.createCollection("Fiction", "My fiction books");

    let state = useLibraryStore.getState();
    expect(state.collections).toHaveLength(1);
    expect(state.collections[0].name).toBe("Fiction");
    expect(state.collections[0].description).toBe("My fiction books");

    store.deleteCollection(collectionId);

    state = useLibraryStore.getState();
    expect(state.collections).toHaveLength(0);
  });

  it("should add and remove books from collections", async () => {
    const store = useLibraryStore.getState();

    const mockFile = createMockFile();

    const mockMetadata: BookMetadata = {
      title: "Test Book",
    };

    await store.addBook(mockFile, mockMetadata, mockFile.manifest);
    const bookId = useLibraryStore.getState().books[0].id;

    const collectionId = store.createCollection("Fiction");

    store.addToCollection(bookId, collectionId);

    let state = useLibraryStore.getState();
    expect(state.collections[0].bookIds).toContain(bookId);
    expect(state.books[0].collectionIds).toContain(collectionId);

    store.removeFromCollection(bookId, collectionId);

    state = useLibraryStore.getState();
    expect(state.collections[0].bookIds).not.toContain(bookId);
    expect(state.books[0].collectionIds).not.toContain(collectionId);
  });

  it("should log activity", () => {
    const store = useLibraryStore.getState();

    const activityEntry = {
      id: "activity-1",
      bookId: "book-1",
      type: "opened" as const,
      timestamp: new Date(),
    };

    store.logActivity(activityEntry);

    const state = useLibraryStore.getState();
    expect(state.activity).toHaveLength(1);
    expect(state.activity[0].bookId).toBe("book-1");
    expect(state.activity[0].type).toBe("opened");
  });
});
