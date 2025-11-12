import React, { useState } from "react";
import { useCurrentBook, useBookHighlights, useBookBookmarks } from "../hooks/useReader";
import { useReaderActions } from "../hooks/useReader";
import type { Highlight, Bookmark } from "../types";
import "./AnnotationsPanel.css";

type TabType = "highlights" | "bookmarks" | "notes";

interface AnnotationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToLocation: (location: any) => void;
}

export const AnnotationsPanel: React.FC<AnnotationsPanelProps> = ({
  isOpen,
  onClose,
  onNavigateToLocation,
}) => {
  const currentBook = useCurrentBook();
  const highlights = useBookHighlights(currentBook || undefined);
  const bookmarks = useBookBookmarks(currentBook || undefined);
  const { removeHighlight, removeBookmark, updateHighlight } = useReaderActions();
  const [activeTab, setActiveTab] = useState<TabType>("highlights");
  const [editingHighlight, setEditingHighlight] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");

  const notes = highlights.filter((h) => h.note);

  const handleDeleteHighlight = (id: string) => {
    removeHighlight(id);
  };

  const handleDeleteBookmark = (id: string) => {
    removeBookmark(id);
  };

  const handleEditNote = (highlight: Highlight) => {
    setEditingHighlight(highlight.id);
    setEditNote(highlight.note || "");
  };

  const handleSaveNote = (highlightId: string) => {
    updateHighlight(highlightId, { note: editNote.trim() || undefined });
    setEditingHighlight(null);
    setEditNote("");
  };

  const handleCancelEdit = () => {
    setEditingHighlight(null);
    setEditNote("");
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const HighlightsTab = () => (
    <div className="annotations-list">
      {highlights.length === 0 ? (
        <div className="empty-state">
          <p>No highlights yet. Select text in the book to create highlights.</p>
        </div>
      ) : (
        highlights.map((highlight) => (
          <div key={highlight.id} className="annotation-item">
            <div className="annotation-header">
              <div
                className="highlight-color-indicator"
                style={{ backgroundColor: highlight.color }}
              />
              <span className="annotation-date">
                {formatDate(highlight.createdDate)}
              </span>
              <div className="annotation-actions">
                <button
                  className="action-button"
                  onClick={() => onNavigateToLocation(highlight.location)}
                  title="Go to location"
                >
                  →
                </button>
                <button
                  className="action-button delete"
                  onClick={() => handleDeleteHighlight(highlight.id)}
                  title="Delete highlight"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="highlight-text">
              "{truncateText(highlight.text, 200)}"
            </div>
            {editingHighlight === highlight.id ? (
              <div className="note-edit">
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={3}
                />
                <div className="edit-actions">
                  <button className="save-button" onClick={() => handleSaveNote(highlight.id)}>
                    Save
                  </button>
                  <button className="cancel-button" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {highlight.note && (
                  <div className="annotation-note">
                    <strong>Note:</strong> {highlight.note}
                  </div>
                )}
                <button
                  className="add-note-button"
                  onClick={() => handleEditNote(highlight)}
                >
                  {highlight.note ? "Edit note" : "Add note"}
                </button>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );

  const BookmarksTab = () => (
    <div className="annotations-list">
      {bookmarks.length === 0 ? (
        <div className="empty-state">
          <p>No bookmarks yet. Use the bookmark button to save your current location.</p>
        </div>
      ) : (
        bookmarks.map((bookmark) => (
          <div key={bookmark.id} className="annotation-item">
            <div className="annotation-header">
              <div className="bookmark-indicator">🔖</div>
              <span className="annotation-date">
                {formatDate(bookmark.createdDate)}
              </span>
              <div className="annotation-actions">
                <button
                  className="action-button"
                  onClick={() => onNavigateToLocation(bookmark.location)}
                  title="Go to bookmark"
                >
                  →
                </button>
                <button
                  className="action-button delete"
                  onClick={() => handleDeleteBookmark(bookmark.id)}
                  title="Delete bookmark"
                >
                  ×
                </button>
              </div>
            </div>
            {bookmark.label && (
              <div className="bookmark-label">{bookmark.label}</div>
            )}
            <div className="location-info">
              {bookmark.location.cfi && `CFI: ${truncateText(bookmark.location.cfi, 50)}`}
              {bookmark.location.page && `Page: ${bookmark.location.page}`}
              {bookmark.location.chapter && `Chapter: ${bookmark.location.chapter}`}
              {bookmark.location.position && `Position: ${bookmark.location.position}`}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const NotesTab = () => (
    <div className="annotations-list">
      {notes.length === 0 ? (
        <div className="empty-state">
          <p>No notes yet. Add notes to highlights to see them here.</p>
        </div>
      ) : (
        notes.map((highlight) => (
          <div key={highlight.id} className="annotation-item">
            <div className="annotation-header">
              <div
                className="highlight-color-indicator"
                style={{ backgroundColor: highlight.color }}
              />
              <span className="annotation-date">
                {formatDate(highlight.createdDate)}
              </span>
              <div className="annotation-actions">
                <button
                  className="action-button"
                  onClick={() => onNavigateToLocation(highlight.location)}
                  title="Go to location"
                >
                  →
                </button>
              </div>
            </div>
            <div className="annotation-note">
              <p>{highlight.note}</p>
            </div>
            <div className="highlight-text">
              "{truncateText(highlight.text, 150)}"
            </div>
          </div>
        ))
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="annotations-panel">
      <div className="panel-header">
        <h2>Annotations</h2>
        <button className="close-button" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="panel-tabs">
        <button
          className={`tab-button ${activeTab === "highlights" ? "active" : ""}`}
          onClick={() => setActiveTab("highlights")}
        >
          Highlights ({highlights.length})
        </button>
        <button
          className={`tab-button ${activeTab === "bookmarks" ? "active" : ""}`}
          onClick={() => setActiveTab("bookmarks")}
        >
          Bookmarks ({bookmarks.length})
        </button>
        <button
          className={`tab-button ${activeTab === "notes" ? "active" : ""}`}
          onClick={() => setActiveTab("notes")}
        >
          Notes ({notes.length})
        </button>
      </div>

      <div className="panel-content">
        {activeTab === "highlights" && <HighlightsTab />}
        {activeTab === "bookmarks" && <BookmarksTab />}
        {activeTab === "notes" && <NotesTab />}
      </div>
    </div>
  );
};