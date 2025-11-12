import type {
  BookFile,
  BookFormat,
  BookMetadata,
  ContentManifest,
  ContentManifestItem,
  FileIngestionResult,
  ManifestResource,
  ManifestTextLayer,
} from "../types";
import {
  IndexedStorageService,
  indexedStorageService,
  type StoredBookFile,
} from "./indexed-storage-service";
import { useLibraryStore } from "../state/library-store";

interface AdapterParseResult {
  metadata: BookMetadata;
  manifest: ContentManifest;
  coverImage?: Blob | string | null;
}

interface FileIngestionAdapter {
  readonly format: BookFormat;
  supports: (
    file: File,
    extension: string,
    mimeType: string
  ) => boolean | Promise<boolean>;
  parse: (file: File) => Promise<AdapterParseResult>;
}

interface FileIngestionOptions {
  maxFileSize: number;
  duplicateStrategy: "skip" | "allow";
  textLayerPageLimit: number;
}


const DEFAULT_OPTIONS: FileIngestionOptions = {
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  duplicateStrategy: "skip",
  textLayerPageLimit: 20,
};

const MIME_BY_EXTENSION: Record<string, string> = {
  epub: "application/epub+zip",
  pdf: "application/pdf",
  txt: "text/plain",
  text: "text/plain",
  html: "text/html",
  htm: "text/html",
};

const PLACEHOLDER_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=";

const stripExtension = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) {
    return fileName;
  }
  return fileName.slice(0, lastDot);
};

const getExtension = (fileName: string): string => {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
};

const inferMimeType = (file: File): string => {
  if (file.type) {
    return file.type;
  }
  const extension = getExtension(file.name);
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
};

const dataUrlToBlob = (dataUrl: string): Blob => {
  const [meta, data] = dataUrl.split(",");
  const mimeMatch = /^data:(.*?)(;base64)?$/i.exec(meta);
  const mimeType = mimeMatch?.[1] || "application/octet-stream";
  if (meta.includes(";base64")) {
    if (typeof atob === "function") {
      const binary = atob(data);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        array[i] = binary.charCodeAt(i);
      }
      return new Blob([array], { type: mimeType });
    }

    if (typeof Buffer !== "undefined") {
      const buffer = Buffer.from(data, "base64");
      return new Blob([buffer], { type: mimeType });
    }

    throw new Error("Base64 decoding is not supported in this environment");
  }
  return new Blob([decodeURIComponent(data)], { type: mimeType });
};

const blobToDataUrl = async (blob: Blob): Promise<string> => {
  if (typeof FileReader !== "undefined") {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  const arrayBuffer = await blob.arrayBuffer();

  if (typeof btoa === "function") {
    let binary = "";
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);
    return `data:${blob.type || "application/octet-stream"};base64,${base64}`;
  }

  if (typeof Buffer !== "undefined") {
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    return `data:${blob.type || "application/octet-stream"};base64,${base64}`;
  }

  throw new Error("Unable to convert blob to data URL");
};

const normalizeCover = async (
  coverImage?: Blob | string | null
): Promise<{ blob?: Blob; dataUrl?: string }> => {
  if (!coverImage) {
    return {};
  }

  if (coverImage instanceof Blob) {
    try {
      return {
        blob: coverImage,
        dataUrl: await blobToDataUrl(coverImage),
      };
    } catch (error) {
      if (process.env.NODE_ENV !== "test") {
        // eslint-disable-next-line no-console
        console.warn("Failed to serialize cover blob", error);
      }
      return { blob: coverImage };
    }
  }

  const value = coverImage.trim();
  if (value.startsWith("data:")) {
    try {
      const blob = dataUrlToBlob(value);
      return {
        blob,
        dataUrl: value,
      };
    } catch (error) {
      if (process.env.NODE_ENV !== "test") {
        // eslint-disable-next-line no-console
        console.warn("Failed to decode cover data URL", error);
      }
      return {};
    }
  }

  if (typeof fetch !== "function") {
    return {};
  }

  try {
    const response = await fetch(value);
    const contentType = response.headers.get("content-type") ?? "image/png";
    const buffer = await response.arrayBuffer();
    const blob = new Blob([buffer], { type: contentType });
    try {
      return {
        blob,
        dataUrl: await blobToDataUrl(blob),
      };
    } catch (error) {
      if (process.env.NODE_ENV !== "test") {
        // eslint-disable-next-line no-console
        console.warn("Failed to serialize fetched cover image", error);
      }
      return { blob };
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      // eslint-disable-next-line no-console
      console.warn("Failed to resolve cover image", error);
    }
    return {};
  }
};

