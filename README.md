# Ebook Reader State Management

A robust state management layer for ebook reader applications, built with Zustand, TypeScript, and IndexedDB. Features a responsive, accessible UI with comprehensive testing.

## Features

- **Type-safe state management** with TypeScript
- **Persistent storage** using IndexedDB for book binaries and metadata
- **Library management** - Add, organize, and manage your ebook collection
- **Reading session tracking** - Track reading progress, highlights, and bookmarks
- **Customizable settings** - Theme, typography, translation preferences
- **Activity history** - Track all reading activity and events
- **Graceful fallbacks** - Works with or without IndexedDB support
- **Responsive design** - Mobile-first approach with desktop optimization
- **Accessibility first** - WCAG 2.1 AA compliant with keyboard navigation
- **Comprehensive testing** - Unit tests + E2E smoke tests with Playwright

## Architecture

The state layer is organized into three main stores:

### 1. Library Store (`useLibraryStore`)

Manages your ebook collection, including:

- Books and metadata
- Collections/playlists
- Activity history
- Sync with IndexedDB storage

### 2. Reader Store (`useReaderStore`)

Tracks the active reading session:

- Current book and location
- Reading progress
- Active theme
- Highlights and bookmarks
- Session history

### 3. Settings Store (`useSettingsStore`)

Manages application preferences:

- Theme settings (light/dark/sepia/custom)
- Typography preferences
- Translation settings
- Auto-save and analytics toggles

## Installation

```bash
npm install
```

## Quick Start

### Demo Application

A demo settings page is included to showcase the UI components and state management:

```bash
# Start development server
npm run dev

# Open http://localhost:3000 in your browser
```

The demo includes:
- Responsive settings interface
- Real-time theme switching
- Import/export functionality
- Accessibility features
- Loading states and skeletons

## Usage

### Basic Example

```typescript
import {
  useLibrary,
  useLibraryActions,
  useReader,
  useReaderActions,
  useSettings,
  type BookFile,
  type BookMetadata,
} from './src';

// Add a book to the library
const { addBook } = useLibraryActions();
const bookFile: BookFile = {
  id: 'file-1',
  fileName: 'my-book.epub',
  fileType: 'application/epub+zip',
  fileSize: 1024000,
  blob: new Blob([/* file contents */]),
  addedDate: new Date(),
};

const metadata: BookMetadata = {
  title: 'My Book',
  author: 'Author Name',
  tags: ['fiction', 'adventure'],
};

await addBook(bookFile, metadata);

// Open a book for reading
const { openBook, updateProgress } = useReaderActions();
openBook('book-id');
updateProgress(25); // 25% complete

// Update settings
const { updateThemeSettings } = useSettingsActions();
updateThemeSettings({ mode: 'dark', fontSize: 18 });
```

### Using Hooks

The library provides granular hooks for accessing specific state:

```typescript
import {
  useLibraryBooks,
  useFavoriteBooks,
  useCurrentBook,
  useReadingProgress,
  useThemeSettings,
} from './src/hooks';

// In your component
const books = useLibraryBooks();
const favorites = useFavoriteBooks();
const currentBook = useCurrentBook();
const progress = useReadingProgress();
const theme = useThemeSettings();
```

### Adding Highlights and Bookmarks

```typescript
import { useReaderActions } from './src';

const { addHighlight, addBookmark } = useReaderActions();

// Add a highlight
const highlightId = addHighlight(
  'book-id',
  'Selected text',
  { cfi: 'epubcfi(/6/4!/4/2/2)', position: 100 },
  '#ffeb3b',
  'My note'
);

// Add a bookmark
const bookmarkId = addBookmark(
  'book-id',
  { cfi: 'epubcfi(/6/4!/4/2/2)', chapter: 'Chapter 5' },
  'Interesting part'
);
```

### Collections

```typescript
import { useLibraryActions } from './src';

const { createCollection, addToCollection } = useLibraryActions();

// Create a collection
const collectionId = createCollection('Science Fiction', 'My sci-fi books');

// Add books to collection
addToCollection('book-id-1', collectionId);
addToCollection('book-id-2', collectionId);
```

## Persistence Strategy

