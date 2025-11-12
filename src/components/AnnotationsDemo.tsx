import React, { useState, useRef } from "react";
import { Annotations } from "./Annotations";
import { useReaderActions } from "../hooks/useReader";
import type { ReadingLocation } from "../types";
import "./AnnotationsDemo.css";

export const AnnotationsDemo: React.FC = () => {
  const [currentBook, setCurrentBook] = useState<string | null>("demo-book-1");
  const [currentLocation, setCurrentLocation] = useState<ReadingLocation>({ position: 0 });
  const [showContent, setShowContent] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const { openBook, closeBook } = useReaderActions();

  const handleOpenBook = () => {
    openBook("demo-book-1");
    setCurrentLocation({ position: 0 });
  };

  const handleCloseBook = () => {
    closeBook();
    setCurrentBook(null);
  };

  const handleNavigateToLocation = (location: ReadingLocation) => {
    setCurrentLocation(location);
    
    // Simple scroll simulation for demo
    if (location.position !== undefined) {
      const scrollTarget = (location.position / 100) * document.body.scrollHeight;
      window.scrollTo({ top: scrollTarget, behavior: "smooth" });
    }

    // If it's a CFI, try to find and highlight the element
    if (location.cfi && contentRef.current) {
      const element = contentRef.current.querySelector(`[data-epub-cfi="${location.cfi}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    // If it's a page, simulate page navigation
    if (location.page !== undefined) {
      console.log(`Navigating to page ${location.page}`);
    }
  };

  const demoContent = `
    <h2 data-epub-cfi="epubcfi(/6/4[chap01]!/4/2/1:10)">Chapter 1: Introduction</h2>
    <p data-epub-cfi="epubcfi(/6/4[chap01]!/4/2/2:0)">
      Welcome to the annotations demo! This is a sample text that you can select and highlight. 
      Try selecting any portion of this text to create a highlight with a note.
    </p>
    <p data-epub-cfi="epubcfi(/6/4[chap01]!/4/2/3:0)">
      This is another paragraph with some interesting content. You can add bookmarks at specific locations 
      and navigate back to them later. The annotation system works with both EPUB and PDF formats.
    </p>
    <p data-epub-cfi="epubcfi(/6/4[chap01]!/4/2/4:0)">
      Here's some more text to practice highlighting. Select this text and try different highlight colors 
      like yellow, green, blue, pink, or orange. You can also add notes to your highlights to remember 
      why certain passages were important to you.
    </p>
    <h3 data-epub-cfi="epubcfi(/6/4[chap01]!/4/2/5:10)">Section 1.1: Features</h3>
    <p data-epub-cfi="epubcfi(/6/4[chap01]!/4/2/6:0)">
      The annotation system includes several key features:
    </p>
    <ul data-epub-cfi="epubcfi(/6/4[chap01]!/4/2/7:0)">
      <li>Text selection and highlighting</li>
      <li>Multiple highlight colors</li>
      <li>Adding notes to highlights</li>
      <li>Bookmarks with optional labels</li>
      <li>Side panel for managing annotations</li>
      <li>Persistent storage across sessions</li>
    </ul>
    <p data-epub-cfi="epubcfi(/6/4[chap01]!/4/2/8:0)">
      Try highlighting this list of features and add a note about which ones you find most useful!
    </p>
    <h3 data-epub-cfi="epubcfi(/6/4[chap01]!/4/2/9:10)">Section 1.2: Usage Tips</h3>
    <p data-epub-cfi="epubcfi(/6/4[chap01]!/4/2/10:0)">
      To get started with annotations:
    </p>
    <ol data-epub-cfi="epubcfi(/6/4[chap01]!/4/2/11:0)">
      <li>Select any text in this document</li>
      <li>Choose a highlight color from the popover</li>
      <li>Add an optional note</li>
      <li>Save the highlight</li>
      <li>Use the annotations panel (📝 button) to view all your annotations</li>
      <li>Click the bookmark button (🔖) to save your current location</li>
    </ol>
    <p data-epub-cfi="epubcfi(/6/4[chap01]!/4/2/12:0)">
      All annotations are automatically saved and will persist even if you refresh the page.
    </p>
  `;

  return (
    <div className="annotations-demo">
      <div className="demo-controls">
        <h1>Annotations Demo</h1>
        <div className="control-buttons">
          {!currentBook ? (
            <button onClick={handleOpenBook} className="primary-button">
              Open Demo Book
            </button>
          ) : (
            <>
              <button onClick={handleCloseBook} className="secondary-button">
                Close Book
              </button>
              <button 
                onClick={() => setShowContent(!showContent)} 
                className="secondary-button"
              >
                {showContent ? "Hide" : "Show"} Content
              </button>
            </>
          )}
        </div>
        
        {currentBook && (
          <div className="current-status">
            <p><strong>Current Book:</strong> {currentBook}</p>
            <p><strong>Current Location:</strong> {JSON.stringify(currentLocation)}</p>
          </div>
        )}
      </div>

      {currentBook && showContent && (
        <div className="demo-content" ref={contentRef}>
          <div 
            className="reader-content"
            dangerouslySetInnerHTML={{ __html: demoContent }}
          />
          
          <Annotations
            containerRef={contentRef}
            onNavigateToLocation={handleNavigateToLocation}
          />
        </div>
      )}

      {currentBook && (
        <div className="demo-instructions">
          <h3>How to Use Annotations:</h3>
          <ul>
            <li><strong>Select text:</strong> Click and drag to select any text in the content</li>
            <li><strong>Create highlight:</strong> After selecting text, choose a color and add a note</li>
            <li><strong>Add bookmark:</strong> Click the 🔖 button to bookmark your current location</li>
            <li><strong>View annotations:</strong> Click the 📝 button to open the annotations panel</li>
            <li><strong>Navigate:</strong> Click the arrow (→) next to any annotation to jump to that location</li>
            <li><strong>Edit/Delete:</strong> Use the annotations panel to manage your highlights and bookmarks</li>
          </ul>
        </div>
      )}
    </div>
  );
};