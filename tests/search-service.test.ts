import { describe, it, expect, beforeEach } from "vitest";
import { searchService } from "../src/services/search-service";
import type { Book, BookMetadata } from "../src/types";

describe("SearchService", () => {
  beforeEach(() => {
    searchService.clearCache();
  });

  describe("indexBookContent", () => {
    it("should index book content into snippets", async () => {
      const content =
        "Lorem ipsum dolor sit amet. " +
        "Consectetur adipiscing elit. ".repeat(20);
      const bookId = "book-1";

      const snippets = await searchService.indexBookContent(
        bookId,
        content,
        "epub"
      );

      expect(snippets.length).toBeGreaterThan(0);
      expect(snippets[0].bookId).toBe(bookId);
      expect(snippets[0].content.length).toBeGreaterThan(0);
      expect(snippets[0].location).toBeDefined();
    });

    it("should handle PDF format", async () => {
      const content = "Page 1 content. ".repeat(100);
      const bookId = "book-pdf";

      const snippets = await searchService.indexBookContent(
        bookId,
        content,
        "pdf"
      );

      expect(snippets.length).toBeGreaterThan(0);
      expect(snippets[0].location.chapter).toContain("Page");
    });

    it("should cache indexed snippets", async () => {
      const content = "Test content. ".repeat(50);
      const bookId = "book-cache";

      const snippets1 = await searchService.indexBookContent(
        bookId,
        content,
        "epub"
      );
      const cached = searchService.getCachedSnippets(bookId);

      expect(cached).toEqual(snippets1);
    });
  });

  describe("searchMetadata", () => {
    const mockBooks: Book[] = [
      {
        id: "1",
        fileId: "file-1",
        metadata: {
          title: "The Great Gatsby",
          author: "F. Scott Fitzgerald",
          tags: ["classic", "fiction"],
          description: "A novel about wealth and love",
        } as BookMetadata,
        isFavorite: false,
        dateAdded: new Date(),
      },
      {
        id: "2",
        fileId: "file-2",
        metadata: {
          title: "To Kill a Mockingbird",
          author: "Harper Lee",
          tags: ["classic", "drama"],
          description: "A story about justice and growing up",
        } as BookMetadata,
        isFavorite: false,
        dateAdded: new Date(),
      },
      {
        id: "3",
        fileId: "file-3",
        metadata: {
          title: "1984",
          author: "George Orwell",
          tags: ["dystopian", "fiction"],
          description: "A totalitarian state novel",
        } as BookMetadata,
        isFavorite: false,
        dateAdded: new Date(),
      },
    ];

    it("should find books by title", () => {
      const results = searchService.searchMetadata("Gatsby", mockBooks);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain("Gatsby");
      expect(results[0].type).toBe("book");
    });

    it("should find books by author", () => {
      const results = searchService.searchMetadata("Fitzgerald", mockBooks);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].author).toContain("Fitzgerald");
    });

    it("should find books by tags", () => {
      const results = searchService.searchMetadata("classic", mockBooks);

      expect(results.length).toBe(2);
      expect(results.map((r) => r.title)).toContain("The Great Gatsby");
      expect(results.map((r) => r.title)).toContain("To Kill a Mockingbird");
    });

    it("should rank results by relevance", () => {
      const results = searchService.searchMetadata("fiction", mockBooks);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].relevanceScore).toBeGreaterThanOrEqual(
        results[results.length - 1].relevanceScore
      );
    });

    it("should be case-insensitive", () => {
      const results1 = searchService.searchMetadata("gatsby", mockBooks);
      const results2 = searchService.searchMetadata("GATSBY", mockBooks);

      expect(results1.length).toBe(results2.length);
      expect(results1[0].title).toBe(results2[0].title);
    });

    it("should cache results", () => {
      const results1 = searchService.searchMetadata("classic", mockBooks);
      const results2 = searchService.searchMetadata("classic", mockBooks);

      expect(results1).toEqual(results2);
    });
  });

  describe("searchBookContent", () => {
    beforeEach(async () => {
      const content =
        "The quick brown fox jumps over the lazy dog. " +
        "This is a test document with searchable content. ".repeat(5);
      await searchService.indexBookContent("book-search", content, "epub");
    });

    it("should find content matches", async () => {
      const results = await searchService.searchBookContent(
        "book-search",
        "quick brown"
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].type).toBe("content");
    });

    it("should return snippets with context", async () => {
      const results = await searchService.searchBookContent(
        "book-search",
        "test"
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].snippet).toBeDefined();
      expect(results[0].location).toBeDefined();
    });

    it("should handle no matches", async () => {
      const results = await searchService.searchBookContent(
        "book-search",
        "nonexistent"
      );

      expect(results.length).toBe(0);
    });

    it("should limit results", async () => {
      const results = await searchService.searchBookContent(
        "book-search",
        "the",
        10
      );

      expect(results.length).toBeLessThanOrEqual(10);
    });

    it("should be case-insensitive", async () => {
      const results1 = await searchService.searchBookContent(
        "book-search",
        "quick"
      );
      const results2 = await searchService.searchBookContent(
        "book-search",
        "QUICK"
      );

      expect(results1.length).toBe(results2.length);
    });
  });

  describe("clearCache", () => {
    it("should clear cache for specific book", async () => {
      const content = "Test content. ".repeat(50);
      await searchService.indexBookContent("book-1", content, "epub");
      await searchService.indexBookContent("book-2", content, "epub");

      searchService.clearCache("book-1");

      expect(searchService.getCachedSnippets("book-1")).toBeUndefined();
      expect(searchService.getCachedSnippets("book-2")).toBeDefined();
    });

    it("should clear all caches", async () => {
      const content = "Test content. ".repeat(50);
      await searchService.indexBookContent("book-1", content, "epub");
      await searchService.indexBookContent("book-2", content, "epub");

      searchService.clearCache();

      expect(searchService.getCachedSnippets("book-1")).toBeUndefined();
      expect(searchService.getCachedSnippets("book-2")).toBeUndefined();
    });
  });

  describe("highlightMatches", () => {
    it("should wrap matches in mark tags", () => {
      const text = "The quick brown fox";
      const result = searchService.highlightMatches(text, "quick");

      expect(result).toContain("<mark");
      expect(result).toContain("quick");
      expect(result).toContain("</mark>");
    });

    it("should be case-insensitive", () => {
      const text = "The Quick Brown Fox";
      const result = searchService.highlightMatches(text, "quick");

      expect(result).toContain("<mark");
      expect(result).toContain("</mark>");
    });

    it("should use custom class", () => {
      const text = "The quick brown fox";
      const result = searchService.highlightMatches(
        text,
        "quick",
        "highlight"
      );

      expect(result).toContain('class="highlight"');
    });
  });
});
