import { useSettingsStore } from "../state/settings-store";

export const useSettings = () => useSettingsStore((state) => state.settings);

export const useThemeSettings = () =>
  useSettingsStore((state) => state.settings.theme);

export const useTranslationSettings = () =>
  useSettingsStore((state) => state.settings.translation);

export const useSettingsActions = () =>
  useSettingsStore((state) => ({
    updateThemeSettings: state.updateThemeSettings,
    updateTranslationSettings: state.updateTranslationSettings,
    toggleAutoSave: state.toggleAutoSave,
    toggleAnalytics: state.toggleAnalytics,
    updateLastSync: state.updateLastSync,
    resetSettings: state.resetSettings,
  }));

export const useSettingsHydration = () =>
  useSettingsStore((state) => state.isHydrated);
