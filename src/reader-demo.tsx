import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { ReaderPage } from "./components/ReaderPage";
import { useLibraryStore } from "./state/library-store";
import { initializeStores, waitForHydration } from "./init";

const ReaderDemo: React.FC = () => {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const books = useLibraryStore((state) => state.books);
  const { addBook } = useLibraryStore();

  React.useEffect(() => {
    const initialize = async () => {
      await initializeStores();
      await waitForHydration();
      setIsInitialized(true);
    };
    initialize();
  }, []);

  const handleAddSampleBook = async (format: "epub" | "pdf") => {
    const sampleContent = `Sample ${format.toUpperCase()} content`;
    const blob = new Blob([sampleContent], {
      type: format === "epub" ? "application/epub+zip" : "application/pdf",
    });

    const fileId = crypto.randomUUID();

    await addBook(
      {
        id: fileId,
        fileName: `sample-book.${format}`,
        fileType: blob.type,
        fileSize: blob.size,
        blob,
        addedDate: new Date(),
      },
      {
        title: `Sample ${format.toUpperCase()} Book`,
        author: "Demo Author",
        description: `A sample ${format.toUpperCase()} book for testing the reader`,
      }
    );
  };

  if (!isInitialized) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Initializing...</h2>
      </div>
    );
  }

  if (selectedBookId) {
    return (
      <ReaderPage
        bookId={selectedBookId}
        onClose={() => setSelectedBookId(null)}
      />
    );
  }

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>E-Book Reader Demo</h1>
      <p>This demo showcases the ReaderPage component with EPUB and PDF support.</p>

      <div style={{ marginTop: "40px" }}>
        <h2>Library</h2>
        
        {books.length === 0 ? (
          <div style={{ 
            padding: "40px", 
            background: "#f5f5f5", 
            borderRadius: "8px",
            textAlign: "center",
          }}>
            <p>No books in library. Add a sample book to get started.</p>
            <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={() => handleAddSampleBook("epub")}
                style={{
                  padding: "12px 24px",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                Add Sample EPUB
              </button>
              <button
                onClick={() => handleAddSampleBook("pdf")}
                style={{
                  padding: "12px 24px",
                  background: "#059669",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                Add Sample PDF
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {books.map((book) => (
              <div
                key={book.id}
                style={{
                  padding: "20px",
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 8px 0" }}>{book.metadata.title}</h3>
                  {book.metadata.author && (
                    <p style={{ margin: 0, color: "#6b7280" }}>
                      by {book.metadata.author}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedBookId(book.id)}
                  style={{
                    padding: "10px 20px",
                    background: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Read
                </button>
              </div>
            ))}
            <button
              onClick={() => handleAddSampleBook("epub")}
              style={{
                padding: "12px 24px",
                background: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              Add Another Book
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: "60px", padding: "20px", background: "#f9fafb", borderRadius: "8px" }}>
        <h3>Features</h3>
        <ul>
          <li>EPUB and PDF rendering with format-specific viewers</li>
          <li>Table of contents navigation</li>
          <li>Progress tracking with visual slider</li>
          <li>Theme controls (light/dark/sepia modes)</li>
          <li>Typography settings (font size, family, line height)</li>
          <li>Reading session persistence</li>
          <li>Last position restoration</li>
          <li>Collapsible side panels for TOC and settings</li>
        </ul>
      </div>
    </div>
  );
};

const init = async () => {
  const root = document.getElementById("root");
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <ReaderDemo />
      </React.StrictMode>
    );
  }
};

init();
