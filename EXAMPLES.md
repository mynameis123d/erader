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

## Settings Page Component

The library now includes a fully-featured settings page React component that provides a user interface for all settings management.

### Basic Usage

```typescript
import { SettingsPage } from './src/components';

function App() {
  return <SettingsPage />;
}
```

### With React Router

```typescript
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SettingsPage } from './src/components';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Features

The Settings Page includes:

1. **Appearance Settings**
   - Theme selection (Light, Dark, Sepia, Custom)
   - Font customization (family, size, line height)
   - Margin and alignment controls
   - Custom colors for custom theme

2. **Reading Settings**
   - Default page layout
   - Reading mode (paginated vs continuous)
   - History retention configuration
   - Page transitions toggle

3. **Translation Settings**
   - Enable/disable translation
   - Language preferences
   - Provider selection (Google, DeepL, Custom)
   - Secure API key input

4. **Data Management**
   - Export/import settings
   - Export/import library metadata
   - Reset to defaults (with confirmation)

5. **About Section**
   - App version
   - Last sync information

### Customization

You can customize the appearance by overriding the CSS:

```css
/* Override theme colors */
.theme-dark .settings-section {
  background: #1a1a1a;
  color: #ffffff;
}

/* Customize button styles */
.settings-page .btn-secondary {
  background: #your-color;
}
```

### Accessing Settings Programmatically

While the SettingsPage provides a UI, you can also manage settings programmatically:

```typescript
import { useSettingsActions } from './src/hooks';

function MyComponent() {
  const {
    updateThemeSettings,
    updateReadingSettings,
    updateTranslationSettings,
    exportSettings,
    importSettings,
    resetSettings,
  } = useSettingsActions();

  // Update theme
  const changeTheme = () => {
    updateThemeSettings({ mode: 'dark', fontSize: 18 });
  };

  // Export settings to file
  const backupSettings = () => {
    const json = exportSettings();
    // Save to file
    const blob = new Blob([json], { type: 'application/json' });
    // ... handle download
  };

  // Import settings from JSON
  const restoreSettings = (jsonString: string) => {
    try {
      importSettings(jsonString);
      console.log('Settings restored');
    } catch (error) {
      console.error('Failed to import settings');
    }
  };

  return (
    <div>
      <button onClick={changeTheme}>Dark Mode</button>
      <button onClick={backupSettings}>Backup</button>
    </div>
  );
}
```

### Export/Import Library Metadata

```typescript
import { useLibraryStore } from './src/state/library-store';

function BackupComponent() {
  const exportLibrary = useLibraryStore(state => state.exportLibraryMetadata);
  const importLibrary = useLibraryStore(state => state.importLibraryMetadata);

  const handleExport = () => {
    const json = exportLibrary();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'library-backup.json';
    a.click();
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const json = e.target?.result as string;
      importLibrary(json);
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <button onClick={handleExport}>Export Library</button>
      <input type="file" onChange={(e) => handleImport(e.target.files[0])} />
    </div>
  );
}
```

See `SETTINGS_PAGE.md` for detailed documentation of the Settings Page component.
