import React, { useState, useRef, useEffect } from "react";
import { useReaderActions, useCurrentBook, useCurrentLocation } from "../hooks/useReader";
import type { Highlight } from "../types";
import "./AnnotationPopover.css";

interface AnnotationPopoverProps {
  selectedText: string;
  selectionRange: Range | null;
  position: { x: number; y: number };
  onClose: () => void;
  existingHighlight?: Highlight;
}

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#ffeb3b" },
  { name: "Green", value: "#4caf50" },
  { name: "Blue", value: "#2196f3" },
  { name: "Pink", value: "#e91e63" },
  { name: "Orange", value: "#ff9800" },
];

export const AnnotationPopover: React.FC<AnnotationPopoverProps> = ({
  selectedText,
  selectionRange,
  position,
  onClose,
  existingHighlight,
}) => {
  const { addHighlight, updateHighlight, removeHighlight } = useReaderActions();
  const currentBook = useCurrentBook();
  const currentLocation = useCurrentLocation();
  const [note, setNote] = useState(existingHighlight?.note || "");
  const [selectedColor, setSelectedColor] = useState(existingHighlight?.color || "#ffeb3b");
  const [isEditing, setIsEditing] = useState(!!existingHighlight);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const handleSave = () => {
    if (!currentBook || !currentLocation) return;

    if (existingHighlight) {
      updateHighlight(existingHighlight.id, {
        color: selectedColor,
        note: note.trim() || undefined,
      });
    } else {
      addHighlight(
        currentBook,
        selectedText,
        currentLocation,
        selectedColor,
        note.trim() || undefined
      );
    }

    onClose();
  };

  const handleDelete = () => {
    if (existingHighlight) {
      removeHighlight(existingHighlight.id);
    }
    onClose();
  };

  const adjustPosition = () => {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let adjustedX = position.x;
    let adjustedY = position.y;

    // Adjust horizontal position if popover would go off screen
    if (adjustedX + 280 > viewport.width) {
      adjustedX = viewport.width - 290;
    }
    if (adjustedX < 10) {
      adjustedX = 10;
    }

    // Adjust vertical position if popover would go off screen
    if (adjustedY + 200 > viewport.height) {
      adjustedY = position.y - 210;
    }
    if (adjustedY < 10) {
      adjustedY = 10;
    }

    return { x: adjustedX, y: adjustedY };
  };

  const adjustedPosition = adjustPosition();

  return (
    <div
      ref={popoverRef}
      className="annotation-popover"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      <div className="popover-header">
        <h3>{isEditing ? "Edit Highlight" : "Create Highlight"}</h3>
        <button className="close-button" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="selected-text">
        <p>"{selectedText}"</p>
      </div>

      <div className="color-selector">
        <label>Highlight Color:</label>
        <div className="color-options">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.value}
              className={`color-option ${selectedColor === color.value ? "selected" : ""}`}
              style={{ backgroundColor: color.value }}
              onClick={() => setSelectedColor(color.value)}
              title={color.name}
            />
          ))}
        </div>
      </div>

      <div className="note-section">
        <label htmlFor="note">Note (optional):</label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note about this highlight..."
          rows={3}
        />
      </div>

      <div className="popover-actions">
        {isEditing && (
          <button className="delete-button" onClick={handleDelete}>
            Delete
          </button>
        )}
        <div className="primary-actions">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="save-button" onClick={handleSave}>
            {isEditing ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};