import React, { useEffect, useRef, useCallback } from "react";
import { useBookHighlights } from "../hooks/useReader";
import type { Highlight } from "../types";

interface HighlightRendererProps {
  bookId?: string;
  containerRef?: React.RefObject<HTMLElement>;
  onHighlightClick?: (highlight: Highlight, event: MouseEvent) => void;
}

export const HighlightRenderer: React.FC<HighlightRendererProps> = ({
  bookId,
  containerRef,
  onHighlightClick,
}) => {
  const highlights = useBookHighlights(bookId);
  const renderedHighlights = useRef<Map<string, HTMLElement[]>>(new Map());

  // Clear existing highlights
  const clearHighlights = useCallback(() => {
    renderedHighlights.current.forEach((elements) => {
      elements.forEach((element) => {
        if (element.parentNode) {
          const parent = element.parentNode;
          while (element.firstChild) {
            parent.insertBefore(element.firstChild, element);
          }
          parent.removeChild(element);
        }
      });
    });
    renderedHighlights.current.clear();
  }, []);

  // Find text nodes that match the highlight text
  const findTextNodes = useCallback((container: Node, searchText: string): Node[] => {
    const textNodes: Node[] = [];
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const text = node.textContent?.trim();
          if (!text) return NodeFilter.FILTER_REJECT;
          if (text.includes(searchText)) return NodeFilter.FILTER_ACCEPT;
          return NodeFilter.FILTER_REJECT;
        },
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    return textNodes;
  }, []);

  // Wrap text content with highlight spans
  const wrapHighlight = useCallback((
    textNode: Node,
    searchText: string,
    highlight: Highlight
  ) => {
    const text = textNode.textContent || "";
    const startIndex = text.indexOf(searchText);
    
    if (startIndex === -1) return null;

    const beforeText = text.substring(0, startIndex);
    const highlightText = text.substring(startIndex, startIndex + searchText.length);
    const afterText = text.substring(startIndex + searchText.length);

    const span = document.createElement("span");
    span.className = "rendered-highlight";
    span.style.backgroundColor = highlight.color || "#ffeb3b";
    span.setAttribute("data-highlight-id", highlight.id);
    span.setAttribute("data-highlight-text", highlightText);
    
    // Add click handler for navigation
    if (onHighlightClick) {
      span.addEventListener("click", (e) => onHighlightClick(highlight, e));
      span.style.cursor = "pointer";
    }

    // Create new text nodes
    const beforeNode = document.createTextNode(beforeText);
    const highlightNode = document.createTextNode(highlightText);
    const afterNode = document.createTextNode(afterText);

    // Replace the original text node
    const parent = textNode.parentNode;
    if (parent) {
      parent.insertBefore(beforeNode, textNode);
      span.appendChild(highlightNode);
      parent.insertBefore(span, textNode);
      parent.insertBefore(afterNode, textNode);
      parent.removeChild(textNode);
    }

    return span;
  }, [onHighlightClick]);

  // Render highlights for EPUB content
  const renderEpubHighlights = useCallback((container: Element) => {
    highlights.forEach((highlight) => {
      if (highlight.location.cfi) {
        // Try to find element by CFI
        const element = container.querySelector(`[data-epub-cfi="${highlight.location.cfi}"]`);
        if (element) {
          const textNodes = findTextNodes(element, highlight.text);
          const elements: HTMLElement[] = [];
          
          textNodes.forEach((textNode) => {
            const span = wrapHighlight(textNode, highlight.text, highlight);
            if (span) elements.push(span);
          });
          
          if (elements.length > 0) {
            renderedHighlights.current.set(highlight.id, elements);
          }
        }
      }
    });
  }, [highlights, findTextNodes, wrapHighlight]);

  // Render highlights for PDF content
  const renderPdfHighlights = useCallback((container: Element) => {
    highlights.forEach((highlight) => {
      // For PDF, we look for text layers
      const textLayers = container.querySelectorAll('.textLayer');
      const elements: HTMLElement[] = [];
      
      textLayers.forEach((layer) => {
        const textNodes = findTextNodes(layer, highlight.text);
        textNodes.forEach((textNode) => {
          const span = wrapHighlight(textNode, highlight.text, highlight);
          if (span) elements.push(span);
        });
      });
      
      if (elements.length > 0) {
        renderedHighlights.current.set(highlight.id, elements);
      }
    });
  }, [highlights, findTextNodes, wrapHighlight]);

  // Main render effect
  useEffect(() => {
    if (!bookId || highlights.length === 0) return;

    const container = containerRef?.current || document.querySelector('.epub-viewport, .pdf-viewport, .reader-content');
    if (!container) return;

    // Clear existing highlights first
    clearHighlights();

    // Determine content type and render accordingly
    if (container.querySelector('.epub-view') || container.hasAttribute('data-epub-loaded')) {
      renderEpubHighlights(container);
    } else if (container.querySelector('.textLayer') || container.hasAttribute('data-pdf-loaded')) {
      renderPdfHighlights(container);
    } else {
      // Generic fallback - search entire container
      highlights.forEach((highlight) => {
        const textNodes = findTextNodes(container, highlight.text);
        const elements: HTMLElement[] = [];
        
        textNodes.forEach((textNode) => {
          const span = wrapHighlight(textNode, highlight.text, highlight);
          if (span) elements.push(span);
        });
        
        if (elements.length > 0) {
          renderedHighlights.current.set(highlight.id, elements);
        }
      });
    }

    return () => {
      clearHighlights();
    };
  }, [bookId, highlights, containerRef, clearHighlights, renderEpubHighlights, renderPdfHighlights, findTextNodes, wrapHighlight]);

  // This component doesn't render anything visible
  return null;
};

// Add CSS for rendered highlights
const style = document.createElement('style');
style.textContent = `
  .rendered-highlight {
    border-radius: 2px;
    transition: opacity 0.2s ease;
    position: relative;
  }
  
  .rendered-highlight:hover {
    opacity: 0.8;
  }
  
  .rendered-highlight::after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 3px;
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }
  
  .rendered-highlight:hover::after {
    opacity: 1;
  }
`;

if (!document.head.querySelector('style[data-highlight-styles]')) {
  style.setAttribute('data-highlight-styles', 'true');
  document.head.appendChild(style);
}