import React, { useState, useRef, useEffect } from "react";
import { AnnotationPopover } from "./AnnotationPopover";
import { AnnotationsPanel } from "./AnnotationsPanel";
import { BookmarkButton } from "./BookmarkButton";
import { HighlightRenderer } from "./HighlightRenderer";
import { useTextSelection } from "../hooks/useTextSelection";
import { useCurrentBook } from "../hooks/useReader";
import type { Highlight, ReadingLocation } from "../types";
import "./Annotations.css";

interface AnnotationsProps {
  containerRef?: React.RefObject<HTMLElement>;
  onNavigateToLocation?: (location: ReadingLocation) => void;
}

export const Annotations: React.FC<AnnotationsProps> = ({
  containerRef,
  onNavigateToLocation,
}) => {
  const currentBook = useCurrentBook();
  const [showPopover, setShowPopover] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [popoverState, setPopoverState] = useState<{
    selectedText: string;
    selectionRange: Range | null;
    position: { x: number; y: number };
    existingHighlight?: Highlight;
  } | null>(null);

  const readerContentRef = useRef<HTMLElement>(null);

  const {
    setupSelectionListeners,
    clearSelection,
  } = useTextSelection({
    onSelectionChange: (selectedText) => {
      // Handle selection changes if needed
    },
    onAnnotationRequest: (selectedText, range, location, position) => {
      setPopoverState({
        selectedText,
        selectionRange: range,
        position,
      });
      setShowPopover(true);
    },
  });

  // Set up text selection listeners
  useEffect(() => {
    const cleanup = setupSelectionListeners();
    return cleanup;
  }, [setupSelectionListeners]);

  // Close popover when clicking outside or ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPopover(false);
        setShowPanel(false);
        clearSelection();
      }
    };

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.annotation-popover') && !target.closest('.annotations-panel')) {
        if (showPopover) {
          setShowPopover(false);
          clearSelection();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleGlobalClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [showPopover, showPanel, clearSelection]);

  const handlePopoverClose = () => {
    setShowPopover(false);
    setPopoverState(null);
    clearSelection();
  };

  const handleNavigateToLocation = (location: ReadingLocation) => {
    onNavigateToLocation?.(location);
    // Optionally close panel after navigation
    // setShowPanel(false);
  };

  const handleHighlightClick = (highlight: Highlight, event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Find the highlight in our current book's highlights
    // This would be handled by the parent component that has access to the full highlights
    onNavigateToLocation?.(highlight.location);
  };

  const handleBookmarkCreated = () => {
    // Optional: Show a toast or notification
    console.log('Bookmark created');
  };

  if (!currentBook) {
    return null;
  }

  return (
    <>
      {/* Render highlights in the content */}
      <HighlightRenderer
        bookId={currentBook}
        containerRef={containerRef || readerContentRef}
        onHighlightClick={handleHighlightClick}
      />

      {/* Annotation toolbar */}
      <div className="annotations-toolbar">
        <BookmarkButton 
          onBookmarkCreated={handleBookmarkCreated}
          className="toolbar-button"
        />
        <button
          className="toolbar-button annotations-toggle"
          onClick={() => setShowPanel(!showPanel)}
          title={showPanel ? "Hide annotations panel" : "Show annotations panel"}
        >
          📝
        </button>
      </div>

      {/* Annotation popover */}
      {showPopover && popoverState && (
        <AnnotationPopover
          selectedText={popoverState.selectedText}
          selectionRange={popoverState.selectionRange}
          position={popoverState.position}
          onClose={handlePopoverClose}
          existingHighlight={popoverState.existingHighlight}
        />
      )}

      {/* Annotations panel */}
      <AnnotationsPanel
        isOpen={showPanel}
        onClose={() => setShowPanel(false)}
        onNavigateToLocation={handleNavigateToLocation}
      />
    </>
  );
};