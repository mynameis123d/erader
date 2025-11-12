import { useCallback } from "react";
import type { ReadingLocation } from "../types";

export interface EpubSelectionOptions {
  onSelectionChange?: (selectedText: string | null) => void;
  onAnnotationRequest?: (
    selectedText: string,
    range: Range,
    cfiRange: string,
    location: ReadingLocation,
    position: { x: number; y: number }
  ) => void;
}

export const useEpubSelection = (options: EpubSelectionOptions = {}) => {
  const getSelectionRange = useCallback((): Range | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }
    return selection.getRangeAt(0);
  }, []);

  const getSelectedText = useCallback((): string => {
    const selection = window.getSelection();
    return selection?.toString().trim() || "";
  }, []);

  const getSelectionPosition = useCallback((range: Range): { x: number; y: number } => {
    const rect = range.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY + 5,
    };
  }, []);

  const generateCfiRange = useCallback((range: Range): string | null => {
    try {
      // Check if epub.js is available and has CFI generation
      if ((window as any).epubjs && (window as any).epubjs.CFI) {
        return (window as any).epubjs.CFI.generateRange(range);
      }

      // Fallback: create a simple CFI-like identifier
      const startElement = range.startContainer.nodeType === Node.ELEMENT_NODE 
        ? range.startContainer as Element
        : range.startContainer.parentElement;

      if (startElement) {
        const cfi = startElement.getAttribute('data-epub-cfi');
        if (cfi) {
          // Add range information to the base CFI
          const startOffset = range.startOffset;
          const endOffset = range.endOffset;
          return `${cfi},${startOffset}:${endOffset}`;
        }
      }

      return null;
    } catch (error) {
      console.warn('Failed to generate CFI range:', error);
      return null;
    }
  }, []);

  const extractLocationFromCfi = useCallback((cfiRange: string): ReadingLocation => {
    // Extract base CFI and position information
    const baseCfi = cfiRange.split(',')[0];
    const positionMatch = cfiRange.match(/,(\d+):(\d+)$/);
    
    const location: ReadingLocation = {
      cfi: baseCfi,
    };

    if (positionMatch) {
      // Calculate relative position from character offsets
      const startOffset = parseInt(positionMatch[1], 10);
      const endOffset = parseInt(positionMatch[2], 10);
      const avgOffset = (startOffset + endOffset) / 2;
      
      // This is a rough approximation - in a real implementation,
      // you'd want to calculate the actual position based on the content
      location.position = Math.min(100, (avgOffset / 1000) * 100);
    }

    return location;
  }, []);

  const handleEpubSelection = useCallback(() => {
    const selectedText = getSelectedText();
    const range = getSelectionRange();

    if (selectedText && range && options.onAnnotationRequest) {
      const cfiRange = generateCfiRange(range);
      
      if (cfiRange) {
        const location = extractLocationFromCfi(cfiRange);
        const position = getSelectionPosition(range);
        
        if (selectedText.length > 3) {
          options.onAnnotationRequest(selectedText, range, cfiRange, location, position);
        }
      }
    }

    options.onSelectionChange?.(selectedText || null);
  }, [
    getSelectedText,
    getSelectionRange,
    generateCfiRange,
    extractLocationFromCfi,
    getSelectionPosition,
    options,
  ]);

  const setupEpubSelectionListeners = useCallback(() => {
    document.addEventListener('mouseup', handleEpubSelection);
    document.addEventListener('keyup', handleEpubSelection);
    document.addEventListener('touchend', handleEpubSelection);
    
    return () => {
      document.removeEventListener('mouseup', handleEpubSelection);
      document.removeEventListener('keyup', handleEpubSelection);
      document.removeEventListener('touchend', handleEpubSelection);
    };
  }, [handleEpubSelection]);

  return {
    getSelectionRange,
    getSelectedText,
    generateCfiRange,
    extractLocationFromCfi,
    setupEpubSelectionListeners,
  };
};