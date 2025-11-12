import { useSearchStore } from "../state/search-store";

export const useSearch = () => {
  return useSearchStore();
};

export const useSearchQuery = () => {
  return useSearchStore((state) => state.currentQuery);
};

export const useSearchResults = () => {
  return useSearchStore((state) => state.results);
};

export const useSearching = () => {
  return useSearchStore((state) => state.isSearching);
};

export const useSearchError = () => {
  return useSearchStore((state) => state.error);
};

export const useIndexingProgress = () => {
  return useSearchStore((state) => state.indexingProgress);
};

export const useSearchActions = () => {
  const store = useSearchStore();
  return {
    search: store.search,
    searchLibraryMetadata: store.searchLibraryMetadata,
    searchBookContent: store.searchBookContent,
    indexBook: store.indexBook,
    clearResults: store.clearResults,
    setError: store.setError,
    updateIndexingProgress: store.updateIndexingProgress,
  };
};