const createPlaceholderCover = (): Blob => {
  try {
    return dataUrlToBlob(PLACEHOLDER_PNG_DATA_URL);
  } catch {
    return new Blob([], { type: "image/png" });
  }
};

const toContentManifestItem = (
  items: any[],
  level = 0
): ContentManifestItem[] => {
  return items.map((item, index) => ({
    id: item.id || item.href || `item-${level}-${index}`,
    title: item.label?.trim?.() || item.title || item.text || undefined,
    href: item.href || item.hrefs?.[0],
    order: index,
    level,
    spineItemId: item.idref,
    children: item.subitems
      ? toContentManifestItem(item.subitems, level + 1)
      : undefined,
  }));
};

const ensureManifestFormat = (
  manifest: ContentManifest,
  format: BookFormat
): ContentManifest => ({
  ...manifest,
  format: manifest.format ?? format,
  spine: (manifest.spine ?? []).map((resource, index) => ({
    ...resource,
    id: resource.id || `spine-${index}`,
    order: resource.order ?? index,
  })),
  tableOfContents: (manifest.tableOfContents ?? []).map((item, index) => ({
    ...item,
    id: item.id || `toc-${index}`,
    order: item.order ?? index,
  })),
});

const limitTextLayers = (
  textLayers: ManifestTextLayer[] | undefined,
  limit: number
): ManifestTextLayer[] | undefined => {
  if (!textLayers) {
    return undefined;
  }
  if (textLayers.length <= limit) {
    return textLayers;
  }
  return textLayers.slice(0, limit);
};

class EpubFileAdapter implements FileIngestionAdapter {
  readonly format: BookFormat = "epub";

  supports(file: File, extension: string, mimeType: string): boolean {
    return extension === "epub" || mimeType.includes("epub");
  }

  async parse(file: File): Promise<AdapterParseResult> {
    const { default: ePub } = await import("epubjs");
    const arrayBuffer = await file.arrayBuffer();
    const book = ePub(arrayBuffer);

    const metadata = await book.loaded.metadata.catch(() => ({} as any));
    const navigation = await book.loaded.navigation.catch(() => ({ toc: [] }));
    const spineItems = book.spine?.items ?? [];

    const identifiers: Record<string, string> | undefined = metadata.identifier
      ? { identifier: metadata.identifier }
      : metadata.identifiers;

    const manifest: ContentManifest = {
      format: "epub",
      spine: spineItems.map((item: any, index: number) => ({
        id: item.id || item.idref || `spine-${index}`,
        href: item.href,
        mediaType: item.type || "application/xhtml+xml",
        title: item.label || item.idref || item.id || `Section ${index + 1}`,
        order: index,
        properties: item.properties,
      })),
      tableOfContents: navigation.toc
        ? toContentManifestItem(navigation.toc)
        : [],
      pageCount: metadata.pageCount ?? spineItems.length || undefined,
    };

    let coverImage: Blob | string | null = null;
    try {
      if (typeof book.coverUrl === "function") {
        coverImage = await book.coverUrl();
      } else if (book.loaded.cover) {
        const coverHref = await book.loaded.cover;
        if (coverHref && book.archive?.get) {
          const coverBuffer = await book.archive.get(coverHref);
          if (coverBuffer) {
            coverImage = new Blob([coverBuffer], { type: "image/png" });
          }
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "test") {
        // eslint-disable-next-line no-console
        console.warn("Failed to extract EPUB cover", error);
      }
    }

    const descriptionCandidates = [metadata.description, metadata.summary];
    const description = descriptionCandidates.find((value) => typeof value === "string");

    const normalizedMetadata: BookMetadata = {
      title: metadata.title || stripExtension(file.name),
      author: metadata.creator || metadata.author,
      publisher: metadata.publisher,
      publishedDate: metadata.pubdate || metadata.published,
      language: metadata.language,
      description: description ?? undefined,
      tags: Array.isArray(metadata.subject)
        ? metadata.subject
        : typeof metadata.subject === "string"
        ? metadata.subject.split(",").map((tag: string) => tag.trim()).filter(Boolean)
        : undefined,
      format: "epub",
      identifiers,
      pageCount: manifest.pageCount,
    };

    return {
      metadata: normalizedMetadata,
      manifest,
      coverImage,
    };
  }
}

class PdfFileAdapter implements FileIngestionAdapter {
  readonly format: BookFormat = "pdf";

  constructor(
    private readonly textLayerLimit = DEFAULT_OPTIONS.textLayerPageLimit
  ) {}

  supports(file: File, extension: string, mimeType: string): boolean {
    return extension === "pdf" || mimeType === "application/pdf";
  }

