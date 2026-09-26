import { useState } from "react";
import type { Page } from "../types";
import { useStore } from "../store";
import { ancestors, download, htmlToText, modKey, pageTitle, pageToMarkdown, timeAgo } from "../utils";
import { navigate } from "../router";
import { MenuItem, MenuSep, Popover, anchorOf, type Anchor } from "./Popover";
import { IconCopy, IconDots, IconDownload, IconLink, IconLock, IconMenu, IconRedo, IconStar, IconStarFill, IconTrash, IconUndo } from "./Icons";

function MoveTo({ page, anchor, onClose }: { page: Page; anchor: Anchor; onClose(): void }) {
  const pages = useStore((s) => s.pages);
  const [q, setQ] = useState("");
  const targets = Object.values(pages)
    .filter((p) => !p.trashed && !p.isRow && p.kind === "doc" && p.id !== page.id && p.id !== page.parentId)
    .filter((p) => !ancestors(pages, p.id).some((a) => a.id === page.id))
    .filter((p) => pageTitle(p).toLowerCase().includes(q.toLowerCase()))
    .slice(0, 30);
  return (
    <Popover anchor={anchor} onClose={onClose} width={300} align="right">
      <div className="menu-search">
        <input autoFocus placeholder="Move page to…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {page.parentId && (
        <MenuItem
          icon="🏠"
          label="Top level (Private)"
          onClick={() => {
            useStore.getState().movePage(page.id, null, Date.now());
            onClose();
          }}
        />
      )}
      {targets.map((t) => (
        <MenuItem
          key={t.id}
          icon={t.icon || "📄"}
          label={pageTitle(t)}
          onClick={() => {
            useStore.getState().movePage(page.id, t.id, Date.now());
            useStore.getState().toast(`Moved to ${pageTitle(t)}`);
            onClose();
          }}
        />
      ))}
    </Popover>
  );
}

function PageOptions({ page, anchor, onClose }: { page: Page; anchor: Anchor; onClose(): void }) {
  const s = useStore.getState();
  const [moveAt, setMoveAt] = useState<Anchor | null>(null);
  const words = page.blocks.reduce((n, b) => n + (htmlToText(b.html).match(/\S+/g)?.length ?? 0), 0);
  const set = (patch: Partial<Page>) => s.updatePage(page.id, patch);
  const fonts: { f: NonNullable<Page["font"]>; label: string }[] = [
    { f: "sans", label: "Default" },
    { f: "serif", label: "Serif" },
    { f: "mono", label: "Mono" },
  ];
  return (
    <Popover anchor={anchor} onClose={onClose} width={260} align="right">
      {page.kind === "doc" && (
        <>
          <div className="font-picker">
            {fonts.map((x) => (
              <button key={x.f} className={`font-opt font-${x.f}${(page.font ?? "sans") === x.f ? " active" : ""}`} onClick={() => set({ font: x.f })}>
                <span className="font-sample">Ag</span>
                <span>{x.label}</span>
              </button>
            ))}
          </div>
          <MenuSep />
          <MenuItem label="Small text" right={<Switch on={!!page.smallText} />} onClick={() => set({ smallText: !page.smallText })} />
          <MenuItem label="Full width" right={<Switch on={!!page.fullWidth} />} onClick={() => set({ fullWidth: !page.fullWidth })} />
        </>
      )}
      <MenuItem icon={<IconLock />} label="Lock page" right={<Switch on={!!page.locked} />} onClick={() => set({ locked: !page.locked })} />
      <MenuSep />
      <MenuItem
        icon={<IconLink />}
        label="Copy link"
        onClick={() => {
          navigator.clipboard?.writeText(location.href);
          s.toast("Link copied to clipboard");
          onClose();
        }}
      />
      <MenuItem
        icon={<IconCopy />}
        label="Duplicate"
        hint={`${modKey}+D`}
        onClick={() => {
          const id = s.duplicatePage(page.id);
          if (id) navigate(id);
          onClose();
        }}
      />
      {!page.isRow && <MenuItem icon="↪" label="Move to" onClick={() => setMoveAt(anchor)} />}
      <MenuItem
        icon={<IconDownload />}
        label="Export as Markdown"
        onClick={() => {
          download(`${pageTitle(page).replace(/[^\w\- ]+/g, "").trim() || "page"}.md`, pageToMarkdown(page, s.pages), "text/markdown");
          onClose();
        }}
      />
      <MenuItem
        icon="🖨️"
        label="Print / Save as PDF"
        onClick={() => {
          onClose();
          setTimeout(() => window.print(), 50);
        }}
      />
      <MenuItem
        icon={<IconTrash />}
        label="Move to Trash"
        danger
        onClick={() => {
          s.trashPage(page.id);
          if (page.parentId) navigate(page.parentId);
          onClose();
        }}
      />
      <MenuSep />
      <div className="menu-foot">
        {page.kind === "doc" && (
          <>
            Word count: {words.toLocaleString()}
            <br />
          </>
        )}
        Created {new Date(page.createdAt).toLocaleString()}
        <br />
        Last edited {timeAgo(page.updatedAt)}
      </div>
      {moveAt && <MoveTo page={page} anchor={moveAt} onClose={() => (setMoveAt(null), onClose())} />}
    </Popover>
  );
}

