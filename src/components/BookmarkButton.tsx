import React, { useState } from "react";
import { useCurrentBook, useCurrentLocation, useReaderActions } from "../hooks/useReader";
import "./BookmarkButton.css";

interface BookmarkButtonProps {
  onBookmarkCreated?: (bookmarkId: string) => void;
  className?: string;
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  onBookmarkCreated,
  className = "",
}) => {
  const currentBook = useCurrentBook();
  const currentLocation = useCurrentLocation();
  const { addBookmark } = useReaderActions();
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [label, setLabel] = useState("");

  const handleBookmarkClick = () => {
    if (!currentBook || !currentLocation) return;

    if (showLabelDialog) {
      // Save bookmark with label
      const bookmarkId = addBookmark(currentBook, currentLocation, label.trim() || undefined);
      setShowLabelDialog(false);
      setLabel("");
      onBookmarkCreated?.(bookmarkId);
    } else {
      // Show label dialog
      setShowLabelDialog(true);
    }
  };

  const handleCancel = () => {
    setShowLabelDialog(false);
    setLabel("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBookmarkClick();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!currentBook || !currentLocation) {
    return null;
  }

  return (
    <>
      <button
        className={`bookmark-button ${className}`}
        onClick={handleBookmarkClick}
        title="Add bookmark"
      >
        🔖
      </button>

      {showLabelDialog && (
        <div className="bookmark-dialog-overlay">
          <div className="bookmark-dialog">
            <h3>Add Bookmark</h3>
            <div className="bookmark-input">
              <label htmlFor="bookmark-label">Label (optional):</label>
              <input
                id="bookmark-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter a label for this bookmark..."
                autoFocus
              />
            </div>
            <div className="bookmark-actions">
              <button className="cancel-button" onClick={handleCancel}>
                Cancel
              </button>
              <button className="save-button" onClick={handleBookmarkClick}>
                Save Bookmark
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};