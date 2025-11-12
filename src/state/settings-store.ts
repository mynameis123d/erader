import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { createPersistStorage } from "./store-utils";
import type { AppSettings, ThemeSettings, TranslationSettings } from "../types";

export interface SettingsState {
  settings: AppSettings;
  isHydrated: boolean;
}

export interface SettingsActions {
  updateThemeSettings: (theme: Partial<ThemeSettings>) => void;
  updateTranslationSettings: (translation: Partial<TranslationSettings>) => void;
  toggleAutoSave: () => void;
  toggleAnalytics: () => void;
  updateLastSync: () => void;
  resetSettings: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

const defaultSettings: AppSettings = {
  theme: {
    mode: "light",
    backgroundColor: "#ffffff",
    textColor: "#000000",
    fontSize: 16,
    fontFamily: "Georgia, serif",
    lineHeight: 1.6,
    textAlign: "left",
    marginHorizontal: 20,
    marginVertical: 20,
  },
  translation: {
    enabled: false,
    targetLanguage: "en",
    provider: "google",
  },
  autoSaveProgress: true,
  enableAnalytics: false,
};

const cloneDefaultSettings = (): AppSettings => ({
  ...defaultSettings,
  theme: { ...defaultSettings.theme },
  translation: { ...defaultSettings.translation },
});

const initialState: SettingsState = {
  settings: cloneDefaultSettings(),
  isHydrated: false,
};

type SettingsPersistedState = Pick<SettingsStore, "settings" | "isHydrated">;

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist<SettingsStore, [], [], SettingsPersistedState>(
      (set) => ({
        ...initialState,

        updateThemeSettings: (theme: Partial<ThemeSettings>) => {
          set((state) => ({
            settings: {
              ...state.settings,
              theme: {
                ...state.settings.theme,
                ...theme,
              },
            },
          }));
        },

        updateTranslationSettings: (translation: Partial<TranslationSettings>) => {
          set((state) => ({
            settings: {
              ...state.settings,
              translation: {
                ...state.settings.translation,
                ...translation,
              },
            },
          }));
        },

        toggleAutoSave: () => {
          set((state) => ({
            settings: {
              ...state.settings,
              autoSaveProgress: !state.settings.autoSaveProgress,
            },
          }));
        },

        toggleAnalytics: () => {
          set((state) => ({
            settings: {
              ...state.settings,
              enableAnalytics: !state.settings.enableAnalytics,
            },
          }));
        },

        updateLastSync: () => {
          set((state) => ({
            settings: {
              ...state.settings,
              lastSyncDate: new Date(),
            },
          }));
        },

        resetSettings: () => {
          set({ settings: cloneDefaultSettings() });
        },

        setHydrated: (hydrated: boolean) => {
          set({ isHydrated: hydrated });
        },
      }),
      {
        name: "settings-storage",
        storage: createPersistStorage<SettingsPersistedState>(),
        partialize: (state) => ({
          settings: state.settings,
          isHydrated: state.isHydrated,
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.isHydrated = true;

            if (state.settings.lastSyncDate) {
              state.settings.lastSyncDate = new Date(state.settings.lastSyncDate);
            }
          }
        },
      }
    ),
    { name: "SettingsStore" }
  )
);
