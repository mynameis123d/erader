import { useReaderStore } from "../state/reader-store";

export const useReader = () => useReaderStore();

export const useCurrentBook = () =>
  useReaderStore((state) => state.currentBookId);

export const useCurrentLocation = () =>
  useReaderStore((state) => state.currentLocation);

export const useReadingProgress = () =>
  useReaderStore((state) => state.progressPercentage);

export const useReaderTheme = () =>
  useReaderStore((state) => state.activeTheme);

export const useReaderSession = () =>
  useReaderStore((state) => state.currentSession);

export const useReaderSelection = () =>
  useReaderStore((state) => state.currentSelection);

export const useIsReading = () => useReaderStore((state) => state.isReading);

export const useBookHighlights = (bookId: string | undefined) =>
  useReaderStore((state) =>
    bookId
      ? state.highlights.filter((h) => h.bookId === bookId)
      : []
  );

export const useBookBookmarks = (bookId: string | undefined) =>
  useReaderStore((state) =>
    bookId
      ? state.bookmarks.filter((b) => b.bookId === bookId)
      : []
  );

export const useReaderActions = () =>
  useReaderStore((state) => ({
    openBook: state.openBook,
    closeBook: state.closeBook,
    updateLocation: state.updateLocation,
    updateProgress: state.updateProgress,
    setTheme: state.setTheme,
    setSelection: state.setSelection,
    startSession: state.startSession,
    endSession: state.endSession,
    addHighlight: state.addHighlight,
    updateHighlight: state.updateHighlight,
    removeHighlight: state.removeHighlight,
    addBookmark: state.addBookmark,
    removeBookmark: state.removeBookmark,
    clearReaderState: state.clearReaderState,
  }));
