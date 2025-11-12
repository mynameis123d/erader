import { describe, it, expect, beforeEach } from "vitest";
import { useLibraryStore } from "../src/state/library-store";
import { useSearchStore } from "../src/state/search-store";
import { searchService } from "../src/services/search-service";
import type { BookFile, BookMetadata } from "../src/types";

describe("Search Integration", () => {
  beforeEach(() => {
    useLibraryStore.getState().clearLibrary();
    useSearchStore.getState().clearResults();
    searchService.clearCache();
  });

  it("should search library and find books by metadata", async () => {
    const libraryStore = useLibraryStore.getState();

    const mockFile: BookFile = {
      id: "file-1",
      fileName: "book1.epub",
      fileType: "application/epub+zip",
      fileSize: 1024,
      blob: new Blob(["content"]),
      addedDate: new Date(),
    };

    const mockMetadata: BookMetadata = {
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      tags: ["classic", "fiction"],
    };

    await libraryStore.addBook(mockFile, mockMetadata);

    await new Promise((r) => setTimeout(r, 50));

    const searchStore = useSearchStore.getState();
    await searchStore.searchLibraryMetadata("Gatsby");

    await new Promise((r) => setTimeout(r, 50));

    const state = useSearchStore.getState();
    expect(state.results.length).toBeGreaterThan(0);
    expect(state.results[0].title).toContain("Gatsby");
  });

  it("should handle PDF format indexing", async () => {
    const searchStore = useSearchStore.getState();
    const bookId = "pdf-book";
    const content = "Page 1 content. Page 2 content. ".repeat(50);

    await searchStore.indexBook(bookId, content, "pdf");

    await new Promise((r) => setTimeout(r, 50));

    await searchStore.searchBookContent(bookId, "Page");

    const state = useSearchStore.getState();
    expect(state.results.length).toBeGreaterThan(0);
  });
});
