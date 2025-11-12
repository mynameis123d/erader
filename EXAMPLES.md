# Usage Examples

This document provides comprehensive examples of how to use the ebook reader state management layer.

## Initialization

First, initialize the stores when your app starts:

```typescript
import { initializeStores, waitForHydration } from './src';

async function initApp() {
  // Initialize stores and rehydrate from localStorage
  await initializeStores();
  
  // Wait for settings to be hydrated
  await waitForHydration();
  
  console.log('App initialized and ready');
}

initApp();
```

## Library Management

### Adding Books

```typescript
import { useLibraryActions } from './src';

async function addBookToLibrary(file: File) {
  const { addBook } = useLibraryActions();
  
  // Create BookFile from File
  const bookFile = {
    id: crypto.randomUUID(),
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    blob: file,
    addedDate: new Date(),
  };
  
  // Extract or provide metadata
  const metadata = {
    title: file.name.replace(/\.[^/.]+$/, ''),
    author: 'Unknown',
    tags: ['imported'],
  };
  
  try {
    await addBook(bookFile, metadata);
    console.log('Book added successfully');
  } catch (error) {
    console.error('Failed to add book:', error);
  }
}
```

### Listing Books

```typescript
import { useLibraryBooks, useFavoriteBooks } from './src';

function BookList() {
  const books = useLibraryBooks();
  const favorites = useFavoriteBooks();
  
  console.log(`Total books: ${books.length}`);
  console.log(`Favorite books: ${favorites.length}`);
  
  books.forEach(book => {
    console.log(`${book.metadata.title} by ${book.metadata.author}`);
  });
}
```

### Managing Collections

```typescript
import { useLibraryActions, useLibraryCollections } from './src';

function manageCollections() {
  const { createCollection, addToCollection, removeFromCollection } = useLibraryActions();
  const collections = useLibraryCollections();
  
  // Create a collection
  const collectionId = createCollection(
    'Science Fiction',
    'My favorite sci-fi books'
  );
  
  // Add books to collection
  addToCollection('book-id-1', collectionId);
  addToCollection('book-id-2', collectionId);
  
  // Remove a book from collection
  removeFromCollection('book-id-1', collectionId);
  
  // List collections
  collections.forEach(collection => {
    console.log(`${collection.name}: ${collection.bookIds.length} books`);
  });
}
```

### Updating Book Metadata

```typescript
import { useLibraryActions, useBookById } from './src';

function updateBook(bookId: string) {
  const { updateMetadata, toggleFavorite } = useLibraryActions();
  const book = useBookById(bookId);
  
  if (!book) {
    console.error('Book not found');
    return;
  }
  
  // Update metadata
  updateMetadata(bookId, {
    author: 'J.R.R. Tolkien',
    tags: ['fantasy', 'classic'],
    description: 'An epic fantasy adventure',
  });
  
  // Toggle favorite
  toggleFavorite(bookId);
  
  console.log(`Updated book: ${book.metadata.title}`);
}
```

## Reading Experience

### Opening and Reading a Book

```typescript
import {
  useReaderActions,
  useCurrentBook,
  useReadingProgress,
  useIsReading,
} from './src';

function startReading(bookId: string) {
  const { openBook, updateLocation, updateProgress } = useReaderActions();
  
  // Open the book
  openBook(bookId);
  
  const currentBook = useCurrentBook();
  const progress = useReadingProgress();
  const isReading = useIsReading();
  
  console.log(`Reading: ${currentBook}`);
  console.log(`Progress: ${progress}%`);
  console.log(`Is reading: ${isReading}`);
}

function updateReading() {
  const { updateLocation, updateProgress } = useReaderActions();
  
  // Update location as user reads
  updateLocation({
    cfi: 'epubcfi(/6/4!/4/2/2)',
    position: 250,
    chapter: 'Chapter 5',
    page: 42,
  });
  
  // Update progress
  updateProgress(35); // 35% complete
}

function finishReading() {
  const { closeBook } = useReaderActions();
  
  // Close the book
  closeBook();
  
  console.log('Book closed, session ended');
}
```

### Managing Highlights

```typescript
import { useReaderActions, useBookHighlights } from './src';

function manageHighlights(bookId: string) {
  const {
    addHighlight,
    updateHighlight,
    removeHighlight,
  } = useReaderActions();
  
  const highlights = useBookHighlights(bookId);
  
  // Add a highlight
  const highlightId = addHighlight(
    bookId,
    'This is an important quote',
    { cfi: 'epubcfi(/6/4!/4/2/2)', position: 100 },
    '#ffeb3b', // Yellow
    'Remember this for later'
  );
  
  console.log(`Added highlight: ${highlightId}`);
  
  // Update highlight
  updateHighlight(highlightId, {
    color: '#ff0000', // Red
    note: 'Very important!',
  });
  
  // List highlights
  highlights.forEach(h => {
    console.log(`"${h.text}" - ${h.note}`);
  });
  
  // Remove highlight
  removeHighlight(highlightId);
}
```