  async parse(file: File): Promise<AdapterParseResult> {
    const pdfjs = await import("pdfjs-dist");
    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjs.getDocument({ data });
    const pdfDocument = await loadingTask.promise;

    const { info, metadata } = await pdfDocument
      .getMetadata()
      .catch(() => ({ info: {}, metadata: null }));

    const metadataMap = metadata?.getAll?.()
      ? Object.fromEntries(metadata.getAll())
      : (metadata as any);

    const pageCount = pdfDocument.numPages;
    const spine: ManifestResource[] = Array.from(
      { length: pageCount },
      (_, index) => ({
        id: `page-${index + 1}`,
        title: `Page ${index + 1}`,
        order: index,
      })
    );

    const textLayers: ManifestTextLayer[] = [];

    const pageLimit = Math.min(pageCount, this.textLayerLimit);

    for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      try {
        await page.getTextContent();
      } catch (error) {
        if (process.env.NODE_ENV !== "test") {
          // eslint-disable-next-line no-console
          console.warn("Failed to read text content from PDF page", error);
        }
      }
      textLayers.push({
        id: `page-${pageNumber}-text`,
        page: pageNumber,
      });
    }

    const manifest: ContentManifest = {
      format: "pdf",
      spine,
      tableOfContents: [],
      pageCount,
      textLayers,
    };

    const normalizedMetadata: BookMetadata = {
      title:
        info?.Title ||
        metadataMap?.["dc:title"] ||
        metadataMap?.title ||
        stripExtension(file.name),
      author: info?.Author || metadataMap?.["dc:creator"] || metadataMap?.creator,
      publisher: info?.Producer,
      language: metadataMap?.["dc:language"],
      description: metadataMap?.["dc:description"],
      format: "pdf",
      pageCount,
    };

    let coverImage: Blob | string | null = null;
    try {
      coverImage = await this.renderCover(pdfDocument);
    } catch (error) {
      if (process.env.NODE_ENV !== "test") {
        // eslint-disable-next-line no-console
        console.warn("Failed to render PDF cover", error);
      }
      coverImage = createPlaceholderCover();
    }

    return {
      metadata: normalizedMetadata,
      manifest,
      coverImage,
    };
  }

  private async renderCover(pdfDocument: any): Promise<Blob | null> {
    if (typeof document === "undefined" || typeof document.createElement !== "function") {
      return createPlaceholderCover();
    }

    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 0.5 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext?.("2d");

    if (!context) {
      return createPlaceholderCover();
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderTask = page.render({
      canvasContext: context,
      viewport,
    });

    await renderTask.promise;

    if (typeof canvas.toBlob === "function") {
      return await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/png");
      });
    }

    if (typeof canvas.toDataURL === "function") {
      try {
        const dataUrl = canvas.toDataURL("image/png");
        return dataUrlToBlob(dataUrl);
      } catch (error) {
        if (process.env.NODE_ENV !== "test") {
          // eslint-disable-next-line no-console
          console.warn("Failed to convert canvas to data URL", error);
        }
      }
    }

    return createPlaceholderCover();
  }
}

class PlainTextAdapter implements FileIngestionAdapter {
  readonly format: BookFormat;

  constructor(private readonly variant: "text" | "html" = "text") {
    this.format = variant;
  }

  supports(file: File, extension: string, mimeType: string): boolean {
    if (this.variant === "text") {
      return (
        mimeType.startsWith("text/plain") ||
        extension === "txt" ||
        extension === "text"
      );
    }

    return mimeType.includes("html") || extension === "html" || extension === "htm";
  }

  async parse(file: File): Promise<AdapterParseResult> {
    const content = await file.text();
    const titleFromName = stripExtension(file.name);

    let title = titleFromName;
    let description: string | undefined;

    if (this.variant === "html") {
      const titleMatch = content.match(/<title>(.*?)<\/title>/i);
      if (titleMatch?.[1]) {
        title = titleMatch[1].trim();
      }
    } else {
      const firstLine = content.split(/\r?\n/).find((line) => line.trim().length > 0);
      if (firstLine) {
        title = firstLine.trim().slice(0, 200);
      }
      description = content.slice(0, 500).trim() || undefined;
    }

    const manifest: ContentManifest = {
      format: this.variant === "html" ? "html" : "text",
      spine: [
        {
          id: "root",
          title,
          href: file.name,
          order: 0,
          mediaType: this.variant === "html" ? "text/html" : "text/plain",
        },
      ],
      tableOfContents: [],
    };

    const metadata: BookMetadata = {
      title,
      description,
      language: undefined,
      format: manifest.format,
    };

    return {
      metadata,
      manifest,
    };
  }
}

export class FileIngestionService {
  private adapters: FileIngestionAdapter[] = [];

  private readonly options: FileIngestionOptions;

