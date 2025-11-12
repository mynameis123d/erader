import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { createPersistStorage } from "./store-utils";
import type {
  ActivityHistoryEntry,
  ReadingLocation,
  ReadingSession,
  Highlight,
  Bookmark,
  ThemeSettings,
} from "../types";
import { useLibraryStore } from "./library-store";

const reviveHighlight = (highlight: Highlight): Highlight => ({
  ...highlight,
  createdDate: new Date(highlight.createdDate),
  updatedDate: highlight.updatedDate
    ? new Date(highlight.updatedDate)
    : undefined,
});

const reviveBookmark = (bookmark: Bookmark): Bookmark => ({
  ...bookmark,
  createdDate: new Date(bookmark.createdDate),
});

const reviveSession = (session: ReadingSession): ReadingSession => ({
  ...session,
  startTime: new Date(session.startTime),
  endTime: session.endTime ? new Date(session.endTime) : undefined,
});

const reviveActivity = (
  entry: ActivityHistoryEntry
): ActivityHistoryEntry => ({
  ...entry,
  timestamp: new Date(entry.timestamp),
});

export interface ReaderState {
  currentBookId: string | null;
  currentLocation: ReadingLocation | null;
  progressPercentage: number;
  activeTheme: ThemeSettings;
  currentSelection: string | null;
  currentSession: ReadingSession | null;
  highlights: Highlight[];
  bookmarks: Bookmark[];
  sessionHistory: ReadingSession[];
  history: ActivityHistoryEntry[];
  isReading: boolean;
}

export interface ReaderActions {
  openBook: (bookId: string) => void;
  closeBook: () => void;
  updateLocation: (location: ReadingLocation) => void;
  updateProgress: (percentage: number) => void;
  setTheme: (theme: Partial<ThemeSettings>) => void;
  setSelection: (text: string | null) => void;
  startSession: (bookId: string, location: ReadingLocation) => void;
  endSession: (endLocation: ReadingLocation) => void;
  addHighlight: (
    bookId: string,
    text: string,
    location: ReadingLocation,
    color?: string,
    note?: string
  ) => string;
  updateHighlight: (
    highlightId: string,
    updates: Partial<Pick<Highlight, "color" | "note">>
  ) => void;
  removeHighlight: (highlightId: string) => void;
  addBookmark: (bookId: string, location: ReadingLocation, label?: string) => string;
  removeBookmark: (bookmarkId: string) => void;
  clearReaderState: () => void;
}

export type ReaderStore = ReaderState & ReaderActions;

const defaultTheme: ThemeSettings = {
  mode: "light",
  backgroundColor: "#ffffff",
  textColor: "#000000",
  fontSize: 16,
  fontFamily: "Georgia, serif",
  lineHeight: 1.6,
  textAlign: "left",
  marginHorizontal: 20,
  marginVertical: 20,
};

const initialState: ReaderState = {
  currentBookId: null,
  currentLocation: null,
  progressPercentage: 0,
  activeTheme: defaultTheme,
  currentSelection: null,
  currentSession: null,
  highlights: [],
  bookmarks: [],
  sessionHistory: [],
  history: [],
  isReading: false,
};

type ReaderPersistedState = Pick<
  ReaderStore,
  | "currentBookId"
  | "currentLocation"
  | "progressPercentage"
  | "activeTheme"
  | "highlights"
  | "bookmarks"
  | "sessionHistory"
  | "history"
>;

