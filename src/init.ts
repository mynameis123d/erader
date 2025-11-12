import { useLibraryStore } from "./state/library-store";
import { useSettingsStore } from "./state/settings-store";
import type { SettingsStore } from "./state/settings-store";

export const initializeStores = async (): Promise<void> => {
  await Promise.all([
    useSettingsStore.persist.rehydrate(),
    useLibraryStore.persist.rehydrate(),
  ]);

  await useLibraryStore.getState().syncWithStorage();
};

export const waitForHydration = async (): Promise<void> => {
  const checkHydration = () => {
    return useSettingsStore.getState().isHydrated;
  };

  if (checkHydration()) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const unsubscribe = useSettingsStore.subscribe((state: SettingsStore) => {
      if (state.isHydrated) {
        unsubscribe();
        resolve();
      }
    });
  });
};