function Switch({ on }: { on: boolean }) {
  return <span className={`switch${on ? " on" : ""}`} />;
}

export function Topbar({ page, onToggleSidebar, sidebarOpen }: { page: Page | null; onToggleSidebar(): void; sidebarOpen: boolean }) {
  const pages = useStore((s) => s.pages);
  const canUndo = useStore((s) => s.history.past.length > 0);
  const canRedo = useStore((s) => s.history.future.length > 0);
  const [menuAt, setMenuAt] = useState<Anchor | null>(null);
  const crumbs = page ? ancestors(pages, page.id) : [];
  const shown = crumbs.length > 4 ? [crumbs[0], null, ...crumbs.slice(-2)] : crumbs;
  return (
    <header className="topbar">
      {!sidebarOpen && (
        <button className="icon-btn" onClick={onToggleSidebar} title={`Open sidebar (${modKey}+\\)`}>
          <IconMenu size={18} />
        </button>
      )}
      <nav className="crumbs">
        {shown.map((c, i) =>
          c ? (
            <span key={c.id} className="crumb-wrap">
              {i > 0 && <span className="crumb-sep">/</span>}
              <a className="crumb" href={`#/${c.id}`}>
                {c.icon && <span className="crumb-icon">{c.icon}</span>}
                <span className="crumb-title">{pageTitle(c)}</span>
              </a>
            </span>
          ) : (
            <span key="gap" className="crumb-wrap">
              <span className="crumb-sep">/</span>
              <span className="crumb muted">…</span>
            </span>
          ),
        )}
        {page?.locked && (
          <span className="muted crumb-lock">
            <IconLock size={12} />
          </span>
        )}
      </nav>
      {page && (
        <div className="top-actions">
          <span className="edited muted">Edited {timeAgo(page.updatedAt)}</span>
          <button className="icon-btn" disabled={!canUndo} onClick={() => useStore.getState().undo()} title={`Undo (${modKey}+Z)`}>
            <IconUndo size={16} />
          </button>
          <button className="icon-btn" disabled={!canRedo} onClick={() => useStore.getState().redo()} title={`Redo (${modKey}+Shift+Z)`}>
            <IconRedo size={16} />
          </button>
          <button
            className="btn small"
            onClick={() => {
              navigator.clipboard?.writeText(location.href);
              useStore.getState().toast("Link copied to clipboard");
            }}
          >
            Share
          </button>
          <button
            className={`icon-btn${page.favorite ? " fav" : ""}`}
            title={page.favorite ? "Remove from Favorites" : "Add to Favorites"}
            onClick={() => useStore.getState().updatePage(page.id, { favorite: !page.favorite })}
          >
            {page.favorite ? <IconStarFill size={16} /> : <IconStar size={16} />}
          </button>
          <button className="icon-btn" title="Style, export, and more…" onClick={(e) => setMenuAt(anchorOf(e.currentTarget, "right"))}>
            <IconDots size={18} />
          </button>
        </div>
      )}
      {menuAt && page && <PageOptions page={page} anchor={menuAt} onClose={() => setMenuAt(null)} />}
    </header>
  );
}
