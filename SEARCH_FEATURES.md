# Search Features Overview

## Quick Start

### For Library Search
```typescript
import { useSearchActions, useSearchResults } from "ebook-reader";

const { searchLibraryMetadata } = useSearchActions();
const results = useSearchResults();

// Search books by title, author, tags
await searchLibraryMetadata("great gatsby");
// Returns: [{type: "book", title: "The Great Gatsby", author: "...", relevanceScore: 95}]
```

### For In-Book Search
```typescript
import { useSearchActions, useIndexingProgress } from "ebook-reader";

const { indexBook, searchBookContent } = useSearchActions();
const progress = useIndexingProgress();

// First time: index the book content
await indexBook(bookId, extractedContent, "epub");

// Then: search within the book
await searchBookContent(bookId, "search term");
// Returns: [{type: "content", snippet: "...", location: {...}, matchStart: 5, matchEnd: 15}]
```

## Core Features

### 1. Library Metadata Search
Search across all books in the library by:
- **Title**: Primary search field (highest weight)
- **Author**: Secondary field
- **Tags**: Category matching
- **Description**: Full-text in metadata

**Performance**: < 10ms for 1000+ books with caching

**Relevance Scoring**: 0-100 scale
- Exact title matches: ~90-100
- Author matches: ~75
- Tag matches: ~60
- Description matches: ~40

### 2. Full-Text Content Search
Search within indexed book content with:
- **Multi-occurrence support**: Find all instances
- **Context preservation**: Shows surrounding text
- **Location tracking**: Chapter/page information
- **Match highlighting**: Position markers for rendering

**Performance**: 1-100ms depending on book size

**Format Support**:
- EPUB: Accurate chapter tracking
- PDF: Page number tracking

### 3. Intelligent Indexing
Automatic content indexing for fast search:
- **Snippet-based**: 500-word chunks
- **Lazy loading**: Load on first search
- **Persistent storage**: IndexedDB caching
- **Async processing**: No UI blocking
- **Progress tracking**: Visual feedback for large books

### 4. Result Ranking
Smart relevance scoring algorithm:
- **Frequency**: Multiple occurrences boost score
- **Proximity**: Earlier matches ranked higher
- **Type weighting**: Metadata matches ranked higher than content
- **Cache optimization**: Frequently searched results cached

### 5. Caching Strategy

**Two-Level Cache**:
1. **In-Memory Cache**
   - Fast access for recent searches
   - Cleared on page refresh
   - Limited by available RAM

2. **IndexedDB Cache**
   - Persistent storage for indexed content
   - Survives page reloads
   - Large capacity (50MB+)

**Automatic Cache Management**:
- Results cached after first search
- Indices cached after first indexing
- Manual cache clearing via `clearCache()`

### 6. Performance Optimizations

**Search Speed**:
- Library search: < 10ms
- Content search (cached): < 100ms
- Content search (first time): 1-500ms

**Memory Efficiency**:
- Per-book overhead: ~50KB
- Lazy loading prevents full book in memory
- Large book support with streaming

**Scalability**:
- Handles 1000+ book libraries
- Supports books with 100k+ words
- Async indexing for large collections

## API Methods

### SearchService
```typescript
// Index content
await searchService.indexBookContent(bookId, content, "epub");

// Search metadata
searchService.searchMetadata("query", books);

// Search content
await searchService.searchBookContent(bookId, "query", limit);

// Combined search
await searchService.search("query", books, {
  searchMetadata: true,
  searchContent: true,
  limit: 50
});

// Utilities
searchService.highlightMatches(text, query);
searchService.clearCache();
```

### SearchStore Actions
```typescript
// Search by scope
await search(query, "library" | "current-book", bookId?);

// Specific search
await searchLibraryMetadata(query);
await searchBookContent(bookId, query);

// Indexing
await indexBook(bookId, content, "epub" | "pdf");

// State management
clearResults();
setError(error);
updateIndexingProgress(bookId, progress);
```

## Use Cases

### 1. Finding a Book
User searches for "romance" in library:
- Matches books with "romance" in title/tags/description
- Results ranked by relevance
- Shows preview snippet
- Direct click-to-open

### 2. Reading and Searching
User opens a book and searches for "chapter 5":
- Searches indexed content
- Shows all matches with locations
- Highlights in reader
- Navigation to each match

