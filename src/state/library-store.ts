import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { createPersistStorage } from "./store-utils";
import type {
  ActivityHistoryEntry,
  Book,
  BookFile,
  BookMetadata,
  Collection,
} from "../types";
import { indexedStorageService } from "../services/indexed-storage-service";

const reviveBook = (book: Book): Book => ({
  ...book,
  dateAdded: new Date(book.dateAdded),
  lastOpened: book.lastOpened ? new Date(book.lastOpened) : undefined,
});

const reviveCollection = (collection: Collection): Collection => ({
  ...collection,
  createdDate: new Date(collection.createdDate),
  updatedDate: new Date(collection.updatedDate),
});

const reviveActivity = (
  entry: ActivityHistoryEntry
): ActivityHistoryEntry => ({
  ...entry,
  timestamp: new Date(entry.timestamp),
});

export interface LibraryState {
  books: Book[];
  collections: Collection[];
  activity: ActivityHistoryEntry[];
  isLoading: boolean;
  error: string | null;
}

export interface LibraryActions {
  addBook: (file: BookFile, metadata: BookMetadata) => Promise<void>;
  removeBook: (bookId: string) => Promise<void>;
  updateMetadata: (bookId: string, metadata: Partial<BookMetadata>) => void;
  toggleFavorite: (bookId: string) => void;
  updateLastOpened: (bookId: string) => void;
  addToCollection: (bookId: string, collectionId: string) => void;
  removeFromCollection: (bookId: string, collectionId: string) => void;
  createCollection: (name: string, description?: string) => string;
  deleteCollection: (collectionId: string) => void;
  logActivity: (entry: ActivityHistoryEntry) => void;
  syncWithStorage: () => Promise<void>;
  setError: (error: string | null) => void;
  clearLibrary: () => void;
  exportLibraryMetadata: () => string;
  importLibraryMetadata: (metadataJson: string) => void;
}

export type LibraryStore = LibraryState & LibraryActions;

const initialState: LibraryState = {
  books: [],
  collections: [],
  activity: [],
  isLoading: false,
  error: null,
};

type LibraryPersistedState = Pick<
  LibraryStore,
  "books" | "collections" | "activity"
>;