export const useReaderStore = create<ReaderStore>()(
  devtools(
    persist<ReaderStore, [], [], ReaderPersistedState>(
      (set, get) => ({
        ...initialState,

        openBook: (bookId: string) => {
          const now = new Date();
          const location = get().currentLocation || { position: 0 };

          const activityEntry: ActivityHistoryEntry = {
            id: crypto.randomUUID(),
            bookId,
            type: "opened",
            timestamp: now,
          };

          set((state) => ({
            currentBookId: bookId,
            isReading: true,
            history: [...state.history, activityEntry],
          }));

          get().startSession(bookId, location);

          const libraryStore = useLibraryStore.getState();
          libraryStore.logActivity(activityEntry);
          libraryStore.updateLastOpened(bookId);
        },

        closeBook: () => {
          const { currentSession, currentLocation } = get();

          if (currentSession) {
            const fallbackLocation =
              currentLocation ||
              currentSession.endLocation ||
              currentSession.startLocation;

            if (fallbackLocation) {
              get().endSession(fallbackLocation);
            }
          }

          set({
            currentBookId: null,
            isReading: false,
            currentSelection: null,
          });
        },

        updateLocation: (location: ReadingLocation) => {
          set({ currentLocation: location });

          const { currentSession } = get();
          if (currentSession) {
            set((state) => ({
              currentSession: state.currentSession
                ? {
                    ...state.currentSession,
                    endLocation: location,
                  }
                : null,
            }));
          }
        },

        updateProgress: (percentage: number) => {
          const bookId = get().currentBookId;
          const previousProgress = get().progressPercentage;
          const nextProgress = Math.max(0, Math.min(100, percentage));

          if (nextProgress === previousProgress) {
            return;
          }

          const activityEntry = bookId
            ? {
                id: crypto.randomUUID(),
                bookId,
                type: "progress" as const,
                timestamp: new Date(),
                details: {
                  progress: nextProgress,
                },
              }
            : null;

          set((state) => ({
            progressPercentage: nextProgress,
            history: activityEntry
              ? [...state.history, activityEntry]
              : state.history,
            currentSession: state.currentSession
              ? {
                  ...state.currentSession,
                  progressPercentage: nextProgress,
                }
              : null,
          }));

          if (activityEntry) {
            useLibraryStore.getState().logActivity(activityEntry);
          }
        },

        setTheme: (theme: Partial<ThemeSettings>) => {
          set((state) => ({
            activeTheme: { ...state.activeTheme, ...theme },
          }));
        },

        setSelection: (text: string | null) => {
          set({ currentSelection: text });
        },

        startSession: (bookId: string, location: ReadingLocation) => {
          const session: ReadingSession = {
            id: crypto.randomUUID(),
            bookId,
            startTime: new Date(),
            startLocation: location,
            progressPercentage: get().progressPercentage,
          };

          set({ currentSession: session });
        },

        endSession: (endLocation: ReadingLocation) => {
          const { currentSession, progressPercentage, currentBookId } = get();

          if (!currentSession) {
            return;
          }

          const completedAt = new Date();
          const completedSession: ReadingSession = {
            ...currentSession,
            endTime: completedAt,
            endLocation,
            progressPercentage,
          };

          const activityEntry: ActivityHistoryEntry | null = currentBookId
            ? {
                id: crypto.randomUUID(),
                bookId: currentBookId,
                type:
                  progressPercentage >= 100
                    ? ("completed" as const)
                    : ("progress" as const),
                timestamp: completedAt,
                details: {
                  sessionId: completedSession.id,
                  progress: progressPercentage,
                },
              }
            : null;

          set((state) => ({
            currentSession: null,
            sessionHistory: [...state.sessionHistory, completedSession],
            history: activityEntry
              ? [...state.history, activityEntry]
              : state.history,
          }));

          if (activityEntry) {
            useLibraryStore.getState().logActivity(activityEntry);
          }
        },

        addHighlight: (
          bookId: string,
          text: string,
          location: ReadingLocation,
          color?: string,
          note?: string
        ) => {
          const now = new Date();

          const highlight: Highlight = {
            id: crypto.randomUUID(),
            bookId,
            text,
            location,
            color: color || "#ffeb3b",
            note,
            createdDate: now,
          };

          const activityEntry: ActivityHistoryEntry = {
            id: crypto.randomUUID(),
            bookId,
            type: "highlight",
            timestamp: now,
            details: {
              text: text.substring(0, 100),
              highlightId: highlight.id,
            },
          };

          set((state) => ({
            highlights: [...state.highlights, highlight],
            history: [...state.history, activityEntry],
          }));

          useLibraryStore.getState().logActivity(activityEntry);

          return highlight.id;
        },

        updateHighlight: (
          highlightId: string,
          updates: Partial<Pick<Highlight, "color" | "note">>
        ) => {
          set((state) => ({
            highlights: state.highlights.map((h) =>
              h.id === highlightId
                ? { ...h, ...updates, updatedDate: new Date() }
                : h
            ),
          }));
        },

        removeHighlight: (highlightId: string) => {
          set((state) => ({
            highlights: state.highlights.filter((h) => h.id !== highlightId),
          }));
        },

        addBookmark: (
          bookId: string,
          location: ReadingLocation,
          label?: string
        ) => {
          const now = new Date();

          const bookmark: Bookmark = {
            id: crypto.randomUUID(),
            bookId,
            location,
            label,
            createdDate: now,
          };

          const activityEntry: ActivityHistoryEntry = {
            id: crypto.randomUUID(),
            bookId,
            type: "bookmark",
            timestamp: now,
            details: {
              bookmarkId: bookmark.id,
              label,
            },
          };

          set((state) => ({
            bookmarks: [...state.bookmarks, bookmark],
            history: [...state.history, activityEntry],
          }));

          useLibraryStore.getState().logActivity(activityEntry);

          return bookmark.id;
        },

        removeBookmark: (bookmarkId: string) => {
          set((state) => ({
            bookmarks: state.bookmarks.filter((b) => b.id !== bookmarkId),
          }));
        },

        clearReaderState: () => {
          set(initialState);
        },
      }),
      {
        name: "reader-storage",
        storage: createPersistStorage<ReaderPersistedState>(),
        partialize: (state) => ({
          activeTheme: state.activeTheme,
          highlights: state.highlights,
          bookmarks: state.bookmarks,
          currentBookId: state.currentBookId,
          currentLocation: state.currentLocation,
          progressPercentage: state.progressPercentage,
          sessionHistory: state.sessionHistory,
          history: state.history,
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            if (state.highlights)
              state.highlights = state.highlights.map(reviveHighlight);
            if (state.bookmarks)
              state.bookmarks = state.bookmarks.map(reviveBookmark);
            if (state.sessionHistory)
              state.sessionHistory = state.sessionHistory.map(reviveSession);
            if (state.history)
              state.history = state.history.map(reviveActivity);
          }
        },
      }
    ),
    { name: "ReaderStore" }
  )
);