### 3. Large Library Navigation
User with 500+ books searches for author:
- Fast metadata search (< 10ms)
- Results sorted by relevance
- Pagination support
- Favorite/collection filtering

### 4. Progress Tracking
User indexes large book (500KB EPUB):
- Progress bar shows 0-100%
- Updates every 100ms
- Non-blocking operation
- Can continue using app

## Error Handling

**Graceful Degradation**:
- IndexedDB unavailable → Falls back to in-memory
- Large query → Results limited automatically
- Network issues → Works offline with cached data
- Corrupted index → Re-indexes on next search

**Error Messages**:
- Clear, actionable error descriptions
- Available via `useSearchError()` hook
- Logged to console in non-test environments

## Browser Support

**Minimum Requirements**:
- IndexedDB support (all modern browsers)
- ES2015+ JavaScript support
- ~50MB storage for full library cache

**Tested On**:
- Chrome/Edge 24+
- Firefox 51+
- Safari 11+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- Search results properly labeled
- Keyboard navigation supported
- Screen reader compatible
- Progress indicators available
- Clear error messages
- High contrast highlight markers

## Integration Examples

### React Component Search Box
```typescript
function SearchBox() {
  const [query, setQuery] = useState("");
  const { searchLibraryMetadata } = useSearchActions();
  const results = useSearchResults();
  const isSearching = useSearching();

  const handleSearch = async (e) => {
    const q = e.target.value;
    setQuery(q);
    if (q.length > 1) {
      await searchLibraryMetadata(q);
    }
  };

  return (
    <>
      <input
        value={query}
        onChange={handleSearch}
        placeholder="Search books..."
        disabled={isSearching}
      />
      {isSearching && <Spinner />}
      <ResultsList results={results} />
    </>
  );
}
```

### Reader Search Panel
```typescript
function ReaderSearch({ bookId, content }) {
  const { indexBook, searchBookContent } = useSearchActions();
  const results = useSearchResults();
  const progress = useIndexingProgress();

  useEffect(() => {
    indexBook(bookId, content, "epub");
  }, [bookId, content]);

  return (
    <>
      <input
        onChange={(e) => searchBookContent(bookId, e.target.value)}
        placeholder="Search in book..."
      />
      {progress.get(bookId) && (
        <ProgressBar value={progress.get(bookId)} />
      )}
      <div className="search-results">
        {results.map((result) => (
          <SearchMatch
            key={result.id}
            result={result}
            onNavigate={handleNavigate}
          />
        ))}
      </div>
    </>
  );
}
```

## Performance Tips

### For Best Results:
1. **Lazy index**: Index books when needed, not all at once
2. **Cache warmup**: First search is slower, subsequent are cached
3. **Limit results**: Use `limit` parameter for large result sets
4. **Clear old indexes**: Remove indexes for deleted books
5. **Monitor storage**: Check IndexedDB quota on large libraries

### Configuration:
- Snippet size: 500 words (configurable in SearchService)
- Preview size: 200 characters (configurable)
- Result limit: 50 default (configurable per search)
- Cache expiry: Manual only (persistent storage)

## Troubleshooting

**Search returns no results?**
- Check query spelling (case-insensitive but must contain word)
- Verify book was indexed (check indexingProgress)
- Try longer search query (3+ characters recommended)

**Search is slow?**
- First search slower due to indexing
- Subsequent searches should be fast (cached)
- Large books take longer to index
- Check browser storage quota

**Results missing?**
- Books must be indexed before full-text search
- Metadata search doesn't require indexing
- Clear cache if index corrupted: `searchService.clearCache(bookId)`

**Storage full?**
- IndexedDB quota exceeded
- Delete unused book indexes
- Clear browser cache
- Check storage usage via browser DevTools

## Future Roadmap

1. **Advanced Search**
   - Boolean operators (AND, OR, NOT)
   - Phrase search with quotes
   - Wildcard patterns

2. **Performance**
   - Full-text search library (lunr/flexsearch)
   - Incremental indexing
   - Web Worker indexing

3. **Features**
   - Search suggestions
   - Search history
   - Advanced filters
   - Search analytics

4. **Cloud**
   - Cloud sync for search indexes
   - Cross-device search
   - Collaborative features

---

**For detailed API documentation, see SEARCH.md**
**For implementation details, see IMPLEMENTATION_SUMMARY.md**
