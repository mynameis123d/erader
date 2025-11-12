import { useCallback } from "react";
import type { ReadingLocation } from "../types";

export interface PdfSelectionOptions {
  onSelectionChange?: (selectedText: string | null) => void;
  onAnnotationRequest?: (
    selectedText: string,
    range: Range,
    pageNumber: number,
    location: ReadingLocation,
    position: { x: number; y: number }
  ) => void;
}

export const usePdfSelection = (options: PdfSelectionOptions = {}) => {
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

  const extractPageFromSelection = useCallback((range: Range): number | null => {
    try {
      // Find the containing page container
      let element = range.startContainer.nodeType === Node.ELEMENT_NODE 
        ? range.startContainer as Element
        : range.startContainer.parentElement;

      while (element && element !== document.body) {
        // Check for common PDF viewer page selectors
        const pageSelectors = [
          '[data-page-number]',
          '.page',
          '.pdf-page',
          '[data-page]',
          '.page-container',
        ];

        for (const selector of pageSelectors) {
          const pageElement = element.closest(selector);
          if (pageElement) {
            // Try to extract page number from various attributes
            const pageNumber = 
              pageElement.getAttribute('data-page-number') ||
              pageElement.getAttribute('data-page') ||
              pageElement.getAttribute('page');
            
            if (pageNumber) {
              return parseInt(pageNumber, 10);
            }

            // Try to extract from class name (e.g., "page-5")
            const classMatch = pageElement.className.match(/(?:page|pdf-page)[-_]?(\d+)/i);
            if (classMatch) {
              return parseInt(classMatch[1], 10);
            }

            // Try to extract from ID (e.g., "page5" or "pdf-page-5")
            const idMatch = pageElement.id.match(/(?:page|pdf-page)[-_]?(\d+)/i);
            if (idMatch) {
              return parseInt(idMatch[1], 10);
            }
          }
        }

        element = element.parentElement;
      }

      return null;
    } catch (error) {
      console.warn('Failed to extract page number from selection:', error);
      return null;
    }
  }, []);

  const extractLocationFromPdfSelection = useCallback((
    range: Range,
    pageNumber: number
  ): ReadingLocation => {
    const location: ReadingLocation = {
      page: pageNumber,
    };

    // Try to calculate relative position within the page
    let element = range.startContainer.nodeType === Node.ELEMENT_NODE 
      ? range.startContainer as Element
      : range.startContainer.parentElement;

    const pageElement = element?.closest('[data-page-number], .page, .pdf-page, [data-page]');
    
    if (pageElement) {
      const pageRect = pageElement.getBoundingClientRect();
      const selectionRect = range.getBoundingClientRect();
      
      // Calculate relative position within the page
      const relativeY = selectionRect.top - pageRect.top;
      const relativePosition = (relativeY / pageRect.height) * 100;
      
      location.position = Math.max(0, Math.min(100, relativePosition));
    } else {
      // Fallback: use viewport position
      const viewportHeight = window.innerHeight;
      const selectionRect = range.getBoundingClientRect();
      const viewportPosition = (selectionRect.top / viewportHeight) * 100;
      location.position = Math.max(0, Math.min(100, viewportPosition));
    }

    return location;
  }, []);

  const handlePdfSelection = useCallback(() => {
    const selectedText = getSelectedText();
    const range = getSelectionRange();

    if (selectedText && range && options.onAnnotationRequest) {
      const pageNumber = extractPageFromSelection(range);
      
      if (pageNumber) {
        const location = extractLocationFromPdfSelection(range, pageNumber);
        const position = getSelectionPosition(range);
        
        if (selectedText.length > 3) {
          options.onAnnotationRequest(selectedText, range, pageNumber, location, position);
        }
      }
    }

    options.onSelectionChange?.(selectedText || null);
  }, [
    getSelectedText,
    getSelectionRange,
    extractPageFromSelection,
    extractLocationFromPdfSelection,
    getSelectionPosition,
    options,
  ]);

  const setupPdfSelectionListeners = useCallback(() => {
    document.addEventListener('mouseup', handlePdfSelection);
    document.addEventListener('keyup', handlePdfSelection);
    document.addEventListener('touchend', handlePdfSelection);
    
    return () => {
      document.removeEventListener('mouseup', handlePdfSelection);
      document.removeEventListener('keyup', handlePdfSelection);
      document.removeEventListener('touchend', handlePdfSelection);
    };
  }, [handlePdfSelection]);

  return {
    getSelectionRange,
    getSelectedText,
    extractPageFromSelection,
    extractLocationFromPdfSelection,
    setupPdfSelectionListeners,
  };
};