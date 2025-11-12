import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "../src/state/settings-store";

describe("SettingsStore", () => {
  beforeEach(() => {
    useSettingsStore.getState().resetSettings();
    useSettingsStore.getState().setHydrated(false);
  });

  it("should initialize with default settings", () => {
    const state = useSettingsStore.getState();
    expect(state.settings.theme.mode).toBe("light");
    expect(state.settings.translation.enabled).toBe(false);
    expect(state.settings.autoSaveProgress).toBe(true);
    expect(state.settings.enableAnalytics).toBe(false);
  });

  it("should update theme settings", () => {
    const store = useSettingsStore.getState();
    store.updateThemeSettings({ mode: "dark", fontSize: 18 });

    const state = useSettingsStore.getState();
    expect(state.settings.theme.mode).toBe("dark");
    expect(state.settings.theme.fontSize).toBe(18);
  });

  it("should update translation settings", () => {
    const store = useSettingsStore.getState();
    store.updateTranslationSettings({ enabled: true, targetLanguage: "es" });

    const state = useSettingsStore.getState();
    expect(state.settings.translation.enabled).toBe(true);
    expect(state.settings.translation.targetLanguage).toBe("es");
  });

  it("should toggle auto save and analytics", () => {
    const store = useSettingsStore.getState();

    store.toggleAutoSave();
    expect(useSettingsStore.getState().settings.autoSaveProgress).toBe(false);

    store.toggleAnalytics();
    expect(useSettingsStore.getState().settings.enableAnalytics).toBe(true);
  });

  it("should update last sync date", () => {
    const store = useSettingsStore.getState();

    store.updateLastSync();

    expect(useSettingsStore.getState().settings.lastSyncDate).toBeInstanceOf(Date);
  });

  it("should reset settings", () => {
    const store = useSettingsStore.getState();

    store.updateThemeSettings({ mode: "dark" });
    store.resetSettings();

    expect(useSettingsStore.getState().settings.theme.mode).toBe("light");
  });
});
