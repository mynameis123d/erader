# Annotations System

This document describes the annotations system implementation for the eBook reader application. The system supports highlights, bookmarks, and notes for both EPUB and PDF content.

## Features

### Core Functionality
- **Text Selection**: Select text in EPUB or PDF content to create annotations
- **Highlights**: Create colored highlights with optional notes
- **Bookmarks**: Save current reading location with optional labels
- **Notes**: Attach notes to highlights for context and thoughts
- **Side Panel**: Manage all annotations in a dedicated panel with tabs
- **Persistent Storage**: Annotations persist across browser sessions
- **Navigation**: Jump directly to annotation locations

### Highlight Features
- 5 color options: Yellow, Green, Blue, Pink, Orange
- Editable notes attached to highlights
- In-content rendering with hover effects
- Click-to-navigate functionality
- CRUD operations (Create, Read, Update, Delete)

### Bookmark Features
- Optional labels for easy identification
- Location preservation (CFI for EPUB, page number for PDF)
- Quick navigation from bookmarks panel
- Visual indicators in the UI

### Notes Features
- Dedicated notes tab showing all highlights with notes
- Full-text search capability
- Chronological ordering
- Context display with highlighted text

## Architecture

### Components

#### Core Components
- **`Annotations`**: Main orchestrator component
- **`AnnotationPopover`**: Modal for creating/editing highlights
- **`AnnotationsPanel`**: Side panel with tabs for managing annotations
- **`BookmarkButton`**: Button for adding bookmarks
- **`HighlightRenderer`**: Renders highlights back into content

#### Hooks
- **`useTextSelection`**: Generic text selection handling
- **`useEpubSelection`**: EPUB-specific selection with CFI support
- **`usePdfSelection`**: PDF-specific selection with page detection
- **`useReader`**: Access to reader store and actions

### State Management

The annotations system uses Zustand for state management with the following structure:

```typescript
interface ReaderState {
  highlights: Highlight[];
  bookmarks: Bookmark[];
  // ... other reader state
}

interface Highlight {
  id: string;
  bookId: string;
  text: string;
  location: ReadingLocation;
  color?: string;
  note?: string;
  createdDate: Date;
  updatedDate?: Date;
}

interface Bookmark {
  id: string;
  bookId: string;
  location: ReadingLocation;
  label?: string;
  createdDate: Date;
}

interface ReadingLocation {
  cfi?: string;        // EPUB CFI
  position?: number;    // Relative position (0-100)
  chapter?: string;    // Chapter name/identifier
  page?: number;        // Page number (PDF)
}
```

## Usage

### Basic Integration

```tsx
import { Annotations } from './components/Annotations';

function ReaderComponent() {
  const handleNavigateToLocation = (location) => {
    // Navigate to the annotation location
    // Implementation depends on your reader (epub.js, PDF.js, etc.)
  };

  return (
    <div className="reader-container">
      {/* Your reader content here */}
      
      <Annotations
        onNavigateToLocation={handleNavigateToLocation}
      />
    </div>
  );
}
```

### Advanced Usage with Custom Container

```tsx
import { Annotations } from './components/Annotations';
import { useRef } from 'react';

function ReaderComponent() {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleNavigateToLocation = (location) => {
    if (location.cfi) {
      // Navigate to EPUB CFI
      epub.rendition.display(location.cfi);
    } else if (location.page) {
      // Navigate to PDF page
      pdfViewer.currentPageNumber = location.page;
    }
  };

  return (
    <div className="reader-container">
      <div ref={contentRef} className="reader-content">
        {/* Your EPUB/PDF content rendered here */}
      </div>
      
      <Annotations
        containerRef={contentRef}
        onNavigateToLocation={handleNavigateToLocation}
      />
    </div>
  );
}
```

### EPUB Integration

```tsx
import { useEpubSelection } from './hooks/useEpubSelection';

function EpubReader({ book }) {
  const renditionRef = useRef();

  const handleAnnotationRequest = (
    selectedText,
    range,
    cfiRange,
    location,
    position
  ) => {
    // Create highlight with CFI-specific handling
    addHighlight(book.id, selectedText, location, '#ffeb3b');
  };

  const { setupEpubSelectionListeners } = useEpubSelection({
    onAnnotationRequest: handleAnnotationRequest,
  });

  useEffect(() => {
    const cleanup = setupEpubSelectionListeners();
    return cleanup;
  }, [setupEpubSelectionListeners]);

  // ... rest of EPUB reader implementation
}
```