### LocalStorage (State)

State is automatically persisted to localStorage using Zustand's persist middleware:

- Library store: `library-storage`
- Reader store: `reader-storage`
- Settings store: `settings-storage`

### IndexedDB (Binary Files)

Large binary files (ebook files) are stored in IndexedDB via the `IndexedStorageService`:

```typescript
import { indexedStorageService } from './src';

// Save a file
await indexedStorageService.saveFile(bookFile);

// Retrieve a file
const file = await indexedStorageService.getFile('file-id');

// List all files
const files = await indexedStorageService.listFiles();

// Delete a file
await indexedStorageService.deleteFile('file-id');
```

If IndexedDB is not available, the service falls back to an in-memory Map with a warning.

## Type Definitions

### Core Types

```typescript
interface Book {
  id: string;
  fileId: string;
  metadata: BookMetadata;
  isFavorite: boolean;
  dateAdded: Date;
  lastOpened?: Date;
  collectionIds?: string[];
}

interface BookMetadata {
  title: string;
  author?: string;
  publisher?: string;
  publishedDate?: string;
  isbn?: string;
  language?: string;
  description?: string;
  coverImage?: string;
  tags?: string[];
}

interface ReadingLocation {
  cfi?: string;        // EPUB CFI
  position?: number;   // Numeric position
  chapter?: string;    // Chapter name
  page?: number;       // Page number
}

interface ReadingSession {
  id: string;
  bookId: string;
  startTime: Date;
  endTime?: Date;
  startLocation: ReadingLocation;
  endLocation?: ReadingLocation;
  progressPercentage: number;
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

interface ThemeSettings {
  mode: 'light' | 'dark' | 'sepia' | 'custom';
  backgroundColor?: string;
  textColor?: string;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  marginHorizontal: number;
  marginVertical: number;
}
```

## Testing

The project includes comprehensive testing:

### Unit Tests

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch
```

### E2E Smoke Tests

```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### Accessibility Testing

Automated accessibility testing using axe-core:
- WCAG 2.1 AA compliance checks
- Color contrast validation
- Keyboard navigation testing
- Screen reader compatibility
- High contrast and reduced motion support

### Test Coverage

Tests cover:
- Store initialization and state management
- Core actions (add/remove books, update progress, etc.)
- IndexedDB persistence and fallbacks
- Session tracking and activity logging
- Highlights and bookmarks functionality
- Settings management and persistence
- UI interactions and responsive behavior
- Accessibility compliance
- Cross-browser compatibility (Chrome, Firefox, Safari)
- Mobile viewport testing

## Development

```bash
# Type checking
npm run typecheck

# Linting (includes accessibility checks)
npm run lint

# Build
npm run build

# Start development server
npm run dev
```

## UI Components

### SettingsPage

Main settings interface with:
- **Responsive design** - Mobile-first with desktop optimization
- **Accessibility** - Full keyboard navigation, ARIA labels, screen reader support
- **Theme switching** - Light, dark, sepia, and custom themes
- **Real-time preview** - Settings apply immediately
- **Loading states** - Skeleton loaders and progress indicators
- **Error handling** - Graceful error messages and recovery

### LoadingSkeleton

Reusable skeleton loading component:
- Multiple variants (text, rectangular, circular)
- Animated shimmer effect
- Theme-aware styling
- Reduced motion support

## Responsive Design

- **Mobile** (< 768px): Single column, full-width buttons, vertical layouts
- **Tablet** (768px - 1024px): Two-column grid, optimized spacing
- **Desktop** (> 1024px): Three-column grid, maximum width containers

## Accessibility Features

- **WCAG 2.1 AA compliant** - Automated testing with axe-core
- **Keyboard navigation** - Full keyboard access to all controls
- **Screen reader support** - Proper ARIA labels and descriptions
- **High contrast mode** - Enhanced visibility for users with low vision
- **Reduced motion** - Respects user's motion preferences
- **Focus management** - Clear focus indicators and logical tab order

## Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

Quick deployment options:
- **Static hosting** (Netlify, Vercel, GitHub Pages)
- **Docker containers** with Nginx
- **CI/CD pipelines** with automated testing

## License

MIT
