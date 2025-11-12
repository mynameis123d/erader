import type { Book, SearchableSnippet, SearchResult } from "../types";
import { indexedStorageService } from "./indexed-storage-service";

const SNIPPET_SIZE = 500;
const PREVIEW_SIZE = 200;

export class SearchService {
  private snippetCache = new Map<string, SearchableSnippet[]>();
  private resultCache = new Map<string, SearchResult[]>();

  constructor() {
    this.loadCacheFromStorage();
  }

  /**
   * Load cached snippets from IndexedDB on initialization
   */
  private async loadCacheFromStorage(): Promise<void> {
    try {
      // Cache will be loaded on-demand during search
    } catch (error) {
      if (process.env.NODE_ENV !== "test") {
        console.error("Failed to load search cache:", error);
      }
    }
  }

  /**
   * Index book content into searchable snippets
   * Splits content into manageable chunks while preserving location info
   */
  async indexBookContent(
    bookId: string,
    content: string,
    format: "epub" | "pdf" = "epub"
  ): Promise<SearchableSnippet[]> {
    const snippets: SearchableSnippet[] = [];
    const words = content.split(/\s+/);

    let currentPosition = 0;
    let wordIndex = 0;

    while (wordIndex < words.length) {
      const snippetWords = words.slice(
        wordIndex,
        Math.min(wordIndex + SNIPPET_SIZE, words.length)
      );
      const snippetContent = snippetWords.join(" ");

      const snippet: SearchableSnippet = {
        id: `snippet-${bookId}-${snippets.length}`,
        bookId,
        content: snippetContent,
        location: {
          position: currentPosition,
          chapter: this.getChapterFromPosition(currentPosition, format),
        },
      };

      snippets.push(snippet);
      currentPosition += snippetWords.length;
      wordIndex += SNIPPET_SIZE;
    }

    this.snippetCache.set(bookId, snippets);

    try {
      await indexedStorageService.saveSearchIndex(bookId, snippets);
    } catch (error) {
      if (process.env.NODE_ENV !== "test") {
        console.error("Failed to persist search index:", error);
      }
    }

    return snippets;
  }

  /**
   * Search within book metadata (title, author, tags)
   */
  searchMetadata(query: string, books: Book[]): SearchResult[] {
    const normalizedQuery = query.toLowerCase();
    const results: SearchResult[] = [];
    const cacheKey = `metadata:${normalizedQuery}`;

    const cached = this.resultCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    books.forEach((book) => {
      let relevanceScore = 0;

      // Title match (highest relevance)
      if (book.metadata.title.toLowerCase().includes(normalizedQuery)) {
        const titleScore =
          100 -
          Math.abs(
            book.metadata.title.length - normalizedQuery.length
          ) * 5;
        relevanceScore = Math.max(relevanceScore, titleScore);
      }

      // Author match
      if (
        book.metadata.author?.toLowerCase().includes(normalizedQuery)
      ) {
        relevanceScore = Math.max(relevanceScore, 75);
      }

      // Tags match
      if (book.metadata.tags?.some((tag) =>
        tag.toLowerCase().includes(normalizedQuery)
      )) {
        relevanceScore = Math.max(relevanceScore, 60);
      }

      // Description match
      if (
        book.metadata.description?.toLowerCase().includes(normalizedQuery)
      ) {
        relevanceScore = Math.max(relevanceScore, 40);
      }

      if (relevanceScore > 0) {
        results.push({
          id: book.id,
          bookId: book.id,
          type: "book",
          title: book.metadata.title,
          author: book.metadata.author,
          snippet: book.metadata.description?.substring(0, PREVIEW_SIZE),
          relevanceScore,
        });
      }
    });

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    this.resultCache.set(cacheKey, results);

    return results;
  }