### Managing Bookmarks

```typescript
import { useReaderActions, useBookBookmarks } from './src';

function manageBookmarks(bookId: string) {
  const { addBookmark, removeBookmark } = useReaderActions();
  const bookmarks = useBookBookmarks(bookId);
  
  // Add a bookmark
  const bookmarkId = addBookmark(
    bookId,
    { chapter: 'Chapter 10', position: 500 },
    'Plot twist!'
  );
  
  console.log(`Added bookmark: ${bookmarkId}`);
  
  // List bookmarks
  bookmarks.forEach(b => {
    console.log(`${b.label} - ${b.location.chapter}`);
  });
  
  // Remove bookmark
  removeBookmark(bookmarkId);
}
```

### Customizing Theme

```typescript
import { useReaderActions, useReaderTheme } from './src';

function customizeTheme() {
  const { setTheme } = useReaderActions();
  const currentTheme = useReaderTheme();
  
  console.log('Current theme:', currentTheme.mode);
  
  // Switch to dark mode
  setTheme({
    mode: 'dark',
    backgroundColor: '#1a1a1a',
    textColor: '#e0e0e0',
  });
  
  // Adjust typography
  setTheme({
    fontSize: 18,
    lineHeight: 1.8,
    fontFamily: 'Palatino, serif',
  });
  
  // Adjust margins
  setTheme({
    marginHorizontal: 40,
    marginVertical: 30,
  });
}
```

## Settings Management

### Theme Preferences

```typescript
import { useSettingsActions, useThemeSettings } from './src';

function manageThemeSettings() {
  const { updateThemeSettings } = useSettingsActions();
  const theme = useThemeSettings();
  
  console.log('Current theme:', theme);
  
  // Set default theme
  updateThemeSettings({
    mode: 'sepia',
    backgroundColor: '#f4ecd8',
    textColor: '#5f4b32',
    fontSize: 16,
    fontFamily: 'Georgia, serif',
    lineHeight: 1.6,
    textAlign: 'justify',
  });
}
```

### Translation Settings

```typescript
import { useSettingsActions, useTranslationSettings } from './src';

function configureTranslation() {
  const { updateTranslationSettings } = useSettingsActions();
  const translation = useTranslationSettings();
  
  console.log('Translation enabled:', translation.enabled);
  
  // Enable translation
  updateTranslationSettings({
    enabled: true,
    sourceLanguage: 'en',
    targetLanguage: 'es',
    provider: 'google',
  });
}
```

### App Preferences

```typescript
import { useSettingsActions, useSettings } from './src';

function managePreferences() {
  const { toggleAutoSave, toggleAnalytics, updateLastSync } = useSettingsActions();
  const settings = useSettings();
  
  console.log('Auto-save:', settings.autoSaveProgress);
  console.log('Analytics:', settings.enableAnalytics);
  
  // Toggle settings
  toggleAutoSave();
  toggleAnalytics();
  
  // Update sync timestamp
  updateLastSync();
  
  console.log('Last sync:', settings.lastSyncDate);
}
```

## Activity History

### Viewing Activity

```typescript
import { useLibraryActivity } from './src';

function viewActivity() {
  const activity = useLibraryActivity();
  
  // Get recent activity (last 10)
  const recentActivity = activity.slice(-10);
  
  recentActivity.forEach(entry => {
    const date = entry.timestamp.toLocaleDateString();
    console.log(`${date} - ${entry.type} - Book: ${entry.bookId}`);
    
    if (entry.details) {
      console.log('Details:', entry.details);
    }
  });
}

function filterActivity(bookId: string) {
  const activity = useLibraryActivity();
  
  // Get activity for specific book
  const bookActivity = activity.filter(entry => entry.bookId === bookId);
  
  console.log(`Found ${bookActivity.length} activities for book ${bookId}`);
}
```

## Storage Management

### Working with Files

```typescript
import { indexedStorageService } from './src';

async function manageFiles() {
  // List all files
  const files = await indexedStorageService.listFiles();
  console.log(`Total files: ${files.length}`);
  
  files.forEach(file => {
    const sizeMB = (file.fileSize / 1024 / 1024).toFixed(2);
    console.log(`${file.fileName} - ${sizeMB} MB`);
  });
  
  // Get a specific file
  const file = await indexedStorageService.getFile('file-id-123');
  if (file) {
    console.log('Retrieved file:', file.fileName);
    
    // Access the blob
    const blob = file.blob;
    const url = URL.createObjectURL(blob);
    console.log('Blob URL:', url);
  }
  
  // Delete a file
  await indexedStorageService.deleteFile('file-id-123');
  console.log('File deleted');
}
```

