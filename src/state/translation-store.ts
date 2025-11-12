import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { TranslationResult } from "../services/translation-service";
import type { TranslationSettings } from "../types";

export interface TranslationState {
  // Current translation request
  isTranslating: boolean;
  selectedText: string;
  translationResult: TranslationResult | null;
  translationError: string | null;
  
  // UI state
  isTranslationPanelOpen: boolean;
  showTranslationTooltip: boolean;
  tooltipPosition: { x: number; y: number };
  
  // History
  translationHistory: TranslationResult[];
  
  // Settings cache
  cachedSettings: TranslationSettings | null;
}

export interface TranslationActions {
  // Translation actions
  translateText: (text: string, settings: TranslationSettings) => Promise<void>;
  clearTranslation: () => void;
  
  // UI actions
  openTranslationPanel: () => void;
  closeTranslationPanel: () => void;
  showTooltip: (x: number, y: number) => void;
  hideTooltip: () => void;
  
  // Selection actions
  setSelectedText: (text: string) => void;
  clearSelectedText: () => void;
  
  // History actions
  addToHistory: (result: TranslationResult) => void;
  clearHistory: () => void;
  removeFromHistory: (index: number) => void;
  
  // Settings cache
  updateCachedSettings: (settings: TranslationSettings) => void;
  
  // Error handling
  setTranslationError: (error: string | null) => void;
}

export type TranslationStore = TranslationState & TranslationActions;

const initialState: TranslationState = {
  isTranslating: false,
  selectedText: "",
  translationResult: null,
  translationError: null,
  
  isTranslationPanelOpen: false,
  showTranslationTooltip: false,
  tooltipPosition: { x: 0, y: 0 },
  
  translationHistory: [],
  cachedSettings: null,
};

export const useTranslationStore = create<TranslationStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      translateText: async (text: string, settings: TranslationSettings) => {
        if (!text.trim()) {
          set({ translationError: "No text selected for translation" });
          return;
        }

        set({ isTranslating: true, translationError: null });
        
        try {
          const { translationService } = await import("../services/translation-service");
          const result = await translationService.translate(text, settings);
          
          set({
            translationResult: result,
            isTranslating: false,
            selectedText: text,
          });
          
          // Add to history
          get().addToHistory(result);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Translation failed";
          set({
            translationError: errorMessage,
            isTranslating: false,
          });
        }
      },

      clearTranslation: () => {
        set({
          translationResult: null,
          translationError: null,
          selectedText: "",
        });
      },

      openTranslationPanel: () => {
        set({ isTranslationPanelOpen: true });
      },

      closeTranslationPanel: () => {
        set({ isTranslationPanelOpen: false });
      },

      showTooltip: (x: number, y: number) => {
        set({
          showTranslationTooltip: true,
          tooltipPosition: { x, y },
        });
      },

      hideTooltip: () => {
        set({ showTranslationTooltip: false });
      },

      setSelectedText: (text: string) => {
        set({ selectedText: text });
      },

      clearSelectedText: () => {
        set({ selectedText: "" });
      },

      addToHistory: (result: TranslationResult) => {
        set((state) => {
          const newHistory = [result, ...state.translationHistory.slice(0, 49)]; // Keep last 50
          return { translationHistory: newHistory };
        });
      },

      clearHistory: () => {
        set({ translationHistory: [] });
      },

      removeFromHistory: (index: number) => {
        set((state) => {
          const newHistory = state.translationHistory.filter((_, i) => i !== index);
          return { translationHistory: newHistory };
        });
      },

      updateCachedSettings: (settings: TranslationSettings) => {
        set({ cachedSettings: settings });
      },

      setTranslationError: (error: string | null) => {
        set({ translationError: error });
      },
    }),
    { name: "TranslationStore" }
  )
);