### PDF Integration

```tsx
import { usePdfSelection } from './hooks/usePdfSelection';

function PdfReader({ document }) {
  const containerRef = useRef();

  const handleAnnotationRequest = (
    selectedText,
    range,
    pageNumber,
    location,
    position
  ) => {
    // Create highlight with page-specific handling
    addHighlight(document.id, selectedText, location, '#4caf50');
  };

  const { setupPdfSelectionListeners } = usePdfSelection({
    onAnnotationRequest: handleAnnotationRequest,
  });

  useEffect(() => {
    const cleanup = setupPdfSelectionListeners();
    return cleanup;
  }, [setupPdfSelectionListeners]);

  // ... rest of PDF reader implementation
}
```

## Data Format Support

### EPUB (CFI)
- **CFI Ranges**: Uses EPUB CFI (Canonical Fragment Identifier) for precise location
- **Data Attributes**: Expects `data-epub-cfi` attributes on content elements
- **Chapter Detection**: Supports `data-chapter` attributes for chapter information
- **Position Calculation**: Calculates relative position within chapters

### PDF (Page-based)
- **Page Numbers**: Extracts page numbers from various PDF viewer patterns
- **Text Layers**: Works with PDF.js text layers
- **Position Tracking**: Tracks relative position within pages
- **Page Attributes**: Supports `data-page-number`, `data-page` attributes

### Generic Fallback
- **DOM Traversal**: Falls back to DOM-based text searching
- **Viewport Position**: Uses scroll position for location
- **Content Matching**: Matches text content for highlight rendering

## Testing

The annotations system includes comprehensive tests:

```bash
# Run all tests
npm test

# Run specific test files
npm test annotations.test.ts
npm test reader-annotations.test.ts
npm test highlight-renderer.test.tsx
```

### Test Coverage
- Text selection handling
- Highlight creation, editing, and deletion
- Bookmark creation and deletion
- Data serialization/deserialization
- Component rendering and interaction
- EPUB and PDF-specific functionality

## Styling

The annotations system uses CSS modules for component styling and supports:

### Theme Support
- Light theme (default)
- Dark theme
- Custom theme variables

### Responsive Design
- Mobile-friendly popover positioning
- Adaptive panel sizing
- Touch gesture support

### CSS Variables
```css
:root {
  --font-family: "Georgia, serif";
  --bg-color: #ffffff;
  --text-color: #000000;
}
```

## Performance Considerations

### Optimization Strategies
- **Debounced Selection**: Prevents excessive calls during text selection
- **Efficient DOM Queries**: Uses specific selectors for content detection
- **Lazy Rendering**: Only renders highlights when book is loaded
- **Memory Management**: Proper cleanup of event listeners and DOM elements

### Best Practices
- Limit the number of highlights per page
- Use efficient text matching algorithms
- Implement virtual scrolling for large annotation lists
- Cache rendered highlight elements

## Browser Compatibility

### Supported Browsers
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Required Features
- ES2020 (for optional chaining and nullish coalescing)
- CSS Grid and Flexbox
- DOM Range API
- Local Storage or IndexedDB

## Future Enhancements

### Planned Features
- **Annotation Sharing**: Export/import annotations
- **Collaborative Annotations**: Real-time collaboration
- **Advanced Search**: Full-text search across annotations
- **Annotation Groups**: Organize annotations by topics
- **Drawing Tools**: Freehand annotations and shapes
- **Audio Notes**: Voice annotations for accessibility

### API Extensions
- Webhook support for annotation events
- REST API for external integrations
- Cloud synchronization services
- Annotation analytics and insights

## Troubleshooting

### Common Issues

#### Highlights Not Rendering
1. Check if `data-epub-cfi` attributes are present
2. Verify content container is properly referenced
3. Ensure text content matches exactly

#### Selection Not Working
1. Verify event listeners are properly set up
2. Check for CSS `user-select: none` conflicts
3. Ensure content is not in an iframe

#### Performance Issues
1. Limit number of highlights per page
2. Use virtual scrolling for annotation lists
3. Implement proper cleanup in useEffect

### Debug Mode
Enable debug logging by setting:
```javascript
localStorage.setItem('annotations-debug', 'true');
```

This will log detailed information about annotation creation, rendering, and navigation.