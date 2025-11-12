import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTranslationStore } from "../src/state/translation-store";
import type { TranslationSettings } from "../src/types";

// Mock the translation service
vi.mock("../src/services/translation-service", () => ({
  translationService: {
    translate: vi.fn(),
    clearCache: vi.fn(),
  },
}));

describe("useTranslationStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useTranslationStore());
    act(() => {
      result.current.clearTranslation();
      result.current.clearHistory();
    });
  });

  describe("Translation Actions", () => {
    it("should set translation error", () => {
      const { result } = renderHook(() => useTranslationStore());
      
      act(() => {
        result.current.setTranslationError("Test error");
      });

      expect(result.current.translationError).toBe("Test error");
    });

    it("should clear translation error", () => {
      const { result } = renderHook(() => useTranslationStore());
      
      act(() => {
        result.current.setTranslationError("Test error");
        result.current.setTranslationError(null);
      });

      expect(result.current.translationError).toBe(null);
    });

    it("should set selected text", () => {
      const { result } = renderHook(() => useTranslationStore());
      
      act(() => {
        result.current.setSelectedText("Selected text");
      });

      expect(result.current.selectedText).toBe("Selected text");
    });

    it("should clear selected text", () => {
      const { result } = renderHook(() => useTranslationStore());
      
      act(() => {
        result.current.setSelectedText("Selected text");
        result.current.clearSelectedText();
      });

      expect(result.current.selectedText).toBe("");
    });
  });

  describe("UI State Management", () => {
    it("should open and close translation panel", () => {
      const { result } = renderHook(() => useTranslationStore());
      
      expect(result.current.isTranslationPanelOpen).toBe(false);
      
      act(() => {
        result.current.openTranslationPanel();
      });
      
      expect(result.current.isTranslationPanelOpen).toBe(true);
      
      act(() => {
        result.current.closeTranslationPanel();
      });
      
      expect(result.current.isTranslationPanelOpen).toBe(false);
    });

    it("should show and hide tooltip", () => {
      const { result } = renderHook(() => useTranslationStore());
      
      expect(result.current.showTranslationTooltip).toBe(false);
      
      act(() => {
        result.current.showTooltip(100, 200);
      });
      
      expect(result.current.showTranslationTooltip).toBe(true);
      expect(result.current.tooltipPosition).toEqual({ x: 100, y: 200 });
      
      act(() => {
        result.current.hideTooltip();
      });
      
      expect(result.current.showTranslationTooltip).toBe(false);
    });
  });

  describe("History Management", () => {
    it("should add translation to history", () => {
      const { result } = renderHook(() => useTranslationStore());
      
      const mockResult = {
        originalText: "Hello",
        translatedText: "Hola",
        sourceLanguage: "en",
        targetLanguage: "es",
        provider: "mock",
        cached: false,
      };
      
      act(() => {
        result.current.addToHistory(mockResult);
      });
      
      expect(result.current.translationHistory).toHaveLength(1);
      expect(result.current.translationHistory[0]).toEqual(mockResult);
    });

    it("should remove item from history", () => {
      const { result } = renderHook(() => useTranslationStore());
      
      const mockResult1 = {
        originalText: "Hello",
        translatedText: "Hola",
        sourceLanguage: "en",
        targetLanguage: "es",
        provider: "mock",
        cached: false,
      };
      
      const mockResult2 = {
        originalText: "World",
        translatedText: "Mundo",
        sourceLanguage: "en",
        targetLanguage: "es",
        provider: "mock",
        cached: false,
      };
      
      act(() => {
        result.current.addToHistory(mockResult1);
        result.current.addToHistory(mockResult2);
      });
      
      expect(result.current.translationHistory).toHaveLength(2);
      // History is newest first: [mockResult2, mockResult1]
      expect(result.current.translationHistory[0]).toEqual(mockResult2);
      expect(result.current.translationHistory[1]).toEqual(mockResult1);
      
      act(() => {
        result.current.removeFromHistory(0); // Remove first item (mockResult2)
      });
      
      expect(result.current.translationHistory).toHaveLength(1);
      expect(result.current.translationHistory[0]).toEqual(mockResult1);
    });

    it("should clear history", () => {
      const { result } = renderHook(() => useTranslationStore());
      
      const mockResult = {
        originalText: "Hello",
        translatedText: "Hola",
        sourceLanguage: "en",
        targetLanguage: "es",
        provider: "mock",
        cached: false,
      };
      
      act(() => {
        result.current.addToHistory(mockResult);
        result.current.clearHistory();
      });
      
      expect(result.current.translationHistory).toHaveLength(0);
    });

    it("should limit history size to 50 items", () => {
      const { result } = renderHook(() => useTranslationStore());
      
      // Add 60 items
      act(() => {
        for (let i = 0; i < 60; i++) {
          result.current.addToHistory({
            originalText: `Text ${i}`,
            translatedText: `Translation ${i}`,
            sourceLanguage: "en",
            targetLanguage: "es",
            provider: "mock",
            cached: false,
          });
        }
      });
      
      expect(result.current.translationHistory).toHaveLength(50);
      expect(result.current.translationHistory[0].originalText).toBe("Text 59"); // Most recent first
    });
  });

  describe("Settings Cache", () => {
    it("should update cached settings", () => {
      const { result } = renderHook(() => useTranslationStore());
      
      const settings: TranslationSettings = {
        enabled: true,
        targetLanguage: "es",
        provider: "mock",
      };
      
      act(() => {
        result.current.updateCachedSettings(settings);
      });
      
      expect(result.current.cachedSettings).toEqual(settings);
    });
  });

  describe("Translation Integration", () => {
    it("should handle translation with empty text", async () => {
      const { result } = renderHook(() => useTranslationStore());
      
      const settings: TranslationSettings = {
        enabled: true,
        targetLanguage: "es",
        provider: "mock",
      };
      
      await act(async () => {
        await result.current.translateText("", settings);
      });
      
      expect(result.current.translationError).toBe("No text selected for translation");
      expect(result.current.isTranslating).toBe(false);
    });

    it("should handle translation with whitespace-only text", async () => {
      const { result } = renderHook(() => useTranslationStore());
      
      const settings: TranslationSettings = {
        enabled: true,
        targetLanguage: "es",
        provider: "mock",
      };
      
      await act(async () => {
        await result.current.translateText("   ", settings);
      });
      
      expect(result.current.translationError).toBe("No text selected for translation");
      expect(result.current.isTranslating).toBe(false);
    });
  });
});