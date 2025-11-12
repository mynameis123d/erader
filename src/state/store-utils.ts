import { createJSONStorage } from "zustand/middleware";

const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  } as Storage;
};

export const getStorage = () => {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }

  if (typeof globalThis !== "undefined") {
    const globalWithMemory = globalThis as unknown as {
      __zustand_memory_storage__?: Storage;
    };

    if (!globalWithMemory.__zustand_memory_storage__) {
      globalWithMemory.__zustand_memory_storage__ = createMemoryStorage();
    }

    return globalWithMemory.__zustand_memory_storage__ as Storage;
  }

  return createMemoryStorage();
};

export const createPersistStorage = <T>() =>
  createJSONStorage<T>(() => getStorage());
