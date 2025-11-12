import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "../src/state/settings-store";
import { useLibraryStore } from "../src/state/library-store";

describe("Settings Store - Extended", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      settings: {
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
        reading: {
          defaultPageLayout: "single",
          readingMode: "paginated",
          historyRetentionDays: 90,
          enablePageTransitions: true,
        },
        autoSaveProgress: true,
        enableAnalytics: false,
      },
      isHydrated: true,
    });
  });

  it("should update reading settings", () => {
    const { updateReadingSettings } = useSettingsStore.getState();

    updateReadingSettings({
      defaultPageLayout: "double",
      readingMode: "continuous",
    });

    const { settings } = useSettingsStore.getState();
    expect(settings.reading.defaultPageLayout).toBe("double");
    expect(settings.reading.readingMode).toBe("continuous");
    expect(settings.reading.historyRetentionDays).toBe(90);
  });

  it("should update translation API key", () => {
    const { updateTranslationSettings } = useSettingsStore.getState();

    updateTranslationSettings({
      apiKey: "test-api-key-12345",
      provider: "deepl",
    });

    const { settings } = useSettingsStore.getState();
    expect(settings.translation.apiKey).toBe("test-api-key-12345");
    expect(settings.translation.provider).toBe("deepl");
  });

  it("should export settings as JSON", () => {
    const { exportSettings } = useSettingsStore.getState();

    const exported = exportSettings();
    const parsed = JSON.parse(exported);

    expect(parsed.theme).toBeDefined();
    expect(parsed.translation).toBeDefined();
    expect(parsed.reading).toBeDefined();
    expect(parsed.theme.mode).toBe("light");
  });

  it("should import settings from JSON", () => {
    const { importSettings, updateThemeSettings } = useSettingsStore.getState();

    updateThemeSettings({ mode: "dark", fontSize: 20 });

    const newSettings = {
      theme: {
        mode: "sepia" as const,
        backgroundColor: "#f4ecd8",
        textColor: "#5c4b37",
        fontSize: 18,
        fontFamily: "Georgia, serif",
        lineHeight: 1.8,
        textAlign: "justify" as const,
        marginHorizontal: 30,
        marginVertical: 30,
      },
      translation: {
        enabled: true,
        targetLanguage: "es",
        provider: "google" as const,
        apiKey: "imported-key",
      },
      reading: {
        defaultPageLayout: "scroll" as const,
        readingMode: "continuous" as const,
        historyRetentionDays: 180,
        enablePageTransitions: false,
      },
      autoSaveProgress: false,
      enableAnalytics: true,
    };

    importSettings(JSON.stringify(newSettings));

    const { settings } = useSettingsStore.getState();
    expect(settings.theme.mode).toBe("sepia");
    expect(settings.theme.fontSize).toBe(18);
    expect(settings.translation.apiKey).toBe("imported-key");
    expect(settings.reading.historyRetentionDays).toBe(180);
    expect(settings.enableAnalytics).toBe(true);
  });

  it("should handle invalid import gracefully", () => {
    const { importSettings } = useSettingsStore.getState();

    expect(() => {
      importSettings("invalid json");
    }).toThrow("Invalid settings format");
  });

  it("should reset all settings including new fields", () => {
    const { updateThemeSettings, updateReadingSettings, resetSettings } =
      useSettingsStore.getState();

    updateThemeSettings({ mode: "dark", fontSize: 24 });
    updateReadingSettings({ defaultPageLayout: "double", historyRetentionDays: 30 });

    resetSettings();

    const { settings } = useSettingsStore.getState();
    expect(settings.theme.mode).toBe("light");
    expect(settings.theme.fontSize).toBe(16);
    expect(settings.reading.defaultPageLayout).toBe("single");
    expect(settings.reading.historyRetentionDays).toBe(90);
  });
});

describe("Library Store - Export/Import", () => {
  beforeEach(() => {
    useLibraryStore.setState({
      books: [],
      collections: [],
      activity: [],
      isLoading: false,
      error: null,
    });
  });

  it("should export library metadata", () => {
    const { createCollection, exportLibraryMetadata } =
      useLibraryStore.getState();

    createCollection("Test Collection", "A test collection");

    const exported = exportLibraryMetadata();
    const parsed = JSON.parse(exported);

    expect(parsed.books).toBeDefined();
    expect(parsed.collections).toBeDefined();
    expect(parsed.activity).toBeDefined();
    expect(parsed.collections.length).toBe(1);
    expect(parsed.collections[0].name).toBe("Test Collection");
  });

  it("should import library metadata", () => {
    const { importLibraryMetadata } = useLibraryStore.getState();

    const mockData = {
      books: [
        {
          id: "book-1",
          fileId: "file-1",
          metadata: {
            title: "Test Book",
            author: "Test Author",
          },
          isFavorite: false,
          dateAdded: new Date().toISOString(),
          collectionIds: [],
        },
      ],
      collections: [
        {
          id: "col-1",
          name: "Imported Collection",
          bookIds: ["book-1"],
          createdDate: new Date().toISOString(),
          updatedDate: new Date().toISOString(),
        },
      ],
      activity: [],
    };

    importLibraryMetadata(JSON.stringify(mockData));

    const state = useLibraryStore.getState();
    expect(state.books.length).toBe(1);
    expect(state.books[0].metadata.title).toBe("Test Book");
    expect(state.collections.length).toBe(1);
    expect(state.collections[0].name).toBe("Imported Collection");
  });

  it("should handle invalid library import", () => {
    const { importLibraryMetadata } = useLibraryStore.getState();

    expect(() => {
      importLibraryMetadata("not valid json");
    }).toThrow("Invalid library metadata format");
  });
});
