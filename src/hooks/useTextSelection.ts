import { useCallback, useEffect, useRef } from "react";
import { useTranslationStore } from "../state/translation-store";

export interface SelectionPosition {
  text: string;
  rect: DOMRect;
  isWordSelection: boolean;
}

export const useTextSelection = () => {
  const {
    selectedText,
    setSelectedText,
    clearSelectedText,
    showTooltip,
    hideTooltip,
    isTranslationPanelOpen,
  } = useTranslationStore();

  const tooltipTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSelectionRef = useRef<string>("");

  // Expand selection to sentence boundaries
  const expandToSentence = useCallback((text: string, selection: Selection): string => {
    const fullText = selection.anchorNode?.textContent || "";
    if (!fullText) return text;

    const anchorOffset = selection.anchorOffset;
    const focusOffset = selection.focusOffset;
    const start = Math.min(anchorOffset, focusOffset);
    const end = Math.max(anchorOffset, focusOffset);

    // Find sentence start
    let sentenceStart = start;
    for (let i = start; i >= 0; i--) {
      const char = fullText[i];
      if (char === '.' || char === '!' || char === '?' || char === '\n') {
        sentenceStart = i + 1;
        break;
      }
    }

    // Find sentence end
    let sentenceEnd = end;
    for (let i = end; i < fullText.length; i++) {
      const char = fullText[i];
      if (char === '.' || char === '!' || char === '?' || char === '\n') {
        sentenceEnd = i + 1;
        break;
      }
    }

    // Trim whitespace
    const result = fullText.substring(sentenceStart, sentenceEnd).trim();
    
    // If the result is much longer than the original selection, stick with the original
    if (result.length > text.length * 3) {
      return text;
    }

    return result;
  }, []);

  // Handle text selection
  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || isTranslationPanelOpen) {
      hideTooltip();
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      hideTooltip();
      return;
    }

    // Check if this is a new selection
    if (text === lastSelectionRef.current) {
      return;
    }

    lastSelectionRef.current = text;

    // Get selection position
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Check if this is a word selection (double-click)
    const isWordSelection = text.split(/\s+/).length === 1 && text.length < 50;

    // Determine if we should expand to sentence
    let finalText = text;
    if (!isWordSelection && text.length > 20) {
      finalText = expandToSentence(text, selection);
    }

    setSelectedText(finalText);

    // Show tooltip after a short delay
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }

    tooltipTimeoutRef.current = setTimeout(() => {
      if (rect && finalText) {
        showTooltip(rect.left + window.scrollX, rect.bottom + window.scrollY);
      }
    }, 300);
  }, [expandToSentence, hideTooltip, isTranslationPanelOpen, setSelectedText, showTooltip]);

  // Handle double-click for word selection
  const handleDoubleClick = useCallback((_event: MouseEvent) => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const text = selection.toString().trim();
      if (text) {
        setSelectedText(text);
        
        // Get position for tooltip
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        if (rect) {
          showTooltip(rect.left + window.scrollX, rect.bottom + window.scrollY);
        }
      }
    }
  }, [setSelectedText, showTooltip]);

  // Clear selection when clicking elsewhere
  const handleClick = useCallback((event: MouseEvent) => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      // Check if click is outside the selection
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) {
        clearSelectedText();
        hideTooltip();
        lastSelectionRef.current = "";
      }
    }
  }, [clearSelectedText, hideTooltip]);

  // Set up event listeners
  useEffect(() => {
    document.addEventListener("selectionchange", handleSelection);
    document.addEventListener("dblclick", handleDoubleClick);
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("selectionchange", handleSelection);
      document.removeEventListener("dblclick", handleDoubleClick);
      document.removeEventListener("click", handleClick);
      
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, [handleSelection, handleDoubleClick, handleClick]);

  // Clear tooltip on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        hideTooltip();
        clearSelectedText();
        lastSelectionRef.current = "";
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [hideTooltip, clearSelectedText]);

  return {
    selectedText,
    clearSelectedText,
  };
};