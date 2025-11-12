import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReaderStore } from "../src/state/reader-store";
import type { ReadingLocation } from "../src/types";

describe("Reader Annotations", () => {
  beforeEach(() => {
    // Reset the store before each test
    const { clearReaderState } = useReaderStore.getState();
    clearReaderState();
  });

  describe("Highlights", () => {
    it("should add a highlight", () => {
      const { result } = renderHook(() => useReaderStore());

      const bookId = "test-book-1";
      const text = "This is a test highlight";
      const location: ReadingLocation = { cfi: "epubcfi(/6/4[chapter1]!/4/2/1:100)" };
      const color = "#ffeb3b";
      const note = "Test note";

      act(() => {
        const highlightId = result.current.addHighlight(bookId, text, location, color, note);
        expect(highlightId).toBeDefined();
      });

      expect(result.current.highlights).toHaveLength(1);
      
      const highlight = result.current.highlights[0];
      expect(highlight.bookId).toBe(bookId);
      expect(highlight.text).toBe(text);
      expect(highlight.location).toEqual(location);
      expect(highlight.color).toBe(color);
      expect(highlight.note).toBe(note);
      expect(highlight.createdDate).toBeInstanceOf(Date);
    });

    it("should update a highlight", () => {
      const { result } = renderHook(() => useReaderStore());

      const bookId = "test-book-1";
      const text = "This is a test highlight";
      const location: ReadingLocation = { cfi: "epubcfi(/6/4[chapter1]!/4/2/1:100)" };
      
      act(() => {
        result.current.addHighlight(bookId, text, location);
      });

      const highlightId = result.current.highlights[0].id;

      act(() => {
        result.current.updateHighlight(highlightId, {
          color: "#4caf50",
          note: "Updated note",
        });
      });

      const highlight = result.current.highlights.find(h => h.id === highlightId);
      expect(highlight?.color).toBe("#4caf50");
      expect(highlight?.note).toBe("Updated note");
      expect(highlight?.updatedDate).toBeInstanceOf(Date);
    });

    it("should remove a highlight", () => {
      const { result } = renderHook(() => useReaderStore());

      const bookId = "test-book-1";
      const text = "This is a test highlight";
      const location: ReadingLocation = { cfi: "epubcfi(/6/4[chapter1]!/4/2/1:100)" };
      
      act(() => {
        result.current.addHighlight(bookId, text, location);
      });

      expect(result.current.highlights).toHaveLength(1);

      const highlightId = result.current.highlights[0].id;

      act(() => {
        result.current.removeHighlight(highlightId);
      });

      expect(result.current.highlights).toHaveLength(0);
    });
  });

  describe("Bookmarks", () => {
    it("should add a bookmark", () => {
      const { result } = renderHook(() => useReaderStore());

      const bookId = "test-book-1";
      const location: ReadingLocation = { page: 25 };
      const label = "Important page";

      act(() => {
        const bookmarkId = result.current.addBookmark(bookId, location, label);
        expect(bookmarkId).toBeDefined();
      });

      expect(result.current.bookmarks).toHaveLength(1);
      
      const bookmark = result.current.bookmarks[0];
      expect(bookmark.bookId).toBe(bookId);
      expect(bookmark.location).toEqual(location);
      expect(bookmark.label).toBe(label);
      expect(bookmark.createdDate).toBeInstanceOf(Date);
    });

    it("should add a bookmark without label", () => {
      const { result } = renderHook(() => useReaderStore());

      const bookId = "test-book-1";
      const location: ReadingLocation = { position: 50.5 };

      act(() => {
        result.current.addBookmark(bookId, location);
      });

      expect(result.current.bookmarks).toHaveLength(1);
      
      const bookmark = result.current.bookmarks[0];
      expect(bookmark.label).toBeUndefined();
    });

    it("should remove a bookmark", () => {
      const { result } = renderHook(() => useReaderStore());

      const bookId = "test-book-1";
      const location: ReadingLocation = { page: 25 };
      
      act(() => {
        result.current.addBookmark(bookId, location);
      });

      expect(result.current.bookmarks).toHaveLength(1);

      const bookmarkId = result.current.bookmarks[0].id;

      act(() => {
        result.current.removeBookmark(bookmarkId);
      });

      expect(result.current.bookmarks).toHaveLength(0);
    });
  });

  describe("Serialization", () => {
    it("should serialize and deserialize highlights correctly", () => {
      const { result } = renderHook(() => useReaderStore());

      const bookId = "test-book-1";
      const text = "Test highlight for serialization";
      const location: ReadingLocation = { 
        cfi: "epubcfi(/6/4[chapter1]!/4/2/1:100)",
        chapter: "Chapter 1",
        page: 15,
        position: 25.5
      };
      const color = "#e91e63";
      const note = "Complex note with special characters: !@#$%^&*()";

      act(() => {
        result.current.addHighlight(bookId, text, location, color, note);
      });

      // Simulate the serialization/deserialization process
      const serialized = JSON.stringify(result.current.highlights[0]);
      const deserialized = JSON.parse(serialized);

      // Revive dates
      deserialized.createdDate = new Date(deserialized.createdDate);
      if (deserialized.updatedDate) {
        deserialized.updatedDate = new Date(deserialized.updatedDate);
      }

      expect(deserialized.bookId).toBe(bookId);
      expect(deserialized.text).toBe(text);
      expect(deserialized.location).toEqual(location);
      expect(deserialized.color).toBe(color);
      expect(deserialized.note).toBe(note);
      expect(deserialized.createdDate).toBeInstanceOf(Date);
    });

    it("should serialize and deserialize bookmarks correctly", () => {
      const { result } = renderHook(() => useReaderStore());

      const bookId = "test-book-1";
      const location: ReadingLocation = { 
        cfi: "epubcfi(/6/4[chapter2]!/4/2/1:200)",
        chapter: "Chapter 2",
        page: 30,
        position: 60.0
      };
      const label = "Bookmark with special chars: éñ 国际";

      act(() => {
        result.current.addBookmark(bookId, location, label);
      });

      // Simulate the serialization/deserialization process
      const serialized = JSON.stringify(result.current.bookmarks[0]);
      const deserialized = JSON.parse(serialized);

      // Revive date
      deserialized.createdDate = new Date(deserialized.createdDate);

      expect(deserialized.bookId).toBe(bookId);
      expect(deserialized.location).toEqual(location);
      expect(deserialized.label).toBe(label);
      expect(deserialized.createdDate).toBeInstanceOf(Date);
    });
  });
});