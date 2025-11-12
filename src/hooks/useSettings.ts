import { useSettingsStore } from "../state/settings-store";
import type { SettingsStore } from "../state/settings-store";

export const useSettings = () => useSettingsStore((state: SettingsStore) => state.settings);

export const useThemeSettings = () =>
  useSettingsStore((state: SettingsStore) => state.settings.theme);

export const useTranslationSettings = () =>
  useSettingsStore((state: SettingsStore) => state.settings.translation);

export const useReadingSettings = () =>
  useSettingsStore((state: SettingsStore) => state.settings.reading);

export const useSettingsActions = () =>
  useSettingsStore((state: SettingsStore) => ({
    updateThemeSettings: state.updateThemeSettings,
    updateTranslationSettings: state.updateTranslationSettings,
    updateReadingSettings: state.updateReadingSettings,
    toggleAutoSave: state.toggleAutoSave,
    toggleAnalytics: state.toggleAnalytics,
    updateLastSync: state.updateLastSync,
    resetSettings: state.resetSettings,
    exportSettings: state.exportSettings,
    importSettings: state.importSettings,
  }));

export const useSettingsHydration = () =>
  useSettingsStore((state: SettingsStore) => state.isHydrated);
