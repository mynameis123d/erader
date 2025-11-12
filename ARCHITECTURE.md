# State Architecture and Persistence Strategy

## Overview

This document describes the state management architecture for the ebook reader application. The architecture is designed to be robust, type-safe, and performant while handling both transient UI state and persistent data.

## Architecture Principles

1. **Separation of Concerns**: State is organized into three distinct stores (Library, Reader, Settings)
2. **Type Safety**: All state and actions are fully typed with TypeScript
3. **Persistence**: Critical data is automatically persisted with appropriate storage mechanisms
4. **Graceful Degradation**: The system works even when persistence mechanisms are unavailable
5. **Developer Experience**: Zustand provides a simple, hook-based API with minimal boilerplate

## Store Architecture

### 1. Library Store

**Purpose**: Manages the complete ebook library including books, collections, and activity history.

**State:**
```typescript
{
  books: Book[];              // All books in library
  collections: Collection[];  // Organized collections
  activity: ActivityHistoryEntry[];  // User activity log
  isLoading: boolean;        // Loading state
  error: string | null;      // Error messages
}
```

**Key Actions:**
- `addBook(file, metadata)` - Adds a book and stores file in IndexedDB
- `removeBook(bookId)` - Removes book and deletes associated file
- `updateMetadata(bookId, metadata)` - Updates book metadata
- `toggleFavorite(bookId)` - Toggles favorite status
- `createCollection(name, description)` - Creates a new collection
- `addToCollection(bookId, collectionId)` - Adds book to collection
- `syncWithStorage()` - Syncs state with IndexedDB files
- `logActivity(entry)` - Logs user activity

**Persistence:**
- Books and collections are persisted to localStorage via Zustand persist middleware
- Book files (binaries) are stored in IndexedDB via IndexedStorageService
- Activity history is persisted with the store

### 2. Reader Store

**Purpose**: Manages the active reading session including location, progress, annotations, and theme.

**State:**
```typescript
{
  currentBookId: string | null;      // Active book
  currentLocation: ReadingLocation | null;  // Current position
  progressPercentage: number;        // Reading progress (0-100)
  activeTheme: ThemeSettings;        // Current theme
  currentSelection: string | null;   // Selected text
  currentSession: ReadingSession | null;  // Active session
  highlights: Highlight[];           // All highlights
  bookmarks: Bookmark[];             // All bookmarks
  sessionHistory: ReadingSession[];  // Past sessions
  history: ActivityHistoryEntry[];   // Reader activity
  isReading: boolean;               // Reading state
}
```

**Key Actions:**
- `openBook(bookId)` - Opens a book and starts a session
- `closeBook()` - Closes book and ends session
- `updateLocation(location)` - Updates reading position
- `updateProgress(percentage)` - Updates progress and logs activity
- `setTheme(theme)` - Updates theme settings
- `addHighlight(bookId, text, location, color, note)` - Creates highlight
- `addBookmark(bookId, location, label)` - Creates bookmark
- `startSession(bookId, location)` - Starts reading session
- `endSession(endLocation)` - Ends session and logs completion

**Persistence:**
- Current book, location, progress, theme, highlights, and bookmarks are persisted to localStorage
- Session history and activity are not persisted (can be added if needed)

**Activity Tracking:**
- Opening a book logs an "opened" activity to both stores
- Progress updates are logged with percentage details
- Session completion logs "progress" or "completed" based on percentage

### 3. Settings Store

**Purpose**: Manages application-wide settings and preferences.

**State:**
```typescript
{
  settings: {
    theme: ThemeSettings;              // Default theme
    translation: TranslationSettings;  // Translation config
    autoSaveProgress: boolean;         // Auto-save toggle
    enableAnalytics: boolean;          // Analytics toggle
    lastSyncDate?: Date;              // Last sync timestamp
  };
  isHydrated: boolean;  // Hydration state for initialization
}
```

**Key Actions:**
- `updateThemeSettings(theme)` - Updates default theme
- `updateTranslationSettings(translation)` - Updates translation config
- `toggleAutoSave()` - Toggles auto-save
- `toggleAnalytics()` - Toggles analytics
- `updateLastSync()` - Updates sync timestamp
- `resetSettings()` - Resets to defaults

**Persistence:**
- All settings are persisted to localStorage
- Hydration state is tracked for initialization

## Persistence Strategy

### LocalStorage (via Zustand Persist)

Used for state that needs to be persisted but is relatively small:

**Advantages:**
- Simple API
- Automatic serialization/deserialization
- Good for text-based data
- Synchronous access

