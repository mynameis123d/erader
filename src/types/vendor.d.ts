declare module "epubjs" {
  interface EpubLoaded {
    metadata: Promise<any>;
    navigation: Promise<any>;
    cover?: Promise<any>;
  }

  interface EpubArchive {
    get?: (href: string) => Promise<ArrayBuffer | Uint8Array | null>;
  }

  interface EpubSpineItem {
    id?: string;
    idref?: string;
    href?: string;
    type?: string;
    label?: string;
    properties?: Record<string, unknown>;
  }

  interface EpubSpine {
    items?: EpubSpineItem[];
  }

  interface EpubBook {
    loaded: EpubLoaded;
    spine?: EpubSpine;
    archive?: EpubArchive;
    coverUrl?: () => Promise<string | Blob | null>;
  }

  export default function ePub(input: any, options?: any): EpubBook;
}

declare module "pdfjs-dist" {
  export interface PDFMetadataInfo {
    Title?: string;
    Author?: string;
    Producer?: string;
  }

  export interface PDFMetadata {
    info?: PDFMetadataInfo;
    metadata?: {
      getAll?: () => Iterable<[string, any]>;
    };
  }

  export interface PDFRenderTask {
    promise: Promise<void>;
  }

  export interface PDFPageProxy {
    getViewport: (params: { scale: number }) => { width: number; height: number };
    getTextContent: () => Promise<any>;
    render: (params: {
      canvasContext: CanvasRenderingContext2D;
      viewport: { width: number; height: number };
    }) => PDFRenderTask;
  }

  export interface PDFDocumentProxy {
    numPages: number;
    getMetadata: () => Promise<PDFMetadata>;
    getPage: (pageNumber: number) => Promise<PDFPageProxy>;
  }

  export interface PDFLoadingTask {
    promise: Promise<PDFDocumentProxy>;
  }

  export function getDocument(options: { data: Uint8Array }): PDFLoadingTask;
}
