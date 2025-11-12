import React, { useEffect, useState, useCallback } from "react";
import { ContentRenderer } from "./ContentRenderer";
import { useReaderStore } from "../state/reader-store";
import { useLibraryStore } from "../state/library-store";
import { indexedStorageService } from "../services/indexed-storage-service";
import type {
  BookFormat,
  TableOfContentsItem,
  ThemeSettings,
  ReadingLocation,
} from "../types";
import "./ReaderPage.css";

interface ReaderPageProps {
  bookId: string;
  onClose: () => void;
}

export const ReaderPage: React.FC<ReaderPageProps> = ({ bookId, onClose }) => {
  const {
    currentLocation,
    progressPercentage,
    activeTheme,
    openBook,
    closeBook,
    updateLocation,
    updateProgress,
    setTheme,
  } = useReaderStore();

  const book = useLibraryStore((state) =>
    state.books.find((b) => b.id === bookId)
  );

  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [bookFormat, setBookFormat] = useState<BookFormat>("unknown");
  const [toc, setToc] = useState<TableOfContentsItem[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [navigationRequest, setNavigationRequest] = useState<
    | { type: "next" }
    | { type: "prev" }
    | { type: "to"; location: ReadingLocation }
    | null
  >(null);

  useEffect(() => {
    const loadBookFile = async () => {
      if (!book) {
        setError("Book not found");
        setIsLoading(false);
        return;
      }

      try {
        const bookFile = await indexedStorageService.getFile(book.fileId);
        if (!bookFile) {
          setError("Book file not found");
          return;
        }

        setFileBlob(bookFile.blob);

        const format = bookFile.fileType.includes("epub")
          ? "epub"
          : bookFile.fileType.includes("pdf")
          ? "pdf"
          : "unknown";

        setBookFormat(format);
        openBook(bookId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load book");
      } finally {
        setIsLoading(false);
      }
    };

    loadBookFile();

    return () => {
      closeBook();
    };
  }, [bookId, book, openBook, closeBook]);

  const handleLocationChange = useCallback(
    (location: any) => {
      updateLocation(location);
    },
    [updateLocation]
  );

  const handleProgressChange = useCallback(
    (percentage: number) => {
      updateProgress(percentage);
    },
    [updateProgress]
  );

  const handleTocLoaded = useCallback((tocItems: TableOfContentsItem[]) => {
    setToc(tocItems);
  }, []);

  const handleTocItemClick = (item: TableOfContentsItem) => {
    const location: ReadingLocation = item.location || { cfi: item.href };
    if (!location.cfi && !location.page) {
      return;
    }
    setNavigationRequest({ type: "to", location });
    setShowToc(false);
  };

  const handleNavigationHandled = useCallback(() => {
    setNavigationRequest(null);
  }, []);

  const handleNextPage = useCallback(() => {
    setNavigationRequest({ type: "next" });
  }, []);

  const handlePrevPage = useCallback(() => {
    setNavigationRequest({ type: "prev" });
  }, []);

  const handleClose = () => {
    closeBook();
    onClose();
  };

  const handleThemeChange = (updates: Partial<ThemeSettings>) => {
    setTheme(updates);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (!root) return;

    const background = activeTheme.backgroundColor || "#f5f5f5";
    const foreground = activeTheme.textColor || "#1f2933";

    root.style.setProperty("--reader-background", background);
    root.style.setProperty("--reader-foreground", foreground);
    root.style.setProperty("--reader-font-family", activeTheme.fontFamily);
    root.style.setProperty("--reader-line-height", `${activeTheme.lineHeight}`);
  }, [activeTheme]);

  if (isLoading) {
    return (
      <div className="reader-page">
        <div className="reader-loading">
          <div>Loading book...</div>
        </div>
      </div>
    );
  }

  if (error || !fileBlob) {
    return (
      <div className="reader-page">
        <div className="reader-error">
          <h2>Error</h2>
          <p>{error || "Failed to load book"}</p>
          <button onClick={handleClose}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="reader-page">
      <div className="reader-toolbar">
        <div className="toolbar-left">
          <button onClick={handleClose} className="toolbar-button" title="Back">
            ← Back
          </button>
          <button
            onClick={() => setShowToc(!showToc)}
            className="toolbar-button"
            title="Table of Contents"
          >
            ☰ Contents
          </button>
        </div>

        <div className="toolbar-center">
          <h2 className="book-title">{book?.metadata.title || "Reader"}</h2>
        </div>

        <div className="toolbar-right">
          <button
            onClick={handlePrevPage}
            className="toolbar-button"
            title="Previous Page"
          >
            ← Prev
          </button>
          <span className="progress-text">{progressPercentage}%</span>
          <button
            onClick={handleNextPage}
            className="toolbar-button"
            title="Next Page"
          >
            Next →
          </button>
          <button
            onClick={() => setShowThemePanel(!showThemePanel)}
            className="toolbar-button"
            title="Theme Settings"
          >
            ⚙ Settings
          </button>
        </div>
      </div>

      <div className="reader-content-wrapper">
        {showToc && (
          <div className="reader-sidebar toc-panel">
            <div className="panel-header">
              <h3>Table of Contents</h3>
              <button onClick={() => setShowToc(false)} className="close-button">
                ✕
              </button>
            </div>
            <div className="toc-list">
              {toc.length === 0 ? (
                <p className="empty-message">No table of contents available</p>
              ) : (
                toc.map((item) => (
                  <TocItem
                    key={item.id}
                    item={item}
                    onClick={handleTocItemClick}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {showThemePanel && (
          <div className="reader-sidebar theme-panel">
            <div className="panel-header">
              <h3>Reading Settings</h3>
              <button
                onClick={() => setShowThemePanel(false)}
                className="close-button"
              >
                ✕
              </button>
            </div>
            <ThemeControls theme={activeTheme} onChange={handleThemeChange} />
          </div>
        )}

        <div className="reader-content">
          <ContentRenderer
            bookId={bookId}
            fileBlob={fileBlob}
            format={bookFormat}
            location={currentLocation}
            theme={activeTheme}
            navigationRequest={navigationRequest}
            onNavigationHandled={handleNavigationHandled}
            onLocationChange={handleLocationChange}
            onProgressChange={handleProgressChange}
            onTocLoaded={handleTocLoaded}
            onError={(err) => setError(err.message)}
          />
        </div>
      </div>

      <div className="reader-progress-bar">
        <input
          type="range"
          min="0"
          max="100"
          value={progressPercentage}
          onChange={(e) => {
            const percentage = Number(e.target.value);
            updateProgress(percentage);
          }}
          className="progress-slider"
        />
      </div>
    </div>
  );
};

const TocItem: React.FC<{
  item: TableOfContentsItem;
  onClick: (item: TableOfContentsItem) => void;
  level?: number;
}> = ({ item, onClick, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubitems = item.subitems && item.subitems.length > 0;

  return (
    <div className="toc-item">
      <div
        className="toc-item-content"
        style={{ paddingLeft: `${level * 16}px` }}
      >
        {hasSubitems && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="toc-expand-button"
          >
            {isExpanded ? "▼" : "▶"}
          </button>
        )}
        <button onClick={() => onClick(item)} className="toc-item-button">
          {item.label}
        </button>
      </div>
      {hasSubitems && isExpanded && (
        <div className="toc-subitems">
          {item.subitems!.map((subitem) => (
            <TocItem
              key={subitem.id}
              item={subitem}
              onClick={onClick}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ThemeControls: React.FC<{
  theme: ThemeSettings;
  onChange: (updates: Partial<ThemeSettings>) => void;
}> = ({ theme, onChange }) => {
  return (
    <div className="theme-controls">
      <div className="control-group">
        <label>Theme Mode</label>
        <div className="button-group">
          <button
            onClick={() => onChange({ mode: "light", backgroundColor: "#ffffff", textColor: "#000000" })}
            className={theme.mode === "light" ? "active" : ""}
          >
            Light
          </button>
          <button
            onClick={() => onChange({ mode: "dark", backgroundColor: "#1a1a1a", textColor: "#e5e5e5" })}
            className={theme.mode === "dark" ? "active" : ""}
          >
            Dark
          </button>
          <button
            onClick={() => onChange({ mode: "sepia", backgroundColor: "#f4ecd8", textColor: "#5c4b37" })}
            className={theme.mode === "sepia" ? "active" : ""}
          >
            Sepia
          </button>
        </div>
      </div>

      <div className="control-group">
        <label>Font Size: {theme.fontSize}px</label>
        <input
          type="range"
          min="12"
          max="32"
          value={theme.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
        />
      </div>

      <div className="control-group">
        <label>Line Height: {theme.lineHeight}</label>
        <input
          type="range"
          min="1.0"
          max="2.5"
          step="0.1"
          value={theme.lineHeight}
          onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
        />
      </div>

      <div className="control-group">
        <label>Font Family</label>
        <select
          value={theme.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
        >
          <option value="Georgia, serif">Georgia</option>
          <option value="'Times New Roman', serif">Times New Roman</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="Helvetica, sans-serif">Helvetica</option>
          <option value="'Courier New', monospace">Courier New</option>
        </select>
      </div>

      <div className="control-group">
        <label>Text Align</label>
        <div className="button-group">
          <button
            onClick={() => onChange({ textAlign: "left" })}
            className={theme.textAlign === "left" ? "active" : ""}
          >
            Left
          </button>
          <button
            onClick={() => onChange({ textAlign: "justify" })}
            className={theme.textAlign === "justify" ? "active" : ""}
          >
            Justify
          </button>
          <button
            onClick={() => onChange({ textAlign: "center" })}
            className={theme.textAlign === "center" ? "active" : ""}
          >
            Center
          </button>
        </div>
      </div>

      <div className="control-group">
        <label>Margins (Horizontal): {theme.marginHorizontal}px</label>
        <input
          type="range"
          min="0"
          max="100"
          value={theme.marginHorizontal}
          onChange={(e) => onChange({ marginHorizontal: Number(e.target.value) })}
        />
      </div>

      <div className="control-group">
        <label>Margins (Vertical): {theme.marginVertical}px</label>
        <input
          type="range"
          min="0"
          max="100"
          value={theme.marginVertical}
          onChange={(e) => onChange({ marginVertical: Number(e.target.value) })}
        />
      </div>
    </div>
  );
};
