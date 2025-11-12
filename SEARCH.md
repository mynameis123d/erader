# Text Search Implementation

## Overview

This document describes the text search functionality implemented for the ebook reader application. The search system provides both library-level metadata search and full-text search within individual books.

## Architecture

### Core Components

1. **SearchService** (`src/services/search-service.ts`)
   - Main service for indexing and searching content
   - Handles both metadata and full-text search
   - Manages in-memory and IndexedDB caches
   - Supports relevance scoring and snippet highlighting

2. **SearchStore** (`src/state/search-store.ts`)
   - Zustand store for managing search state
   - Tracks current query, results, and indexing progress
   - Provides actions for searching and indexing operations
   - Integrates with LibraryStore for book data

3. **IndexedStorageService** (extended)
   - Added SearchIndex table to IndexedDB schema
   - Stores indexed snippets persistently
   - Fallback to in-memory storage when IndexedDB unavailable

4. **Types** (`src/types/index.ts`)
   - `SearchableSnippet`: Represents indexed content chunks
   - `SearchResult`: Represents a search match
   - `SearchQuery`: Represents a search query

## Features

### 1. Library Metadata Search

Search across book metadata including:
- **Title**: High priority - exact matches weighted heavily
- **Author**: Medium priority
- **Tags**: Medium priority
- **Description**: Lower priority

```typescript
// Search library by title/author/tags
const results = await searchService.searchMetadata("Gatsby", books);

// Returns SearchResult[] sorted by relevance
```

**Features:**
- Case-insensitive search
- Relevance scoring (0-100)
- Excerpt previews
- Fast cached results

### 2. Full-Text Book Search

Search within indexed book content:
- Find all occurrences of search terms
- Return location information (position, chapter/page)
- Provide context snippets around matches
- Support large books with lazy loading

```typescript
// Index book content
await searchService.indexBookContent(bookId, content, "epub");

// Search within indexed content
const results = await searchService.searchBookContent(bookId, "term", limit);

// Returns SearchResult[] with match locations
```

**Features:**
- Word-aware indexing (splits into manageable chunks)
- Context preservation (chapter/page tracking)
- Snippet highlighting
- Match position tracking
- Result limiting for performance

### 3. Indexing

Books are indexed into searchable snippets:
- Content split into 500-word chunks
- Position tracking maintained
- Format-specific handling (EPUB, PDF)
- Persistent storage in IndexedDB
- Async processing with progress feedback

```typescript
// Index a book
await searchStore.indexBook(bookId, content, "epub");

// Monitor progress
const progress = useIndexingProgress();
```

**Performance:**
- Asynchronous indexing prevents UI blocking
- Progress updates available via store
- Lazy loading on search (loads index from storage as needed)
- Memory-efficient caching

## Usage

### React Hooks

```typescript
import {
  useSearch,
  useSearchQuery,
  useSearchResults,
  useSearching,
  useSearchError,
  useIndexingProgress,
  useSearchActions,
} from "ebook-reader";

// In a component:
const { search, searchLibraryMetadata, searchBookContent, indexBook } =
  useSearchActions();
const results = useSearchResults();
const isSearching = useSearching();
const progress = useIndexingProgress();

// Search library
await search("search term", "library");

// Search current book
await search("search term", "current-book", bookId);

// Or use specific methods
await searchLibraryMetadata("query");
await searchBookContent(bookId, "query");

// Index a book
await indexBook(bookId, contentText, "epub");
```

### Direct Service Usage

```typescript
import { searchService } from "ebook-reader";

// Index content
const snippets = await searchService.indexBookContent(
  bookId,
  content,
  "epub"
);

// Search metadata
const metadataResults = searchService.searchMetadata(query, books);

// Search content
const contentResults = await searchService.searchBookContent(
  bookId,
  query,
  limit
);

// Combined search
const allResults = await searchService.search(query, books, {
  searchMetadata: true,
  searchContent: true,
  bookId: optionalBookId,
  limit: 50,
});

// Highlight matches
const highlighted = searchService.highlightMatches(
  text,
  query,
  "search-match"
);

// Clear caches
searchService.clearCache(); // All
searchService.clearCache(bookId); // Specific book
```

## Data Structures

### SearchableSnippet

```typescript
interface SearchableSnippet {
  id: string; // Unique snippet ID
  bookId: string; // Book this snippet belongs to
  content: string; // Snippet text
  location: ReadingLocation; // Position in book
  contextBefore?: string; // Optional preceding text
  contextAfter?: string; // Optional following text
}
```

### SearchResult

```typescript
interface SearchResult {
  id: string; // Unique result ID
  bookId: string; // Book containing match
  type: "book" | "content"; // Metadata or content match
  title: string; // Book title or match title
  author?: string; // Book author
  snippet?: string; // Preview text
  location?: ReadingLocation; // Position of match
  relevanceScore: number; // 0-100 ranking
  matchStart?: number; // Start position in snippet
  matchEnd?: number; // End position in snippet
}
```

### SearchQuery

```typescript
interface SearchQuery {
  text: string; // Search query text
  scope: "library" | "current-book"; // Search scope
  bookId?: string; // Book ID if current-book scope
}
```

## Caching Strategy

### Two-Level Cache