### Syncing Library with Storage

```typescript
import { useLibraryActions } from './src';

async function syncLibrary() {
  const { syncWithStorage } = useLibraryActions();
  
  try {
    await syncWithStorage();
    console.log('Library synced with storage');
  } catch (error) {
    console.error('Sync failed:', error);
  }
}
```

## Advanced Usage

### Subscribing to State Changes

```typescript
import { useLibraryStore, useReaderStore } from './src';

function setupListeners() {
  // Listen to library changes
  const unsubLibrary = useLibraryStore.subscribe(
    (state) => state.books,
    (books) => {
      console.log(`Library updated: ${books.length} books`);
    }
  );
  
  // Listen to progress changes
  const unsubProgress = useReaderStore.subscribe(
    (state) => state.progressPercentage,
    (progress) => {
      console.log(`Progress: ${progress}%`);
      
      // Auto-save every 10%
      if (progress % 10 === 0) {
        console.log('Auto-saving progress...');
      }
    }
  );
  
  // Cleanup
  return () => {
    unsubLibrary();
    unsubProgress();
  };
}
```

### Custom Selectors

```typescript
import { useLibraryStore, useReaderStore } from './src';

function useCustomSelectors() {
  // Get books by tag
  const scienceFictionBooks = useLibraryStore(state =>
    state.books.filter(book =>
      book.metadata.tags?.includes('science-fiction')
    )
  );
  
  // Get recently added books
  const recentBooks = useLibraryStore(state =>
    state.books
      .sort((a, b) => b.dateAdded.getTime() - a.dateAdded.getTime())
      .slice(0, 5)
  );
  
  // Get reading statistics
  const readingStats = useReaderStore(state => ({
    totalHighlights: state.highlights.length,
    totalBookmarks: state.bookmarks.length,
    totalSessions: state.sessionHistory.length,
    currentProgress: state.progressPercentage,
  }));
  
  return { scienceFictionBooks, recentBooks, readingStats };
}
```

### Batch Operations

```typescript
import { useLibraryStore } from './src';

async function batchAddBooks(files: File[]) {
  const addBook = useLibraryStore.getState().addBook;
  
  const results = await Promise.allSettled(
    files.map(async (file) => {
      const bookFile = {
        id: crypto.randomUUID(),
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        blob: file,
        addedDate: new Date(),
      };
      
      const metadata = {
        title: file.name.replace(/\.[^/.]+$/, ''),
      };
      
      return addBook(bookFile, metadata);
    })
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`Added ${successful} books, ${failed} failed`);
}
```

## Error Handling

```typescript
import { useLibraryStore, useLibraryError } from './src';

function handleErrors() {
  const error = useLibraryError();
  
  if (error) {
    console.error('Library error:', error);
    
    // Clear error
    useLibraryStore.getState().setError(null);
  }
}

async function safeAddBook(file: File) {
  try {
    const bookFile = {
      id: crypto.randomUUID(),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      blob: file,
      addedDate: new Date(),
    };
    
    await useLibraryStore.getState().addBook(bookFile, {
      title: file.name,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to add book:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

## Testing

### Testing Stores

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useLibraryStore } from './src';

describe('My Feature', () => {
  beforeEach(() => {
    // Reset store before each test
    useLibraryStore.getState().clearLibrary();
  });
  
  it('should add a book', async () => {
    const store = useLibraryStore.getState();
    
    const bookFile = {
      id: 'test-file-1',
      fileName: 'test.epub',
      fileType: 'application/epub+zip',
      fileSize: 1024,
      blob: new Blob(['test content']),
      addedDate: new Date(),
    };
    
    await store.addBook(bookFile, { title: 'Test Book' });
    
    expect(useLibraryStore.getState().books).toHaveLength(1);
  });
});
```

## Performance Tips

1. **Use specific hooks** instead of the full store to minimize re-renders:
   ```typescript
   // Good
   const books = useLibraryBooks();
   
   // Less optimal
   const { books } = useLibrary();
   ```

2. **Memoize selectors** for computed values:
   ```typescript
   const favoriteCount = useLibraryStore(
     useCallback(state => state.books.filter(b => b.isFavorite).length, [])
   );
   ```

3. **Debounce frequent updates**:
   ```typescript
   import { debounce } from 'lodash';
   
   const debouncedProgressUpdate = debounce(
     (progress) => useReaderStore.getState().updateProgress(progress),
     500
   );
   ```

4. **Batch state updates** when possible:
   ```typescript
   // Instead of multiple updates
   store.updateMetadata(id, { author: 'Author' });
   store.updateMetadata(id, { tags: ['tag1'] });
   
   // Do single update
   store.updateMetadata(id, { author: 'Author', tags: ['tag1'] });
   ```
