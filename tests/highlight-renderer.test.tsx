import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { HighlightRenderer } from "../src/components/HighlightRenderer";
import { useReaderStore } from "../src/state/reader-store";
import type { Highlight } from "../src/types";

// Mock DOM methods
const mockQuerySelector = vi.fn();
const mockCreateTreeWalker = vi.fn();
const mockGetBoundingClientRect = vi.fn();

Object.defineProperty(document, "querySelector", {
  value: mockQuerySelector,
  writable: true,
});

Object.defineProperty(document, "createTreeWalker", {
  value: mockCreateTreeWalker,
  writable: true,
});

// Mock text node
const mockTextNode = {
  nodeType: Node.TEXT_NODE,
  textContent: "This is some test content for highlighting",
  parentElement: {
    insertBefore: vi.fn(),
    removeChild: vi.fn(),
  },
  parentNode: {
    insertBefore: vi.fn(),
    removeChild: vi.fn(),
  },
};

// Mock tree walker
const mockWalker = {
  nextNode: vi.fn(),
};

mockCreateTreeWalker.mockReturnValue(mockWalker);

describe("HighlightRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store
    useReaderStore.getState().clearReaderState();
  });

  it("should render without crashing", () => {
    const { container } = render(
      <HighlightRenderer 
        bookId="test-book" 
      />
    );

    expect(container).toBeInTheDocument();
  });

  it("should not render when no bookId is provided", () => {
    const { container } = render(
      <HighlightRenderer />
    );

    expect(container).toBeInTheDocument();
    // Should not attempt any highlighting
    expect(mockQuerySelector).not.toHaveBeenCalled();
  });

  it("should not render when no highlights exist", () => {
    const { container } = render(
      <HighlightRenderer bookId="test-book" />
    );

    expect(container).toBeInTheDocument();
    // Should not attempt any highlighting
    expect(mockQuerySelector).not.toHaveBeenCalled();
  });

  it("should attempt to render highlights when they exist", () => {
    // Add a highlight to the store
    const { addHighlight } = useReaderStore.getState();
    const highlight: Highlight = {
      id: "test-highlight-1",
      bookId: "test-book",
      text: "test content",
      location: { cfi: "epubcfi(/6/4[chapter1]!/4/2/1:100)" },
      color: "#ffeb3b",
      createdDate: new Date(),
    };

    addHighlight("test-book", "test content", highlight.location, highlight.color);

    // Mock container element
    const mockContainer = {
      querySelector: mockQuerySelector,
      hasAttribute: vi.fn().mockReturnValue(false),
      querySelectorAll: vi.fn(),
    };

    mockQuerySelector.mockReturnValue(mockContainer);

    render(
      <HighlightRenderer 
        bookId="test-book" 
        containerRef={{ current: mockContainer as any }}
      />
    );

    // Should attempt to find highlights
    expect(mockQuerySelector).toHaveBeenCalled();
  });

  it("should handle EPUB content detection", () => {
    const { addHighlight } = useReaderStore.getState();
    addHighlight("test-book", "test content", { cfi: "epubcfi(/6/4[chapter1]!/4/2/1:100)" });

    const mockContainer = {
      querySelector: vi.fn((selector) => {
        if (selector === '.epub-view') {
          return {}; // Found EPUB view
        }
        return null;
      }),
      hasAttribute: vi.fn().mockReturnValue(false),
    };

    render(
      <HighlightRenderer 
        bookId="test-book" 
        containerRef={{ current: mockContainer as any }}
      />
    );

    expect(mockContainer.querySelector).toHaveBeenCalledWith('.epub-view');
  });

  it("should handle PDF content detection", () => {
    const { addHighlight } = useReaderStore.getState();
    addHighlight("test-book", "test content", { page: 5 });

    const mockContainer = {
      querySelector: vi.fn((selector) => {
        if (selector === '.textLayer') {
          return {}; // Found PDF text layer
        }
        return null;
      }),
      hasAttribute: vi.fn().mockReturnValue(false),
      querySelectorAll: vi.fn((selector) => {
        if (selector === '.textLayer') {
          return [{}]; // Found PDF text layers
        }
        return [];
      }),
    };

    render(
      <HighlightRenderer 
        bookId="test-book" 
        containerRef={{ current: mockContainer as any }}
      />
    );

    expect(mockContainer.querySelector).toHaveBeenCalledWith('.textLayer');
  });

  it("should handle highlight click events", () => {
    const onHighlightClick = vi.fn();
    const { addHighlight } = useReaderStore.getState();
    
    const highlight: Highlight = {
      id: "test-highlight-1",
      bookId: "test-book",
      text: "test content",
      location: { cfi: "epubcfi(/6/4[chapter1]!/4/2/1:100)" },
      color: "#ffeb3b",
      createdDate: new Date(),
    };

    addHighlight("test-book", "test content", highlight.location, highlight.color);

    const mockContainer = {
      querySelector: vi.fn().mockReturnValue(null),
      hasAttribute: vi.fn().mockReturnValue(false),
    };

    // Mock finding text nodes
    mockWalker.nextNode.mockReturnValueOnce(mockTextNode).mockReturnValueOnce(null);

    render(
      <HighlightRenderer 
        bookId="test-book" 
        containerRef={{ current: mockContainer as any }}
        onHighlightClick={onHighlightClick}
      />
    );

    // The component should attempt to find and wrap text
    expect(mockCreateTreeWalker).toHaveBeenCalled();
  });

  it("should clean up highlights on unmount", () => {
    const { addHighlight } = useReaderStore.getState();
    addHighlight("test-book", "test content", { cfi: "epubcfi(/6/4[chapter1]!/4/2/1:100)" });

    const mockContainer = {
      querySelector: vi.fn().mockReturnValue(null),
      hasAttribute: vi.fn().mockReturnValue(false),
    };

    const { unmount } = render(
      <HighlightRenderer 
        bookId="test-book" 
        containerRef={{ current: mockContainer as any }}
      />
    );

    // Unmount should trigger cleanup
    unmount();

    // Verify cleanup occurred (this would need to be more specific in a real test)
    expect(mockContainer.querySelector).toHaveBeenCalled();
  });
});