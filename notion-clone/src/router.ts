import { useEffect, useState } from "react";

/** Minimal hash router: `#/<pageId>` opens a page, `#/<pageId>?peek=<rowId>` opens a row in the side peek. */
export function parseHash(): { pageId: string | null; peek: string | null } {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [path, query = ""] = raw.split("?");
  const peek = new URLSearchParams(query).get("peek");
  return { pageId: path || null, peek };
}

const listeners = new Set<() => void>();

export function navigate(pageId: string | null, peek?: string | null) {
  const hash = pageId ? `#/${pageId}${peek ? `?peek=${peek}` : ""}` : "#/";
  if (window.location.hash === hash) return;
  window.location.hash = hash;
  // hashchange fires asynchronously; update right away so focus lands on the new page immediately.
  listeners.forEach((l) => l());
}

export function useRoute() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const on = () =>
      setRoute((prev) => {
        const next = parseHash();
        return prev.pageId === next.pageId && prev.peek === next.peek ? prev : next;
      });
    window.addEventListener("hashchange", on);
    listeners.add(on);
    return () => {
      window.removeEventListener("hashchange", on);
      listeners.delete(on);
    };
  }, []);
  return route;
}
