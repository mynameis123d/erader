# Ebook Reader State Management

A robust state management layer for ebook reader applications, built with Zustand, TypeScript, and IndexedDB.

## Features

- **Type-safe state management** with TypeScript
- **Persistent storage** using IndexedDB for book binaries and metadata
- **Library management** - Add, organize, and manage your ebook collection
- **Reading session tracking** - Track reading progress, highlights, and bookmarks
- **Customizable settings** - Theme, typography, translation preferences
- **Built-in translation service** - Translate selected text with multiple providers
- **Activity history** - Track all reading activity and events
- **Graceful fallbacks** - Works with or without IndexedDB support

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

### 4. Translation Store (`useTranslationStore`)

Manages translation functionality:

- Text selection and translation requests
- Translation history and caching
- UI state for tooltip and panel
- Integration with multiple translation providers

## Translation Service

The built-in translation service provides seamless text translation with support for multiple providers:

### Supported Providers

- **Google Translate** - Production-ready with API key
- **DeepL** - High-quality translations with API key  
- **LibreTranslate** - Self-hosted, privacy-focused
- **Mock** - For testing and development (no API key required)

### Features

- **Text selection integration** - Select text to translate with tooltip
- **Sentence boundary detection** - Automatically expands selection to full sentences
- **Secure API key storage** - Encrypted local storage with masking
- **Request caching** - Reduces API calls and improves performance
- **Rate limiting** - Prevents API abuse
- **Translation history** - Persistent history of recent translations
- **Multi-language support** - 10+ target languages
- **Offline testing** - Mock provider for development

### Basic Translation Usage

```typescript
import { useTextSelection, useTranslationStore, TranslationManager } from './src';

// Enable translation in your reader component
function Reader() {
  useTextSelection(); // Handle text selection
  
  return (
    <div>
      <div className="content">
        {/* Your reading content */}
      </div>
      <TranslationManager /> {/* Renders tooltip and panel */}
    </div>
  );
}

// Configure translation settings
const { updateTranslationSettings } = useSettingsStore();
updateTranslationSettings({
  enabled: true,
  provider: 'mock', // Use 'google', 'deepl', etc. for production
  targetLanguage: 'es',
  apiKey: 'your-api-key' // Optional for mock provider
});
```

## Installation

```bash
npm install
```

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

The project includes comprehensive unit tests:

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

Tests cover:
- Store initialization
- Core actions (add/remove books, update progress, etc.)
- IndexedDB persistence
- Session tracking
- Highlights and bookmarks
- Settings management

## Development

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Build
npm run build
```

## Browser Support

- Modern browsers with ES2022 support
- IndexedDB support (with graceful fallback)
- localStorage support (with in-memory fallback)

## License

MIT
