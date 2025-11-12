import { useCallback, useRef } from "react";
import { useReaderActions, useReaderSelection } from "../hooks/useReader";
import type { ReadingLocation } from "../types";

interface TextSelectionHandlerOptions {
  onSelectionChange?: (selectedText: string | null) => void;
  onAnnotationRequest?: (
    selectedText: string,
    range: Range,
    location: ReadingLocation,
    position: { x: number; y: number }
  ) => void;
}

export const useTextSelection = (options: TextSelectionHandlerOptions = {}) => {
  const { setSelection } = useReaderActions();
  const currentSelection = useReaderSelection();
  const selectionTimeoutRef = useRef<NodeJS.Timeout>();

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
      y: rect.bottom + window.scrollY + 5, // Add small offset below selection
    };
  }, []);

  const extractLocationFromSelection = useCallback((range: Range): ReadingLocation => {
    // Try to extract location information from the selected range
    const startNode = range.startContainer;
    let location: ReadingLocation = {};

    // Check for EPUB CFI in data attributes
    const element = startNode.nodeType === Node.ELEMENT_NODE 
      ? startNode as Element 
      : startNode.parentElement;
    
    if (element) {
      const cfi = element.getAttribute('data-epub-cfi') || 
                  element.closest('[data-epub-cfi]')?.getAttribute('data-epub-cfi');
      if (cfi) {
        location.cfi = cfi;
      }

      // Check for page information
      const page = element.getAttribute('data-page') || 
                   element.closest('[data-page]')?.getAttribute('data-page');
      if (page) {
        location.page = parseInt(page, 10);
      }

      // Check for chapter information
      const chapter = element.getAttribute('data-chapter') || 
                      element.closest('[data-chapter]')?.getAttribute('data-chapter');
      if (chapter) {
        location.chapter = chapter;
      }

      // Calculate position as percentage if possible
      const viewport = document.querySelector('.epub-viewport, .pdf-viewport');
      if (viewport) {
        const viewportRect = viewport.getBoundingClientRect();
        const selectionRect = range.getBoundingClientRect();
        const relativeY = selectionRect.top - viewportRect.top;
        const position = (relativeY / viewportRect.height) * 100;
        location.position = Math.max(0, Math.min(100, position));
      }
    }

    // Fallback to a simple position based on scroll
    if (location.position === undefined) {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      location.position = documentHeight > 0 ? (scrollTop / documentHeight) * 100 : 0;
    }

    return location;
  }, []);

  const handleSelectionChange = useCallback(() => {
    // Clear any existing timeout
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
    }

    // Wait a bit to ensure selection is complete
    selectionTimeoutRef.current = setTimeout(() => {
      const selectedText = getSelectedText();
      const range = getSelectionRange();

      if (selectedText && range && options.onAnnotationRequest) {
        const location = extractLocationFromSelection(range);
        const position = getSelectionPosition(range);
        
        // Only trigger annotation popover for meaningful selections
        if (selectedText.length > 3) {
          options.onAnnotationRequest(selectedText, range, location, position);
        }
      }

      setSelection(selectedText || null);
      options.onSelectionChange?.(selectedText || null);
    }, 100);
  }, [
    getSelectedText,
    getSelectionRange,
    extractLocationFromSelection,
    getSelectionPosition,
    setSelection,
    options,
  ]);

  const clearSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
    setSelection(null);
    options.onSelectionChange?.(null);
  }, [setSelection, options]);

  const setupSelectionListeners = useCallback(() => {
    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('keyup', handleSelectionChange);
    document.addEventListener('touchend', handleSelectionChange);
    
    return () => {
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('keyup', handleSelectionChange);
      document.removeEventListener('touchend', handleSelectionChange);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [handleSelectionChange]);

  return {
    currentSelection,
    getSelectionRange,
    getSelectedText,
    clearSelection,
    setupSelectionListeners,
    extractLocationFromSelection,
  };
};