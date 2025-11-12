import { describe, it, expect, beforeEach } from "vitest";
import { useReaderStore } from "../src/state/reader-store";
import type { ReadingLocation } from "../src/types";

describe("ReaderStore", () => {
  beforeEach(() => {
    useReaderStore.getState().clearReaderState();
  });

  it("should initialize with default state", () => {
    const state = useReaderStore.getState();
    expect(state.currentBookId).toBeNull();
    expect(state.currentLocation).toBeNull();
    expect(state.progressPercentage).toBe(0);
    expect(state.isReading).toBe(false);
    expect(state.highlights).toEqual([]);
    expect(state.bookmarks).toEqual([]);
  });

  it("should open a book", () => {
    const store = useReaderStore.getState();
    const bookId = "book-1";

    store.openBook(bookId);

    const state = useReaderStore.getState();
    expect(state.currentBookId).toBe(bookId);
    expect(state.isReading).toBe(true);
    expect(state.currentSession).toBeTruthy();
    expect(state.currentSession?.bookId).toBe(bookId);
  });

  it("should close a book and end session", () => {
    const store = useReaderStore.getState();
    const bookId = "book-1";

    store.openBook(bookId);
    store.updateLocation({ position: 100 });
    store.closeBook();

    const state = useReaderStore.getState();
    expect(state.currentBookId).toBeNull();
    expect(state.isReading).toBe(false);
    expect(state.sessionHistory).toHaveLength(1);
  });

  it("should update location", () => {
    const store = useReaderStore.getState();
    const location: ReadingLocation = {
      cfi: "epubcfi(/6/4!/4/2/2)",
      position: 100,
      chapter: "Chapter 1",
    };

    store.updateLocation(location);

    const state = useReaderStore.getState();
    expect(state.currentLocation).toEqual(location);
  });

  it("should update progress", () => {
    const store = useReaderStore.getState();
    const bookId = "book-1";

    store.openBook(bookId);
    store.updateProgress(50);

    const state = useReaderStore.getState();
    expect(state.progressPercentage).toBe(50);
    expect(state.currentSession?.progressPercentage).toBe(50);
  });

  it("should clamp progress between 0 and 100", () => {
    const store = useReaderStore.getState();

    store.updateProgress(-10);
    expect(useReaderStore.getState().progressPercentage).toBe(0);

    store.updateProgress(150);
    expect(useReaderStore.getState().progressPercentage).toBe(100);
  });

  it("should add and remove highlights", () => {
    const store = useReaderStore.getState();
    const bookId = "book-1";
    const text = "Important quote";
    const location: ReadingLocation = { position: 100 };

    const highlightId = store.addHighlight(bookId, text, location, "#ffeb3b");

    let state = useReaderStore.getState();
    expect(state.highlights).toHaveLength(1);
    expect(state.highlights[0].text).toBe(text);
    expect(state.highlights[0].color).toBe("#ffeb3b");

    store.removeHighlight(highlightId);

    state = useReaderStore.getState();
    expect(state.highlights).toHaveLength(0);
  });

  it("should update highlight", () => {
    const store = useReaderStore.getState();
    const bookId = "book-1";
    const text = "Important quote";
    const location: ReadingLocation = { position: 100 };

    const highlightId = store.addHighlight(bookId, text, location);

    store.updateHighlight(highlightId, {
      color: "#ff0000",
      note: "This is important",
    });

    const state = useReaderStore.getState();
    expect(state.highlights[0].color).toBe("#ff0000");
    expect(state.highlights[0].note).toBe("This is important");
  });

  it("should add and remove bookmarks", () => {
    const store = useReaderStore.getState();
    const bookId = "book-1";
    const location: ReadingLocation = { position: 100, chapter: "Chapter 2" };

    const bookmarkId = store.addBookmark(bookId, location, "My bookmark");

    let state = useReaderStore.getState();
    expect(state.bookmarks).toHaveLength(1);
    expect(state.bookmarks[0].label).toBe("My bookmark");

    store.removeBookmark(bookmarkId);

    state = useReaderStore.getState();
    expect(state.bookmarks).toHaveLength(0);
  });

  it("should update theme settings", () => {
    const store = useReaderStore.getState();

    store.setTheme({
      mode: "dark",
      backgroundColor: "#000000",
      textColor: "#ffffff",
    });

    const state = useReaderStore.getState();
    expect(state.activeTheme.mode).toBe("dark");
    expect(state.activeTheme.backgroundColor).toBe("#000000");
    expect(state.activeTheme.textColor).toBe("#ffffff");
  });

  it("should track selection", () => {
    const store = useReaderStore.getState();
    const selectedText = "Selected text";

    store.setSelection(selectedText);
    expect(useReaderStore.getState().currentSelection).toBe(selectedText);

    store.setSelection(null);
    expect(useReaderStore.getState().currentSelection).toBeNull();
  });
});