**Limitations:**
- Size limit (~5-10MB depending on browser)
- Slower for large data
- No support for complex queries

**What's stored:**
- Book metadata and references
- Collections
- Reading progress and locations
- Highlights and bookmarks
- Settings

### IndexedDB (via Dexie)

Used for large binary files and structured data:

**Advantages:**
- Large storage capacity (hundreds of MB to GB)
- Efficient for binary data
- Supports indexing and queries
- Asynchronous API

**What's stored:**
- Book files (EPUB, PDF, etc.)
- Large blobs

**Implementation:**
```typescript
class LibraryDatabase extends Dexie {
  public files!: Table<StoredBookFile, string>;
  
  constructor(name: string) {
    super(name);
    this.version(1).stores({
      files: '&id, fileName, fileType',
    });
  }
}
```

### Graceful Fallback

If IndexedDB is unavailable:
- Falls back to in-memory Map
- Warns user (except in tests)
- Allows app to continue functioning
- Data lost on page refresh

If localStorage is unavailable:
- Zustand persist middleware provides in-memory fallback
- State works but isn't persisted

## Hooks API

### Library Hooks

```typescript
useLibrary()              // Full store
useLibraryBooks()         // All books
useLibraryCollections()   // All collections
useLibraryActivity()      // Activity history
useLibraryActions()       // All actions
useBookById(id)           // Single book
useFavoriteBooks()        // Favorite books
useCollectionBooks(id)    // Books in collection
```

### Reader Hooks

```typescript
useReader()               // Full store
useCurrentBook()          // Current book ID
useCurrentLocation()      // Current location
useReadingProgress()      // Progress percentage
useReaderTheme()          // Active theme
useReaderSession()        // Current session
useReaderActions()        // All actions
useBookHighlights(id)     // Highlights for book
useBookBookmarks(id)      // Bookmarks for book
```

### Settings Hooks

```typescript
useSettings()             // All settings
useThemeSettings()        // Theme settings
useTranslationSettings()  // Translation settings
useSettingsActions()      // All actions
useSettingsHydration()    // Hydration status
```

## Initialization Flow

1. **App starts** → `initializeStores()` is called
2. **Rehydration** → Stores load from localStorage
3. **Sync** → Library syncs with IndexedDB files
4. **Hydration complete** → `isHydrated` becomes true
5. **App ready** → UI can safely access state

```typescript
import { initializeStores, waitForHydration } from './src';

async function bootstrap() {
  await initializeStores();
  await waitForHydration();
  // Now safe to render app
}
```

## Data Flow

### Adding a Book

```
User uploads file
    ↓
BookFile created with Blob
    ↓
addBook(file, metadata) called
    ↓
File saved to IndexedDB ←─┐
    ↓                      │
Book record created        │
    ↓                      │
Book added to store        │
    ↓                      │
Store persisted to localStorage
    ↓
Activity logged
```

### Reading a Book

```
User opens book
    ↓
openBook(bookId) called
    ↓
Reading session started
    ↓
Activity logged (opened)
    ↓
lastOpened updated in library
    ↓
User reads ←─────────┐
    ↓                │
Location updates     │
    ↓                │
Progress updates     │
    ↓                │
Activity logged ─────┘
    ↓
User closes book
    ↓
closeBook() called
    ↓
Session ended
    ↓
Activity logged (progress/completed)
    ↓
Session added to history
```

## Best Practices

1. **Use granular hooks** - Subscribe only to needed state to minimize re-renders
2. **Handle async carefully** - Storage operations are async and may fail
3. **Validate data** - Check types when loading from persistence
4. **Clean up** - Remove orphaned files when deleting books
5. **Test fallbacks** - Ensure app works without persistence
6. **Optimize storage** - Don't store computed values
7. **Monitor size** - Keep localStorage under limits

## Performance Considerations

- **Selective persistence**: Not all state is persisted (e.g., `isLoading`, `currentSelection`)
- **Debouncing**: Progress updates could be debounced to reduce persistence writes
- **Lazy loading**: Files are loaded from IndexedDB only when needed
- **Selective subscriptions**: Hooks allow components to subscribe to specific slices
- **Immutable updates**: Zustand uses immer for efficient updates

## Future Enhancements

1. **Sync service** - Cloud sync for cross-device access
2. **Compression** - Compress stored data to save space
3. **Encryption** - Encrypt sensitive data
4. **Indexing** - Add more indexes for faster queries
5. **Migration** - Versioned migrations for schema changes
6. **Offline support** - Service worker integration
7. **Conflict resolution** - Handle concurrent updates
8. **Quota management** - Monitor and manage storage quotas
