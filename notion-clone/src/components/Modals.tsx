import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "../store";
import { ancestors, escapeHtml, htmlToText, pageTitle, timeAgo, modKey } from "../utils";
import { navigate } from "../router";
import { TEMPLATES } from "../seed";
import { IconArrowUpRight, IconClose, IconSearch } from "./Icons";
import { PageView } from "./PageView";

function Modal({ onClose, children, className = "" }: { onClose(): void; children: React.ReactNode; className?: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${className}`} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>,
    document.body,
  );
}

function highlightMatch(text: string, q: string) {
  if (!q) return escapeHtml(text);
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return escapeHtml(text);
  return escapeHtml(text.slice(0, i)) + "<mark>" + escapeHtml(text.slice(i, i + q.length)) + "</mark>" + escapeHtml(text.slice(i + q.length));
}

export function SearchModal({ onClose }: { onClose(): void }) {
  const pages = useStore((s) => s.pages);
  const recent = useStore((s) => s.recent);
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const list = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const live = Object.values(pages).filter((p) => !p.trashed);
    if (!query) {
      const rec = recent.map((id) => pages[id]).filter((p) => p && !p.trashed);
      const rest = live.filter((p) => !recent.includes(p.id)).sort((a, b) => b.updatedAt - a.updatedAt);
      return [...rec, ...rest].slice(0, 12).map((p) => ({ page: p, snippet: "" }));
    }
    const scored: { page: (typeof live)[number]; snippet: string; score: number }[] = [];
    for (const p of live) {
      const title = pageTitle(p).toLowerCase();
      let score = 0;
      let snippet = "";
      if (title === query) score = 100;
      else if (title.startsWith(query)) score = 80;
      else if (title.includes(query)) score = 60;
      for (const b of p.blocks) {
        const t = htmlToText(b.html);
        const i = t.toLowerCase().indexOf(query);
        if (i >= 0) {
          if (!score) score = 20;
          const start = Math.max(0, i - 40);
          snippet = (start > 0 ? "…" : "") + t.slice(start, i + query.length + 60);
          break;
        }
      }
      if (score) scored.push({ page: p, snippet, score: score + p.updatedAt / 1e13 });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, 30);
  }, [pages, recent, q]);

  useEffect(() => setIndex(0), [q]);
  useEffect(() => {
    list.current?.querySelector(".active")?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const go = (id: string) => {
    const p = pages[id];
    if (p?.isRow && p.parentId) navigate(p.parentId, p.id);
    else navigate(id);
    onClose();
  };

  return (
    <Modal onClose={onClose} className="search-modal">
      <div className="search-input">
        <IconSearch size={18} />
        <input
          autoFocus
          placeholder="Search or jump to a page…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(results.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter" && results[index]) go(results[index].page.id);
          }}
        />
      </div>
      <div className="search-results" ref={list}>
        {!q && <div className="menu-heading">Recent</div>}
        {results.map(({ page, snippet }, i) => {
          const path = ancestors(pages, page.id)
            .slice(0, -1)
            .map((a) => pageTitle(a))
            .join(" / ");
          return (
            <button key={page.id} className={`search-row${i === index ? " active" : ""}`} onMouseEnter={() => setIndex(i)} onClick={() => go(page.id)}>
              <span className="search-icon">{page.icon || (page.kind === "database" ? "🗃️" : "📄")}</span>
              <span className="search-main">
                <span className="search-title" dangerouslySetInnerHTML={{ __html: highlightMatch(pageTitle(page), q.trim()) }} />
                {path && <span className="search-path">— {path}</span>}
                {snippet && <span className="search-snippet" dangerouslySetInnerHTML={{ __html: highlightMatch(snippet, q.trim()) }} />}
              </span>
              <span className="search-time">{timeAgo(page.updatedAt)}</span>
            </button>
          );
        })}
        {q && !results.length && <div className="muted pad center">No results for “{q}”</div>}
      </div>
      <div className="search-foot">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> to navigate
        </span>
        <span>
          <kbd>↵</kbd> to open
        </span>
        <span>
          <kbd>esc</kbd> to close
        </span>
        <span className="push">
          <kbd>{modKey}K</kbd> anywhere
        </span>
      </div>
    </Modal>
  );
}

export function TemplatesModal({ onClose }: { onClose(): void }) {
  const [sel, setSel] = useState(TEMPLATES[0].id);
  const t = TEMPLATES.find((x) => x.id === sel)!;
  const use = () => {
    const s = useStore.getState();
    const roots = Object.values(s.pages).filter((p) => !p.parentId);
    const order = roots.length ? Math.max(...roots.map((p) => p.order)) + 1 : 0;
    const built = t.build(null, order);
    s.replaceWorkspace({ ...s.pages, ...Object.fromEntries(built.map((p) => [p.id, p])) });
    navigate(built[0].id);
    s.toast(`Added “${t.name}”`);
    onClose();
  };
  return (
    <Modal onClose={onClose} className="templates-modal">
      <div className="tpl-side">
        <div className="tpl-heading">Templates</div>
        {TEMPLATES.map((x) => (
          <button key={x.id} className={`tpl-item${x.id === sel ? " active" : ""}`} onClick={() => setSel(x.id)} onDoubleClick={use}>
            <span className="tpl-icon">{x.icon}</span>
            <span>
              <span className="tpl-name">{x.name}</span>
              <span className="tpl-desc">{x.description}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="tpl-preview">
        <div className="tpl-preview-head">
          <span className="tpl-big-icon">{t.icon}</span>
          <div>
            <div className="tpl-title">{t.name}</div>
            <div className="muted">{t.description}</div>
          </div>
          <button className="btn primary push" onClick={use}>
            Use this template
          </button>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose size={16} />
          </button>
        </div>
        <TemplatePreview id={t.id} />
      </div>
    </Modal>
  );
}

function TemplatePreview({ id }: { id: string }) {
  const built = useMemo(() => TEMPLATES.find((x) => x.id === id)!.build(null, 0), [id]);
  const main = built[0];
  const rows = built.slice(1);
  return (
    <div className="tpl-preview-body">
      {main.kind === "database" ? (
        <div className="tpl-rows">
          {rows.map((r) => (
            <div key={r.id} className="tpl-row">
              {r.icon} {pageTitle(r)}
            </div>
          ))}
        </div>
      ) : (
        main.blocks.map((b) => (
          <div key={b.id} className={`tpl-block t-${b.type}`} style={{ paddingLeft: b.indent * 20 }}>
            {b.type === "todo" ? "☐ " : b.type === "bullet" ? "• " : b.type === "number" ? "1. " : b.type === "toggle" ? "▸ " : ""}
            {htmlToText(b.html) || (b.type === "divider" ? "―――" : b.type === "toc" ? "Table of contents" : " ")}
          </div>
        ))
      )}
    </div>
  );
}

export function Peek({ id, onClose }: { id: string; onClose(): void }) {
  const page = useStore((s) => s.pages[id]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !(e.target as HTMLElement).closest("input, textarea, [contenteditable=true], .popover")) onClose();
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  if (!page) return null;
  return createPortal(
    <div className="peek-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="peek">
        <div className="peek-bar">
          <button className="icon-btn" onClick={onClose} title="Close (Esc)">
            <IconClose size={16} />
          </button>
          <button className="btn small" onClick={() => navigate(page.id)}>
            <IconArrowUpRight size={13} /> Open as page
          </button>
          <span className="muted push small">Edited {timeAgo(page.updatedAt)}</span>
        </div>
        <div className="peek-body">
          <PageView page={page} peek />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return createPortal(
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span>{t.text}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.run();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>,
    document.body,
  );
}
