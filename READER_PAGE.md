# ReaderPage Component

## Overview

The `ReaderPage` component provides a complete reading interface for EPUB and PDF books with navigation controls, table of contents, progress tracking, and theme customization.

## Features

### Core Functionality

- **Format Support**: Renders both EPUB and PDF files using format-specific viewers
  - EPUB: Uses `epubjs` with paginated flow
  - PDF: Uses `pdf.js` with canvas rendering
- **Navigation**: Next/Previous page buttons and table of contents
- **Progress Tracking**: Visual progress slider and percentage indicator
- **Theme Controls**: Light/Dark/Sepia modes with font customization
- **Session Persistence**: Automatically saves and restores reading position
- **Offline Support**: Works without network connection once book is loaded

### User Interface

#### Top Toolbar
- **Back Button**: Returns to library/previous screen
- **Contents Button**: Opens table of contents sidebar
- **Book Title**: Displays current book title
- **Navigation**: Previous and Next page buttons
- **Progress**: Shows reading progress percentage
- **Settings Button**: Opens theme and typography controls

#### Side Panels (Collapsible)
- **Table of Contents**: 
  - Hierarchical navigation tree
  - Expandable sections
  - Click to jump to chapters
- **Theme Settings**:
  - Mode selector (Light/Dark/Sepia)
  - Font size slider (12-32px)
  - Line height slider (1.0-2.5)
  - Font family selector
  - Text alignment options
  - Margin controls

#### Bottom Progress Bar
- Interactive slider to jump to any position in the book
- Updates in real-time as you read

### Content Rendering

#### EPUB Rendering
```typescript
- Uses epubjs library
- Paginated display mode
- CFI (Canonical Fragment Identifier) for precise location tracking
- Theme overrides applied via CSS injection
- Automatic TOC extraction from book metadata
```

#### PDF Rendering
```typescript
- Uses pdf.js library
- Page-based navigation
- Canvas rendering with configurable scale
- Page-level TOC from PDF outline
- Supports PDF bookmarks and destinations
```

## Usage

### Basic Example

```tsx
import { ReaderPage } from "ebook-reader";

function App() {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  if (selectedBookId) {
    return (
      <ReaderPage
        bookId={selectedBookId}
        onClose={() => setSelectedBookId(null)}
      />
    );
  }

  return <LibraryView onBookSelect={setSelectedBookId} />;
}
```

### Props

```typescript
interface ReaderPageProps {
  bookId: string;      // ID of the book to display
  onClose: () => void; // Callback when user closes the reader
}
```

## State Management

The ReaderPage integrates with the following stores:

### ReaderStore
- `currentLocation`: Tracks position in book (CFI for EPUB, page for PDF)
- `progressPercentage`: Reading progress (0-100)
- `activeTheme`: Current theme settings
- `openBook()`: Starts a reading session
- `closeBook()`: Ends the session and logs activity
- `updateLocation()`: Updates current position
- `updateProgress()`: Updates progress percentage
- `setTheme()`: Changes theme settings

### LibraryStore
- Retrieves book metadata
- Loads book file from IndexedDB

## Navigation System

### Navigation Request Pattern

The component uses a request-response pattern for navigation:

```typescript
type NavigationRequest =
  | { type: "next" }    // Go to next page/section
  | { type: "prev" }    // Go to previous page/section
  | { type: "to"; location: ReadingLocation }; // Jump to specific location
```

This decouples UI controls from the renderer implementation.

### Location Tracking

```typescript
interface ReadingLocation {
  cfi?: string;      // EPUB location (Canonical Fragment Identifier)
  position?: number; // Position index
  chapter?: string;  // Chapter name
  page?: number;     // PDF page number
}
```

## Theme System

### Predefined Themes

```typescript
Light Mode:
  - Background: #ffffff
  - Text: #000000

Dark Mode:
  - Background: #1a1a1a
  - Text: #e5e5e5

Sepia Mode:
  - Background: #f4ecd8
  - Text: #5c4b37
```

### Custom Theme Settings

All theme properties are immediately applied via CSS custom properties:

```typescript
interface ThemeSettings {
  mode: "light" | "dark" | "sepia" | "custom";
  backgroundColor?: string;
  textColor?: string;
  fontSize: number;          // 12-32px
  fontFamily: string;        // Georgia, Arial, etc.
  lineHeight: number;        // 1.0-2.5
  textAlign: "left" | "center" | "right" | "justify";
  marginHorizontal: number;  // 0-100px
  marginVertical: number;    // 0-100px
}
```

## Session Tracking

Reading sessions are automatically tracked:

1. **Session Start**: When book is opened
   - Creates new `ReadingSession` with timestamp
   - Logs "opened" activity
   - Updates `lastOpened` in library

2. **During Reading**:
   - Location updates tracked
   - Progress updates logged
   - Session end location updated continuously

3. **Session End**: When book is closed
   - Finalizes session with end time and location
   - Logs completion or progress activity
   - Adds session to history

## Error Handling

The component includes comprehensive error handling:

### Loading Errors
- Book not found in library
- Book file missing in IndexedDB
- Invalid or corrupted book file
- Unsupported format

### Runtime Errors
- Navigation failures (caught and logged)
- Rendering errors (displayed to user)
- Theme application errors (graceful fallback)

### User Feedback
- Loading states with spinner
- Error messages with context
- Retry/back options

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Libraries loaded on-demand via dynamic imports
2. **Memoization**: Navigation handlers use `useCallback`
3. **Selective Updates**: Only affected components re-render on state changes
4. **Canvas Caching**: PDF pages rendered once and cached
5. **Theme Debouncing**: CSS updates batched for performance

### Memory Management

- Renditions properly cleaned up on unmount
- Canvas elements reused for PDF pages
- Event listeners removed when component unmounts

## Accessibility

- Keyboard navigation support (planned)
- ARIA labels on controls
- High contrast mode support
- Screen reader compatible (basic)

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires ES6 support
- IndexedDB required for offline storage
- Canvas API required for PDF rendering

## Known Limitations

1. **EPUB**: 
   - Fixed layout EPUBs may not render correctly
   - Some complex CSS may not be supported
   - Audio/video content not yet supported

2. **PDF**:
   - Interactive forms not supported
   - Annotations display only (not editable)
   - Large PDFs may be memory intensive

3. **General**:
   - No split-screen reading mode yet
   - No text-to-speech integration
   - No annotation tools in this version

## Future Enhancements

- [ ] Keyboard shortcuts
- [ ] Touch gestures for mobile
- [ ] Annotation and highlighting tools
- [ ] Text selection and copying
- [ ] Search within book
- [ ] Bookmarking from reader
- [ ] Dictionary lookup
- [ ] Translation integration
- [ ] Text-to-speech
- [ ] Reading statistics
- [ ] Page flip animations

## Testing

See `tests/` directory for unit tests. The reader is tested in isolation with mocked file loading and rendering libraries.

## Demo

A complete demo is available in `src/reader-demo.tsx` showing:
- Library management
- Book selection
- Reader view with all features
- Sample EPUB and PDF books

Run the demo:
```bash
npm run dev
```

## Dependencies

- `epubjs`: ^0.3.93 - EPUB rendering
- `pdfjs-dist`: ^5.4.394 - PDF rendering
- `react`: ^18.2.0 - UI framework
- `zustand`: ^4.4.7 - State management
- `dexie`: ^3.2.4 - IndexedDB wrapper

## License

MIT
