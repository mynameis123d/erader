import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSearchStore } from "../src/state/search-store";
import { useLibraryStore } from "../src/state/library-store";
import { searchService } from "../src/services/search-service";
import type { BookFile, BookMetadata } from "../src/types";

describe("SearchStore", () => {
  beforeEach(() => {
    useSearchStore.getState().clearResults();
    useLibraryStore.getState().clearLibrary();
    searchService.clearCache();
  });

  it("should initialize with empty state", () => {
    const state = useSearchStore.getState();
    expect(state.currentQuery).toBeNull();
    expect(state.results).toEqual([]);
    expect(state.isSearching).toBe(false);
    expect(state.error).toBeNull();
  });

  describe("searchLibraryMetadata", () => {
    beforeEach(async () => {
      const store = useLibraryStore.getState();

      const mockFile: BookFile = {
        id: "file-1",
        fileName: "test-book.epub",
        fileType: "application/epub+zip",
        fileSize: 1024,
        blob: new Blob(["test content"]),
        addedDate: new Date(),
      };

      const mockMetadata: BookMetadata = {
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        tags: ["classic", "fiction"],
        description: "A novel about wealth",
      };

      await store.addBook(mockFile, mockMetadata);
    });

    it("should search library metadata", async () => {
      const store = useSearchStore.getState();

      await store.searchLibraryMetadata("Gatsby");

      await new Promise((r) => setTimeout(r, 10));

      const state = useSearchStore.getState();
      expect(state.currentQuery?.text).toBe("Gatsby");
      expect(state.currentQuery?.scope).toBe("library");
      expect(state.results.length).toBeGreaterThan(0);
      expect(state.results[0].type).toBe("book");
    });
  });

  describe("indexBook", () => {
    it("should index book content", async () => {
      const store = useSearchStore.getState();
      const content = "Test content for indexing. ".repeat(50);

      await store.indexBook("book-1", content, "epub");

      await new Promise((r) => setTimeout(r, 10));

      const cached = searchService.getCachedSnippets("book-1");
      expect(cached).toBeDefined();
      expect(cached?.length).toBeGreaterThan(0);
    });

    it("should update indexing progress", async () => {
      const store = useSearchStore.getState();
      const content = "Test content. ".repeat(100);

      const indexPromise = store.indexBook("book-2", content, "epub");

      await new Promise((resolve) => setTimeout(resolve, 150));

      let state = useSearchStore.getState();
      expect(state.indexingProgress.has("book-2")).toBe(true);

      await indexPromise;

      await new Promise((resolve) => setTimeout(resolve, 1000));

      state = useSearchStore.getState();
      expect(state.indexingProgress.has("book-2")).toBe(false);
    });
  });

  describe("searchBookContent", () => {
    beforeEach(async () => {
      const content = "The quick brown fox jumps over the lazy dog. ".repeat(
        20
      );
      await searchService.indexBookContent("book-search", content, "epub");
    });

    it("should search book content", async () => {
      const store = useSearchStore.getState();

      await store.searchBookContent("book-search", "quick");

      await new Promise((r) => setTimeout(r, 10));

      const state = useSearchStore.getState();
      expect(state.currentQuery?.bookId).toBe("book-search");
      expect(state.results.length).toBeGreaterThan(0);
    });

    it("should set isSearching flag", async () => {
      const store = useSearchStore.getState();

      const promise = store.searchBookContent("book-search", "fox");

      let state = useSearchStore.getState();
      expect(state.isSearching).toBe(true);

      await promise;

      await new Promise((r) => setTimeout(r, 10));

      state = useSearchStore.getState();
      expect(state.isSearching).toBe(false);
    });
  });

  describe("search", () => {
    beforeEach(async () => {
      useLibraryStore.getState().clearLibrary();
      const libraryStore = useLibraryStore.getState();

      const mockFile: BookFile = {
        id: "file-1",
        fileName: "gatsby.epub",
        fileType: "application/epub+zip",
        fileSize: 1024,
        blob: new Blob(["The Great Gatsby content"]),
        addedDate: new Date(),
      };

      const mockMetadata: BookMetadata = {
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
      };

      await libraryStore.addBook(mockFile, mockMetadata);

      await new Promise((r) => setTimeout(r, 10));

      let bookId: string | undefined;
      const books = useLibraryStore.getState().books;
      if (books && books.length > 0) {
        bookId = books[0].id;
      }

      if (bookId) {
        await searchService.indexBookContent(
          bookId,
          "Great content with searchable terms. ".repeat(20),
          "epub"
        );
      }
    });

    it("should search library scope", async () => {
      const store = useSearchStore.getState();

      await store.search("Great", "library");

      await new Promise((r) => setTimeout(r, 10));

      const state = useSearchStore.getState();
      expect(state.results.length).toBeGreaterThan(0);
    });

    it("should clear results", async () => {
      const store = useSearchStore.getState();

      await store.search("test", "library");

      store.clearResults();

      await new Promise((r) => setTimeout(r, 10));

      const state = useSearchStore.getState();
      expect(state.results).toEqual([]);
      expect(state.currentQuery).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should set and clear errors", () => {
      const store = useSearchStore.getState();

      store.setError("Test error");

      let state = useSearchStore.getState();
      expect(state.error).toBe("Test error");

      store.setError(null);

      state = useSearchStore.getState();
      expect(state.error).toBeNull();
    });
  });
});
