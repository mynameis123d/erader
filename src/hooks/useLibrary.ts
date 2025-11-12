import { useLibraryStore } from "../state/library-store";

export const useLibrary = () => useLibraryStore();

export const useLibraryBooks = () => useLibraryStore((state) => state.books);

export const useLibraryCollections = () =>
  useLibraryStore((state) => state.collections);

export const useLibraryActivity = () =>
  useLibraryStore((state) => state.activity);

export const useLibraryLoading = () =>
  useLibraryStore((state) => state.isLoading);

export const useLibraryError = () => useLibraryStore((state) => state.error);

export const useLibraryActions = () =>
  useLibraryStore((state) => ({
    addBook: state.addBook,
    removeBook: state.removeBook,
    updateMetadata: state.updateMetadata,
    toggleFavorite: state.toggleFavorite,
    updateLastOpened: state.updateLastOpened,
    addToCollection: state.addToCollection,
    removeFromCollection: state.removeFromCollection,
    createCollection: state.createCollection,
    deleteCollection: state.deleteCollection,
    logActivity: state.logActivity,
    syncWithStorage: state.syncWithStorage,
    setError: state.setError,
    clearLibrary: state.clearLibrary,
  }));

export const useBookById = (bookId: string | undefined) =>
  useLibraryStore((state) =>
    bookId ? state.books.find((book) => book.id === bookId) : undefined
  );

export const useFavoriteBooks = () =>
  useLibraryStore((state) => state.books.filter((book) => book.isFavorite));

export const useCollectionBooks = (collectionId: string | undefined) =>
  useLibraryStore((state) => {
    const collection = collectionId
      ? state.collections.find((c) => c.id === collectionId)
      : undefined;
    if (!collection) return [];
    return state.books.filter((book) =>
      collection.bookIds.includes(book.id)
    );
  });