  constructor(
    private readonly libraryStore: typeof useLibraryStore = useLibraryStore,
    private readonly storageService: IndexedStorageService = indexedStorageService,
    options: Partial<FileIngestionOptions> = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.registerAdapter(new EpubFileAdapter());
    this.registerAdapter(new PdfFileAdapter(this.options.textLayerPageLimit));
    this.registerAdapter(new PlainTextAdapter("text"));
    this.registerAdapter(new PlainTextAdapter("html"));
  }

  registerAdapter(adapter: FileIngestionAdapter): void {
    this.adapters = [
      ...this.adapters.filter((existing) => existing.format !== adapter.format),
      adapter,
    ];
  }

  async ingestFiles(input: FileList | File[] | Iterable<File>): Promise<FileIngestionResult[]> {
    const files = Array.isArray(input)
      ? input
      : input instanceof FileList
      ? Array.from(input)
      : Array.from(input);

    const results: FileIngestionResult[] = [];

    for (const file of files) {
      const result = await this.ingestFile(file);
      results.push(result);
    }

    return results;
  }

  async ingestFile(file: File): Promise<FileIngestionResult> {
    if (file.size > this.options.maxFileSize) {
      const error = `File exceeds maximum allowed size of ${Math.round(
        this.options.maxFileSize / (1024 * 1024)
      )}MB.`;
      this.libraryStore.getState().setError(error);
      return {
        status: "error",
        fileName: file.name,
        error,
      };
    }

    const adapter = await this.getAdapterForFile(file);

    if (!adapter) {
      const error = "Unsupported file format";
      this.libraryStore.getState().setError(error);
      return {
        status: "unsupported",
        fileName: file.name,
        error,
      };
    }

    const duplicate = await this.findDuplicate(file);

    if (duplicate && this.options.duplicateStrategy === "skip") {
      const existingBookId = this.findBookIdForFile(duplicate.id);
      return {
        status: "duplicate",
        fileName: file.name,
        duplicateOf: existingBookId,
      };
    }

    try {
      const parsed = await adapter.parse(file);
      const normalizedManifest = ensureManifestFormat(
        parsed.manifest,
        adapter.format
      );
      const manifest: ContentManifest = {
        ...normalizedManifest,
        textLayers: limitTextLayers(
          normalizedManifest.textLayers,
          this.options.textLayerPageLimit
        ),
      };
      const metadata = this.normalizeMetadata(
        parsed.metadata,
        adapter.format,
        manifest
      );
      const cover = await normalizeCover(parsed.coverImage);

      const bookFile: BookFile = {
        id: crypto.randomUUID(),
        fileName: file.name,
        fileType: inferMimeType(file),
        fileSize: file.size,
        blob: file,
        addedDate: new Date(),
        manifest,
        coverImageBlob: cover.blob,
      };

      const metadataForStore: BookMetadata = cover.dataUrl
        ? { ...metadata, coverImage: cover.dataUrl }
        : metadata;

      const bookId = await this.libraryStore
        .getState()
        .addBook(bookFile, metadataForStore, manifest);

      return {
        status: "success",
        fileName: file.name,
        metadata: metadataForStore,
        manifest,
        bookId,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to ingest file";
      this.libraryStore.getState().setError(message);
      return {
        status: "error",
        fileName: file.name,
        error: message,
      };
    }
  }

  private async getAdapterForFile(file: File): Promise<FileIngestionAdapter | null> {
    const extension = getExtension(file.name);
    const mimeType = inferMimeType(file);

    for (const adapter of this.adapters) {
      try {
        if (await adapter.supports(file, extension, mimeType)) {
          return adapter;
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "test") {
          // eslint-disable-next-line no-console
          console.warn("Adapter support check failed", error);
        }
      }
    }

    return null;
  }

  private async findDuplicate(file: File): Promise<StoredBookFile | undefined> {
    const existingFiles = await this.storageService.listFiles();
    return existingFiles.find(
      (storedFile) =>
        storedFile.fileName === file.name && storedFile.fileSize === file.size
    );
  }

  private findBookIdForFile(fileId: string): string | undefined {
    const state = this.libraryStore.getState();
    return state.books.find((book) => book.fileId === fileId)?.id;
  }

  private normalizeMetadata(
    metadata: BookMetadata,
    format: BookFormat,
    manifest: ContentManifest
  ): BookMetadata {
    const normalized: BookMetadata = {
      ...metadata,
      format: metadata.format ?? format,
    };

    if (normalized.pageCount === undefined && manifest.pageCount !== undefined) {
      normalized.pageCount = manifest.pageCount;
    }

    return normalized;
  }
}

export const fileIngestionService = new FileIngestionService();