  /**
   * Search within book content
   * Returns snippets containing the search term with context
   */
  async searchBookContent(
    bookId: string,
    query: string,
    limit = 50
  ): Promise<SearchResult[]> {
    const normalizedQuery = query.toLowerCase();
    const cacheKey = `content:${bookId}:${normalizedQuery}`;

    const cached = this.resultCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let snippets = this.snippetCache.get(bookId);

    if (!snippets) {
      try {
        const stored =
          await indexedStorageService.getSearchIndex(bookId);
        if (stored?.snippets) {
          snippets = stored.snippets;
          this.snippetCache.set(bookId, snippets);
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "test") {
          console.error("Failed to load search index:", error);
        }
      }
    }

    if (!snippets) {
      return [];
    }

    const results: SearchResult[] = [];

    snippets.forEach((snippet) => {
      const lowerContent = snippet.content.toLowerCase();
      let startIndex = 0;

      while (startIndex < snippet.content.length) {
        const foundIndex = lowerContent.indexOf(
          normalizedQuery,
          startIndex
        );

        if (foundIndex === -1) break;

        const matchStart = foundIndex;
        const matchEnd = foundIndex + normalizedQuery.length;

        const previewStart = Math.max(0, matchStart - 50);
        const previewEnd = Math.min(
          snippet.content.length,
          matchEnd + 50
        );

        const snippetText =
          snippet.content.substring(previewStart, previewEnd);
        const localMatchStart = matchStart - previewStart;
        const localMatchEnd = matchEnd - previewStart;

        results.push({
          id: `${snippet.id}-${results.length}`,
          bookId,
          type: "content",
          title: `Match in content`,
          snippet: snippetText,
          location: snippet.location,
          relevanceScore: this.calculateRelevance(
            snippet.content,
            query
          ),
          matchStart: localMatchStart,
          matchEnd: localMatchEnd,
        });

        startIndex = matchEnd;
      }
    });

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const limited = results.slice(0, limit);

    this.resultCache.set(cacheKey, limited);

    return limited;
  }

  /**
   * Combined search across metadata and content
   */
  async search(
    query: string,
    books: Book[],
    options: {
      searchMetadata?: boolean;
      searchContent?: boolean;
      bookId?: string;
      limit?: number;
    } = {}
  ): Promise<SearchResult[]> {
    const {
      searchMetadata: includeMetadata = true,
      searchContent: includeContent = false,
      bookId,
      limit = 50,
    } = options;

    const results: SearchResult[] = [];

    // Search metadata
    if (includeMetadata) {
      const metadataResults = this.searchMetadata(query, books);
      results.push(...metadataResults);
    }

    // Search content if requested
    if (includeContent && bookId) {
      const contentResults = await this.searchBookContent(
        bookId,
        query,
        limit
      );
      results.push(...contentResults);
    }

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return results.slice(0, limit);
  }

  /**
   * Clear caches for a specific book or all
   */
  clearCache(bookId?: string): void {
    if (bookId) {
      this.snippetCache.delete(bookId);
      const keysToDelete: string[] = [];
      this.resultCache.forEach((_, key) => {
        if (key.includes(bookId)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => this.resultCache.delete(key));
    } else {
      this.snippetCache.clear();
      this.resultCache.clear();
    }
  }

  /**
   * Get cached snippets for a book
   */
  getCachedSnippets(bookId: string): SearchableSnippet[] | undefined {
    return this.snippetCache.get(bookId);
  }

  /**
   * Calculate relevance score based on content
   * Higher score if query appears multiple times or near the start
   */
  private calculateRelevance(content: string, query: string): number {
    const normalizedContent = content.toLowerCase();
    const normalizedQuery = query.toLowerCase();

    let score = 50;

    // Count occurrences
    const matches = normalizedContent.split(normalizedQuery).length - 1;
    score += Math.min(matches * 10, 30);

    // Boost if near start
    if (normalizedContent.indexOf(normalizedQuery) < 100) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Get chapter information from position
   * This is a simplified implementation
   */
  private getChapterFromPosition(
    position: number,
    format: "epub" | "pdf"
  ): string | undefined {
    if (format === "pdf") {
      const pageNumber = Math.floor(position / 500) + 1;
      return `Page ${pageNumber}`;
    }
    return undefined;
  }

  /**
   * Highlight matches in text
   */
  highlightMatches(
    text: string,
    query: string,
    className = "search-match"
  ): string {
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(
      regex,
      `<mark class="${className}">$1</mark>`
    );
  }
}

export const searchService = new SearchService();
