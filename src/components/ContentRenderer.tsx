import React, { useEffect, useRef, useState } from "react";
import type { BookFormat, ReadingLocation, ThemeSettings } from "../types";

type NavigationRequest =
  | { type: "next" }
  | { type: "prev" }
  | { type: "to"; location: ReadingLocation };

interface ContentRendererProps {
  bookId: string;
  fileBlob: Blob;
  format: BookFormat;
  location: ReadingLocation | null;
  theme: ThemeSettings;
  navigationRequest: NavigationRequest | null;
  onNavigationHandled?: () => void;
  onLocationChange: (location: ReadingLocation) => void;
  onProgressChange: (percentage: number) => void;
  onTocLoaded?: (toc: any[]) => void;
  onError?: (error: Error) => void;
}

export const ContentRenderer: React.FC<ContentRendererProps> = ({
  bookId,
  fileBlob,
  format,
  location,
  theme,
  navigationRequest,
  onNavigationHandled,
  onLocationChange,
  onProgressChange,
  onTocLoaded,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const renditionRef = useRef<any>(null);
  const currentPdfPageRef = useRef<number>(1);

  useEffect(() => {
    if (!containerRef.current || !fileBlob) return;

    const loadBook = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (format === "epub") {
          await loadEpub();
        } else if (format === "pdf") {
          await loadPdf();
        } else {
          throw new Error(`Unsupported format: ${format}`);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to load book");
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBook();

    return () => {
      if (renditionRef.current) {
        try {
          if (format === "epub" && renditionRef.current.destroy) {
            renditionRef.current.destroy();
          }
        } catch (err) {
          console.error("Error cleaning up rendition:", err);
        }
        renditionRef.current = null;
      }
    };
  }, [bookId, fileBlob, format]);

  useEffect(() => {
    if (renditionRef.current && format === "epub" && location?.cfi) {
      try {
        renditionRef.current.display(location.cfi);
      } catch (err) {
        console.error("Error navigating to location:", err);
      }
    }
  }, [location?.cfi, format]);

  useEffect(() => {
    if (!navigationRequest || !renditionRef.current) return;

    const handleNavigation = async () => {
      try {
        if (format === "epub") {
          if (navigationRequest.type === "next") {
            await renditionRef.current.next();
          } else if (navigationRequest.type === "prev") {
            await renditionRef.current.prev();
          } else if (navigationRequest.type === "to") {
            const loc = navigationRequest.location;
            if (loc.cfi) {
              await renditionRef.current.display(loc.cfi);
            }
          }
        } else if (format === "pdf") {
          const pdf = renditionRef.current;
          const currentPage = location?.page || 1;
          
          if (navigationRequest.type === "next" && currentPage < pdf.numPages) {
            await renderPdfPage(pdf, currentPage + 1);
          } else if (navigationRequest.type === "prev" && currentPage > 1) {
            await renderPdfPage(pdf, currentPage - 1);
          } else if (navigationRequest.type === "to" && navigationRequest.location.page) {
            await renderPdfPage(pdf, navigationRequest.location.page);
          }
        }
      } catch (err) {
        console.error("Navigation error:", err);
      } finally {
        onNavigationHandled?.();
      }
    };

    handleNavigation();
  }, [navigationRequest, format, location?.page, onNavigationHandled]);

  useEffect(() => {
    if (format !== "pdf" || !location?.page || !renditionRef.current) return;

    if (currentPdfPageRef.current === location.page) {
      return;
    }

    renderPdfPage(renditionRef.current, location.page);
  }, [format, location?.page]);

  useEffect(() => {
    applyTheme();
  }, [theme, format]);

  const loadEpub = async () => {
    if (!containerRef.current) return;

    const ePub = await import("epubjs");
    const Book = ePub.default;

    const arrayBuffer = await fileBlob.arrayBuffer();
    const book = Book(arrayBuffer);
    const rendition = book.renderTo(containerRef.current, {
      width: "100%",
      height: "100%",
      flow: "paginated",
      manager: "default",
    });

    renditionRef.current = rendition;

    await rendition.display(location?.cfi || undefined);

    const navigation = await book.loaded.navigation;
    if (navigation && onTocLoaded) {
      const toc = navigation.toc.map((item: any) => ({
        id: item.id || item.href,
        label: item.label,
        href: item.href,
        subitems: item.subitems?.map((sub: any) => ({
          id: sub.id || sub.href,
          label: sub.label,
          href: sub.href,
        })),
      }));
      onTocLoaded(toc);
    }

    rendition.on("relocated", (location: any) => {
      const cfi = location.start.cfi;
      const percentage = location.start.percentage || 0;

      onLocationChange({
        cfi,
        position: location.start.index,
      });

      onProgressChange(Math.round(percentage * 100));
    });

    applyTheme();
  };

  const loadPdf = async () => {
    if (!containerRef.current) return;

    const pdfjsLib = await import("pdfjs-dist");
    
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await fileBlob.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    renditionRef.current = pdf;

    const pageNum = location?.page || 1;
    await renderPdfPage(pdf, pageNum);

    if (onTocLoaded) {
      const outline = await pdf.getOutline();
      if (outline) {
        const toc = await buildPdfToc(outline, pdf);
        onTocLoaded(toc);
      }
    }
  };

  const renderPdfPage = async (pdf: any, pageNumber: number) => {
    if (!containerRef.current) return;

    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    
    if (!context) return;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(canvas);

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    currentPdfPageRef.current = pageNumber;

    onLocationChange({
      page: pageNumber,
      position: pageNumber,
    });

    const percentage = (pageNumber / pdf.numPages) * 100;
    onProgressChange(Math.round(percentage));
  };

  const buildPdfToc = async (outline: any[], pdf: any): Promise<any[]> => {
    return Promise.all(
      outline.map(async (item) => {
        let pageNum = 1;
        try {
          if (item.dest) {
            const dest = typeof item.dest === "string" 
              ? await pdf.getDestination(item.dest)
              : item.dest;
            if (dest && dest[0]) {
              pageNum = await pdf.getPageIndex(dest[0]) + 1;
            }
          }
        } catch (err) {
          console.error("Error resolving PDF destination:", err);
        }

        return {
          id: item.title || `item-${pageNum}`,
          label: item.title,
          href: `#page-${pageNum}`,
          subitems: item.items ? await buildPdfToc(item.items, pdf) : undefined,
          location: { page: pageNum },
        };
      })
    );
  };

  const applyTheme = () => {
    if (!renditionRef.current) return;

    if (format === "epub" && renditionRef.current.themes) {
      const themes = renditionRef.current.themes;
      
      themes.override("background-color", theme.backgroundColor || "#ffffff");
      themes.override("color", theme.textColor || "#000000");
      themes.fontSize(`${theme.fontSize}px`);
      themes.override("font-family", theme.fontFamily);
      themes.override("line-height", theme.lineHeight.toString());
      themes.override("text-align", theme.textAlign);
      themes.override("padding-left", `${theme.marginHorizontal}px`);
      themes.override("padding-right", `${theme.marginHorizontal}px`);
      themes.override("padding-top", `${theme.marginVertical}px`);
      themes.override("padding-bottom", `${theme.marginVertical}px`);
    } else if (format === "pdf" && containerRef.current) {
      const canvas = containerRef.current.querySelector("canvas");
      if (canvas) {
        canvas.style.backgroundColor = theme.backgroundColor || "#ffffff";
      }
    }
  };

  if (error) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "20px",
        textAlign: "center",
      }}>
        <div>
          <h3 style={{ color: "#dc2626", marginBottom: "10px" }}>
            Error Loading Book
          </h3>
          <p style={{ color: "#666" }}>{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }}>
        <div>Loading book...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: theme.backgroundColor || "#ffffff",
      }}
    />
  );
};