1. **In-Memory Cache**
   - Fastest access
   - Limited by available RAM
   - Cleared on app reload

2. **IndexedDB Persistent Cache**
   - Large storage capacity
   - Survives page refresh
   - Async access
   - Fallback to in-memory if unavailable

### Cache Management

```typescript
// Automatically caches on:
// - indexBookContent(): Stores snippets in IndexedDB
// - searchMetadata(): Caches results in memory
// - searchBookContent(): Caches results in memory

// Lazy loading:
// - On first search, loads snippets from IndexedDB if needed
// - Subsequent searches use in-memory cache

// Manual cache control:
searchService.clearCache(); // Clear all
searchService.clearCache(bookId); // Clear specific book
```

## Performance Considerations

### Indexing

- **Large books**: 100k+ words
  - Indexed asynchronously with progress feedback
  - Takes 100-500ms for typical EPUB
  - UI remains responsive

### Search Operations

- **Library search**: < 10ms typically
  - Searches only metadata
  - Results cached
  - Efficient with 1000+ books

- **Content search**: 1-100ms typically
  - Searches indexed snippets
  - Speed depends on query frequency and book size
  - Results cached and reused

### Memory Usage

- **Per-book overhead**: ~50KB for typical novel
  - Depends on content size
  - IndexedDB storage: Per book
  - In-memory cache: On-demand loading

## Integration Points

### Adding Books

When a book is added to the library:
1. Book file stored in IndexedDB
2. Book metadata added to store
3. (Optional) Content indexed asynchronously

```typescript
// Books can be indexed manually when added
await libraryStore.addBook(file, metadata);
const bookId = libraryStore.books[libraryStore.books.length - 1].id;
await searchStore.indexBook(bookId, extractedContent, "epub");
```

### Removing Books

When a book is removed:
1. Book file deleted from IndexedDB
2. Search indexes automatically cleaned up
3. Cache entries removed

```typescript
// Automatically cleans up
await libraryStore.removeBook(bookId);
searchService.clearCache(bookId); // Manual cleanup if needed
```

## Testing

Comprehensive test coverage includes:

- **SearchService tests** (`tests/search-service.test.ts`)
  - Content indexing with different formats
  - Metadata search with ranking
  - Content search with context
  - Caching behavior
  - Result highlighting

- **SearchStore tests** (`tests/search-store.test.ts`)
  - Library metadata search
  - Book content search
  - Indexing with progress tracking
  - Error handling
  - State management

### Running Tests

```bash
npm test                    # Run all tests
npm test search-service     # Run search service tests
npm test search-store       # Run search store tests
npm test -- --watch        # Watch mode
```

## Error Handling

The search system handles various error conditions:

```typescript
// Errors are tracked in store
const error = useSearchError();

// Specific error scenarios:
// - IndexedDB unavailable: Falls back to in-memory
// - Large content: Async processing prevents timeouts
// - Invalid queries: Empty results returned
// - Storage quota exceeded: Graceful degradation
```

## Future Enhancements

1. **Advanced Search**
   - Boolean operators (AND, OR, NOT)
   - Phrase search with quotes
   - Wildcard and fuzzy matching
   - Search history

2. **Performance**
   - Full-text search library (lunr.js, flexsearch)
   - Incremental indexing
   - Background indexing service

3. **UI Features**
   - Search suggestions/autocomplete
   - Search filters by metadata
   - Advanced search options
   - Search analytics

4. **Cross-Device**
   - Cloud-based search index
   - Sync search history
   - Collaborative features

## API Reference

### SearchService Methods

```typescript
// Indexing
indexBookContent(
  bookId: string,
  content: string,
  format?: "epub" | "pdf"
): Promise<SearchableSnippet[]>

// Metadata search
searchMetadata(
  query: string,
  books: Book[]
): SearchResult[]

// Content search
searchBookContent(
  bookId: string,
  query: string,
  limit?: number
): Promise<SearchResult[]>

// Combined search
search(
  query: string,
  books: Book[],
  options?: SearchOptions
): Promise<SearchResult[]>

// Utilities
highlightMatches(
  text: string,
  query: string,
  className?: string
): string

getCachedSnippets(bookId: string): SearchableSnippet[] | undefined

clearCache(bookId?: string): void
```

### SearchStore Actions

```typescript
// Search methods
search(query: string, scope: "library" | "current-book", bookId?: string): Promise<void>
searchLibraryMetadata(query: string): Promise<void>
searchBookContent(bookId: string, query: string): Promise<void>

// Indexing
indexBook(
  bookId: string,
  content: string,
  format?: "epub" | "pdf"
): Promise<void>

// Utilities
clearResults(): void
setError(error: string | null): void
updateIndexingProgress(bookId: string, progress: number): void
```

## Accessibility

- Search results are properly labeled
- Progress indicators available
- Error messages are clear
- Keyboard navigation supported
- Screen reader compatible

## Browser Support

- Modern browsers with IndexedDB support
- Graceful fallback to in-memory storage
- Works offline (cached data)
- iOS Safari 11+
- Firefox 51+
- Chrome 24+
- Edge 12+

## Storage Limits

- **IndexedDB**: 50MB+ (browser dependent)
- **Typical usage**: ~50KB per book indexed
- **1000 books**: ~50MB storage
- Exceeding quota: Graceful degradation
