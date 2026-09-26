import { useCallback, useEffect, useState } from "react";
import { useStore } from "./store";
import { navigate, useRoute } from "./router";
import { childrenOf, pageTitle } from "./utils";
import { Sidebar, addChildPage } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { PageView } from "./components/PageView";
import { FormatToolbar } from "./components/FormatToolbar";
import { Peek, SearchModal, TemplatesModal, Toasts } from "./components/Modals";

function useTheme() {
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
}

export default function App() {
  useTheme();
  const { pageId, peek } = useRoute();
  const pages = useStore((s) => s.pages);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebar = useStore((s) => s.setSidebar);
  const [search, setSearch] = useState(false);
  const [templates, setTemplates] = useState(false);
  const page = pageId ? pages[pageId] : null;

  // Default route: most recent page, else the first top-level page.
  useEffect(() => {
    if (page) return;
    const s = useStore.getState();
    const fallback = s.recent.find((id) => s.pages[id] && !s.pages[id].trashed) ?? childrenOf(s.pages, null)[0]?.id;
    if (fallback && fallback !== pageId) navigate(fallback);
  }, [page, pageId]);

  // On phones the sidebar is an overlay: get it out of the way after navigating.
  useEffect(() => {
    if (window.innerWidth < 700) setSidebar({ open: false });
  }, [pageId, setSidebar]);

  useEffect(() => {
    if (!page) return;
    useStore.getState().visit(page.id);
    document.title = `${page.icon ? page.icon + " " : ""}${pageTitle(page)} · Notebook`;
    // Rows open in the peek; if someone links straight to a row page, that's fine too.
  }, [page?.id, page?.title, page?.icon]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      const t = e.target as HTMLElement;
      const nativeField = t.closest?.("input, textarea");
      if (k === "k" || k === "p") {
        // Cmd+K inside a text selection is "add link"; let the editor have it.
        if (k === "k" && !window.getSelection()?.isCollapsed && t.closest?.("[contenteditable=true]")) return;
        e.preventDefault();
        setSearch((v) => !v);
      } else if (e.key === "\\") {
        e.preventDefault();
        setSidebar({ open: !useStore.getState().sidebarOpen });
      } else if (k === "z" && !nativeField) {
        e.preventDefault();
        if (e.shiftKey) useStore.getState().redo();
        else useStore.getState().undo();
      } else if (k === "y" && !nativeField) {
        e.preventDefault();
        useStore.getState().redo();
      } else if (e.altKey && k === "n") {
        e.preventDefault();
        navigate(addChildPage(null));
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [setSidebar]);

  const closePeek = useCallback(() => pageId && navigate(pageId), [pageId]);
  const closeSearch = useCallback(() => setSearch(false), []);
  const closeTemplates = useCallback(() => setTemplates(false), []);

  return (
    <div className={`app${sidebarOpen ? "" : " sidebar-closed"}`}>
      {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebar({ open: false })} />}
      {sidebarOpen && <Sidebar currentId={pageId} onSearch={() => setSearch(true)} onTemplates={() => setTemplates(true)} />}
      <main className="main">
        <Topbar page={page} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebar({ open: true })} />
        <div className="scroller">
          {page ? (
            <PageView key={page.id} page={page} />
          ) : (
            <div className="empty-state">
              <div className="empty-emoji">📝</div>
              <h2>Nothing here yet</h2>
              <p className="muted">Create a page to get started.</p>
              <button className="btn primary" onClick={() => navigate(addChildPage(null))}>
                New page
              </button>
            </div>
          )}
        </div>
      </main>
      {peek && pages[peek] && <Peek id={peek} onClose={closePeek} />}
      {search && <SearchModal onClose={closeSearch} />}
      {templates && <TemplatesModal onClose={closeTemplates} />}
      <FormatToolbar />
      <Toasts />
    </div>
  );
}
