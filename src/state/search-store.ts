import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { SearchResult, SearchQuery } from "../types";
import { searchService } from "../services/search-service";
import { useLibraryStore } from "./library-store";

export interface SearchState {
  currentQuery: SearchQuery | null;
  results: SearchResult[];
  isSearching: boolean;
  error: string | null;
  indexingProgress: Map<string, number>;
}

export interface SearchActions {
  search: (query: string, scope: "library" | "current-book", bookId?: string) => Promise<void>;
  searchLibraryMetadata: (query: string) => Promise<void>;
  searchBookContent: (bookId: string, query: string) => Promise<void>;
  indexBook: (bookId: string, content: string, format?: "epub" | "pdf") => Promise<void>;
  clearResults: () => void;
  setError: (error: string | null) => void;
  updateIndexingProgress: (bookId: string, progress: number) => void;
}

export type SearchStore = SearchState & SearchActions;

const initialState: SearchState = {
  currentQuery: null,
  results: [],
  isSearching: false,
  error: null,
  indexingProgress: new Map(),
};

export const useSearchStore = create<SearchStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      search: async (
        query: string,
        scope: "library" | "current-book",
        bookId?: string
      ) => {
        set({ isSearching: true, error: null });

        try {
          const library = useLibraryStore.getState();
          let results: SearchResult[] = [];

          if (scope === "library") {
            results = await searchService.search(query, library.books, {
              searchMetadata: true,
              searchContent: false,
              limit: 50,
            });
          } else if (scope === "current-book" && bookId) {
            results = await searchService.search(query, library.books, {
              searchMetadata: false,
              searchContent: true,
              bookId,
              limit: 100,
            });
          }

          set({
            currentQuery: { text: query, scope, bookId },
            results,
            isSearching: false,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Search failed";
          set({
            error: errorMessage,
            isSearching: false,
            results: [],
          });
        }
      },

      searchLibraryMetadata: async (query: string) => {
        set({ isSearching: true, error: null });

        try {
          const library = useLibraryStore.getState();
          const results = searchService.searchMetadata(query, library.books);

          set({
            currentQuery: { text: query, scope: "library" },
            results,
            isSearching: false,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Search failed";
          set({
            error: errorMessage,
            isSearching: false,
            results: [],
          });
        }
      },

      searchBookContent: async (bookId: string, query: string) => {
        set({ isSearching: true, error: null });

        try {
          const results = await searchService.searchBookContent(
            bookId,
            query,
            100
          );

          set({
            currentQuery: { text: query, scope: "current-book", bookId },
            results,
            isSearching: false,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Search failed";
          set({
            error: errorMessage,
            isSearching: false,
            results: [],
          });
        }
      },

      indexBook: async (
        bookId: string,
        content: string,
        format: "epub" | "pdf" = "epub"
      ) => {
        try {
          const progressInterval = setInterval(() => {
            set((state) => {
              const progress = Math.min(
                (state.indexingProgress.get(bookId) || 0) + 5,
                90
              );
              const newProgress = new Map(state.indexingProgress);
              newProgress.set(bookId, progress);
              return { indexingProgress: newProgress };
            });
          }, 100);

          await searchService.indexBookContent(bookId, content, format);

          clearInterval(progressInterval);

          const newProgress = new Map(get().indexingProgress);
          newProgress.set(bookId, 100);
          set({ indexingProgress: newProgress });

          setTimeout(() => {
            set((state) => {
              const progress = new Map(state.indexingProgress);
              progress.delete(bookId);
              return { indexingProgress: progress };
            });
          }, 500);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Indexing failed";
          set({ error: errorMessage });

          const progress = new Map(get().indexingProgress);
          progress.delete(bookId);
          set({ indexingProgress: progress });
        }
      },

      clearResults: () => {
        set({
          currentQuery: null,
          results: [],
          error: null,
        });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      updateIndexingProgress: (bookId: string, progress: number) => {
        set((state) => {
          const newProgress = new Map(state.indexingProgress);
          if (progress <= 0) {
            newProgress.delete(bookId);
          } else {
            newProgress.set(bookId, progress);
          }
          return { indexingProgress: newProgress };
        });
      },
    }),
    { name: "SearchStore" }
  )
);