export const useLibraryStore = create<LibraryStore>()(
  devtools(
    persist<LibraryStore, [], [], LibraryPersistedState>(
      (set, get) => ({
        ...initialState,

        addBook: async (file: BookFile, metadata: BookMetadata) => {
          set({ isLoading: true, error: null });

          try {
            await indexedStorageService.saveFile(file);

            const now = new Date();
            const bookId = crypto.randomUUID();

            const newBook: Book = {
              id: bookId,
              fileId: file.id,
              metadata,
              isFavorite: false,
              dateAdded: now,
              collectionIds: [],
            };

            const activityEntry: ActivityHistoryEntry = {
              id: crypto.randomUUID(),
              bookId,
              type: "added",
              timestamp: now,
              details: {
                title: metadata.title,
              },
            };

            set((state) => ({
              books: [...state.books, newBook],
              activity: [...state.activity, activityEntry],
              isLoading: false,
            }));
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Failed to add book";
            set({ error: errorMessage, isLoading: false });
            throw error;
          }
        },

        removeBook: async (bookId: string) => {
          set({ isLoading: true, error: null });

          try {
            const book = get().books.find((b) => b.id === bookId);
            if (book) {
              await indexedStorageService.deleteFile(book.fileId);

              const activityEntry: ActivityHistoryEntry = {
                id: crypto.randomUUID(),
                bookId,
                type: "removed",
                timestamp: new Date(),
                details: {
                  title: book.metadata.title,
                },
              };

              set((state) => ({
                books: state.books.filter((b) => b.id !== bookId),
                collections: state.collections.map((c) => ({
                  ...c,
                  bookIds: c.bookIds.filter((id) => id !== bookId),
                })),
                activity: [...state.activity, activityEntry],
                isLoading: false,
              }));
            } else {
              set((state) => ({
                books: state.books.filter((b) => b.id !== bookId),
                collections: state.collections.map((c) => ({
                  ...c,
                  bookIds: c.bookIds.filter((id) => id !== bookId),
                })),
                isLoading: false,
              }));
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Failed to remove book";
            set({ error: errorMessage, isLoading: false });
            throw error;
          }
        },

        updateMetadata: (bookId: string, metadata: Partial<BookMetadata>) => {
          set((state) => ({
            books: state.books.map((book) =>
              book.id === bookId
                ? {
                    ...book,
                    metadata: { ...book.metadata, ...metadata },
                  }
                : book
            ),
          }));
        },

        toggleFavorite: (bookId: string) => {
          set((state) => ({
            books: state.books.map((book) =>
              book.id === bookId
                ? { ...book, isFavorite: !book.isFavorite }
                : book
            ),
          }));
        },

        updateLastOpened: (bookId: string) => {
          set((state) => ({
            books: state.books.map((book) =>
              book.id === bookId ? { ...book, lastOpened: new Date() } : book
            ),
          }));
        },

        addToCollection: (bookId: string, collectionId: string) => {
          set((state) => {
            const updatedBooks = state.books.map((book) => {
              if (book.id !== bookId) {
                return book;
              }

              const collectionIds = new Set(book.collectionIds || []);
              collectionIds.add(collectionId);

              return {
                ...book,
                collectionIds: Array.from(collectionIds),
              };
            });

            const updatedCollections = state.collections.map((collection) => {
              if (collection.id !== collectionId) {
                return collection;
              }

              const bookIds = new Set(collection.bookIds);
              bookIds.add(bookId);

              return {
                ...collection,
                bookIds: Array.from(bookIds),
                updatedDate: new Date(),
              };
            });

            return {
              books: updatedBooks,
              collections: updatedCollections,
            };
          });
        },

        removeFromCollection: (bookId: string, collectionId: string) => {
          set((state) => ({
            books: state.books.map((book) =>
              book.id === bookId
                ? {
                    ...book,
                    collectionIds: (book.collectionIds || []).filter(
                      (id) => id !== collectionId
                    ),
                  }
                : book
            ),
            collections: state.collections.map((collection) =>
              collection.id === collectionId
                ? {
                    ...collection,
                    bookIds: collection.bookIds.filter((id) => id !== bookId),
                    updatedDate: new Date(),
                  }
                : collection
            ),
          }));
        },

        createCollection: (name: string, description?: string) => {
          const newCollection: Collection = {
            id: crypto.randomUUID(),
            name,
            description,
            bookIds: [],
            createdDate: new Date(),
            updatedDate: new Date(),
          };

          set((state) => ({
            collections: [...state.collections, newCollection],
          }));

          return newCollection.id;
        },

        deleteCollection: (collectionId: string) => {
          set((state) => ({
            collections: state.collections.filter(
              (c) => c.id !== collectionId
            ),
            books: state.books.map((book) => ({
              ...book,
              collectionIds: (book.collectionIds || []).filter(
                (id) => id !== collectionId
              ),
            })),
          }));
        },

        logActivity: (entry: ActivityHistoryEntry) => {
          set((state) => ({
            activity: [...state.activity, entry],
          }));
        },

        syncWithStorage: async () => {
          set({ isLoading: true, error: null });

          try {
            const storedFiles = await indexedStorageService.listFiles();
            const currentBooks = get().books;

            const fileIdsInStore = new Set(storedFiles.map((f) => f.id));

            const booksToKeep = currentBooks.filter((book) =>
              fileIdsInStore.has(book.fileId)
            );

            const bookIdsToKeep = new Set(booksToKeep.map((book) => book.id));

            const activity = get().activity.filter((entry) =>
              bookIdsToKeep.has(entry.bookId)
            );

            set({ books: booksToKeep, activity, isLoading: false });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Failed to sync";
            set({ error: errorMessage, isLoading: false });
            throw error;
          }
        },

        setError: (error: string | null) => {
          set({ error });
        },

        clearLibrary: () => {
          set(initialState);
        },

        exportLibraryMetadata: () => {
          const state = get();
          const exportData = {
            books: state.books,
            collections: state.collections,
            activity: state.activity,
          };
          return JSON.stringify(exportData, null, 2);
        },

        importLibraryMetadata: (metadataJson: string) => {
          try {
            const importedData = JSON.parse(metadataJson);
            const books = importedData.books.map(reviveBook);
            const collections = importedData.collections.map(reviveCollection);
            const activity = importedData.activity.map(reviveActivity);
            set({ books, collections, activity });
          } catch (error) {
            throw new Error("Invalid library metadata format");
          }
        },
      }),
      {
        name: "library-storage",
        storage: createPersistStorage<LibraryPersistedState>(),
        partialize: (state) => ({
          books: state.books,
          collections: state.collections,
          activity: state.activity,
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            if (state.books) state.books = state.books.map(reviveBook);
            if (state.collections)
              state.collections = state.collections.map(reviveCollection);
            if (state.activity)
              state.activity = state.activity.map(reviveActivity);
          }
        },
      }
    ),
    { name: "LibraryStore" }
  )
);
