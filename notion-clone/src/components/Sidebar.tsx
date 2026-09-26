import { useState } from "react";
import type { Page } from "../types";
import { useStore } from "../store";
import { childrenOf, download, modKey, newBlock, pageTitle, timeAgo } from "../utils";
import { navigate } from "../router";
import { createDatabase } from "../db";
import { seedWorkspace } from "../seed";
import { anchorOf, MenuHeading, MenuItem, MenuSep, Popover, type Anchor } from "./Popover";
import {
  IconChevronRight,
  IconChevronsLeft,
  IconDots,
  IconPlus,
  IconSearch,
  IconSettings,
  IconStar,
  IconTemplate,
  IconTrash,
  IconCopy,
  IconLink,
  IconUpload,
  IconDownload,
  IconSun,
  IconMoon,
  IconDatabase,
  IconHome,
} from "./Icons";
import type { Theme } from "../types";

interface Props {
  currentId: string | null;
  onSearch(): void;
  onTemplates(): void;
}

const DRAG = "application/x-notebook-page";

/** Create a sub-page and link it from the parent document so it shows up inline too. */
export function addChildPage(parentId: string | null, init: Partial<Page> = {}) {
  const s = useStore.getState();
  const id = s.createPage(parentId, init);
  const parent = parentId ? s.pages[parentId] : null;
  if (parent && parent.kind === "doc") {
    const blocks = parent.blocks;
    const last = blocks[blocks.length - 1];
    const trimmed = last && last.type === "text" && !last.html ? blocks.slice(0, -1) : blocks;
    s.setBlocks(parent.id, [...trimmed, newBlock("page", "", { pageId: id }), newBlock()]);
  }
  return id;
}

function TreeItem({ page, depth, currentId }: { page: Page; depth: number; currentId: string | null }) {
  const pages = useStore((s) => s.pages);
  const updatePage = useStore((s) => s.updatePage);
  const [menu, setMenu] = useState<Anchor | null>(null);
  const [drop, setDrop] = useState<"before" | "after" | "inside" | null>(null);
  const kids = page.kind === "database" ? [] : childrenOf(pages, page.id);
  const expanded = !!page.expanded;
  const active = currentId === page.id;

  return (
    <>
      <div
        className={`tree-item${active ? " active" : ""}${drop ? ` drop-${drop}` : ""}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG, page.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(DRAG)) return;
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          const y = e.clientY - r.top;
          setDrop(y < r.height * 0.28 ? "before" : y > r.height * 0.72 ? "after" : page.kind === "database" ? "after" : "inside");
        }}
        onDragLeave={() => setDrop(null)}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData(DRAG);
          const where = drop;
          setDrop(null);
          if (!id || id === page.id) return;
          const s = useStore.getState();
          if (where === "inside") {
            const last = childrenOf(s.pages, page.id).at(-1);
            s.movePage(id, page.id, last ? last.order + 1 : 0);
          } else {
            const sibs = childrenOf(s.pages, page.parentId).filter((p) => p.id !== id);
            const i = sibs.findIndex((p) => p.id === page.id);
            const order =
              where === "before"
                ? i > 0
                  ? (sibs[i - 1].order + page.order) / 2
                  : page.order - 1
                : i < sibs.length - 1
                  ? (page.order + sibs[i + 1].order) / 2
                  : page.order + 1;
            s.movePage(id, page.parentId, order);
          }
        }}
        onClick={() => navigate(page.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <button
          className={`tree-toggle${expanded ? " open" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            updatePage(page.id, { expanded: !expanded }, `expand:${page.id}`);
          }}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <span className="tree-icon-emoji">{page.icon || (page.kind === "database" ? "🗃️" : "📄")}</span>
          <IconChevronRight size={14} className="tree-chevron" />
        </button>
        <span className="tree-title">{pageTitle(page)}</span>
        <span className="tree-actions">
          <button
            className="icon-btn small"
            title="Delete, duplicate, and more…"
            onClick={(e) => {
              e.stopPropagation();
              setMenu(anchorOf(e.currentTarget));
            }}
          >
            <IconDots size={14} />
          </button>
          {page.kind !== "database" && (
            <button
              className="icon-btn small"
              title="Add a page inside"
              onClick={(e) => {
                e.stopPropagation();
                navigate(addChildPage(page.id));
              }}
            >
              <IconPlus size={14} />
            </button>
          )}
        </span>
      </div>
      {expanded && page.kind !== "database" && (
        <>
          {kids.map((k) => (
            <TreeItem key={k.id} page={k} depth={depth + 1} currentId={currentId} />
          ))}
          {!kids.length && (
            <div className="tree-empty" style={{ paddingLeft: 30 + depth * 14 }}>
              No pages inside
            </div>
          )}
        </>
      )}
      {menu && <PageMenu page={page} anchor={menu} onClose={() => setMenu(null)} />}
    </>
  );
}

export function PageMenu({ page, anchor, onClose }: { page: Page; anchor: Anchor; onClose(): void }) {
  const s = useStore.getState();
  return (
    <Popover anchor={anchor} onClose={onClose} width={240}>
      <MenuItem
        icon={<IconStar />}
        label={page.favorite ? "Remove from Favorites" : "Add to Favorites"}
        onClick={() => {
          s.updatePage(page.id, { favorite: !page.favorite });
          onClose();
        }}
      />
      <MenuItem
        icon={<IconLink />}
        label="Copy link"
        onClick={() => {
          navigator.clipboard?.writeText(`${location.origin}${location.pathname}#/${page.id}`);
          s.toast("Link copied");
          onClose();
        }}
      />
      <MenuItem
        icon={<IconCopy />}
        label="Duplicate"
        onClick={() => {
          const id = s.duplicatePage(page.id);
          if (id) navigate(id);
          onClose();
        }}
      />
      <MenuItem icon={<IconTrash />} label="Move to Trash" danger onClick={() => (s.trashPage(page.id), onClose())} />
      <MenuSep />
      <div className="menu-foot">Last edited {timeAgo(page.updatedAt)}</div>
    </Popover>
  );
}

function TrashPanel({ anchor, onClose }: { anchor: Anchor; onClose(): void }) {
  const pages = useStore((s) => s.pages);
  const [q, setQ] = useState("");
  const s = useStore.getState();
  const trashed = Object.values(pages)
    .filter((p) => p.trashed && !(p.parentId && pages[p.parentId]?.trashed))
    .filter((p) => pageTitle(p).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0));
  return (
    <Popover anchor={anchor} onClose={onClose} width={380} className="trash-panel">
      <div className="menu-search">
        <input autoFocus placeholder="Filter by page title…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="trash-list">
        {!trashed.length && <div className="muted pad center">Trash is empty 🎉</div>}
        {trashed.map((p) => (
          <div key={p.id} className="trash-row" onClick={() => (navigate(p.id), onClose())}>
            <span>{p.icon || "📄"}</span>
            <span className="trash-title">
              {pageTitle(p)}
              {p.parentId && pages[p.parentId] && <span className="muted small"> in {pageTitle(pages[p.parentId])}</span>}
            </span>
            <button className="icon-btn small" title="Restore" onClick={(e) => (e.stopPropagation(), s.restorePage(p.id))}>
              ↺
            </button>
            <button className="icon-btn small" title="Delete permanently" onClick={(e) => (e.stopPropagation(), s.deletePage(p.id))}>
              <IconTrash size={14} />
            </button>
          </div>
        ))}
      </div>
      {trashed.length > 0 && (
        <div className="pad">
          <button className="btn danger small" onClick={() => s.emptyTrash()}>
            Empty trash
          </button>
        </div>
      )}
    </Popover>
  );
}

function SettingsPanel({ anchor, onClose }: { anchor: Anchor; onClose(): void }) {
  const theme = useStore((s) => s.theme);
  const s = useStore.getState();
  const themes: { t: Theme; label: string; icon: React.ReactNode }[] = [
    { t: "system", label: "Use system setting", icon: "🖥️" },
    { t: "light", label: "Light", icon: <IconSun /> },
    { t: "dark", label: "Dark", icon: <IconMoon /> },
  ];
  return (
    <Popover anchor={anchor} onClose={onClose} width={260}>
      <MenuHeading>Appearance</MenuHeading>
      {themes.map((x) => (
        <MenuItem key={x.t} icon={x.icon} label={x.label} active={theme === x.t} onClick={() => s.setTheme(x.t)} />
      ))}
      <MenuSep />
      <MenuHeading>Workspace data</MenuHeading>
      <MenuItem
        icon={<IconDownload />}
        label="Export workspace (JSON)"
        onClick={() => {
          download(`notebook-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ version: 1, pages: s.pages }, null, 2), "application/json");
          onClose();
        }}
      />
      <label className="menu-item">
        <span className="menu-icon">
          <IconUpload />
        </span>
        <span className="menu-label">Import workspace…</span>
        <input
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            f.text().then((txt) => {
              try {
                const data = JSON.parse(txt);
                if (!data.pages || typeof data.pages !== "object") throw new Error("bad file");
                s.replaceWorkspace(data.pages);
                s.toast("Workspace imported", { label: "Undo", run: () => useStore.getState().undo() });
                navigate(null);
              } catch {
                s.toast("That file isn't a Notebook export");
              }
            });
            onClose();
          }}
        />
      </label>
      <MenuItem
        icon="↺"
        label="Reset to demo workspace"
        danger
        onClick={() => {
          s.replaceWorkspace(seedWorkspace());
          s.toast("Workspace reset", { label: "Undo", run: () => useStore.getState().undo() });
          navigate(null);
          onClose();
        }}
      />
      <MenuSep />
      <div className="menu-foot">Everything is stored locally in this browser.</div>
    </Popover>
  );
}

export function Sidebar({ currentId, onSearch, onTemplates }: Props) {
  const pages = useStore((s) => s.pages);
  const width = useStore((s) => s.sidebarWidth);
  const setSidebar = useStore((s) => s.setSidebar);
  const [trashAt, setTrashAt] = useState<Anchor | null>(null);
  const [settingsAt, setSettingsAt] = useState<Anchor | null>(null);
  const [rootDrop, setRootDrop] = useState(false);
  const [showFav, setShowFav] = useState(true);
  const [showPriv, setShowPriv] = useState(true);
  const roots = childrenOf(pages, null);
  const favorites = Object.values(pages)
    .filter((p) => p.favorite && !p.trashed)
    .sort((a, b) => a.createdAt - b.createdAt);
  const trashCount = Object.values(pages).filter((p) => p.trashed).length;

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const sx = e.clientX;
    const sw = width;
    document.body.classList.add("resizing");
    const move = (ev: MouseEvent) => setSidebar({ width: sw + ev.clientX - sx });
    const up = () => {
      document.body.classList.remove("resizing");
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  return (
    <aside className="sidebar" style={{ width }}>
      <div className="sb-top">
        <div className="workspace">
          <span className="ws-avatar">N</span>
          <span className="ws-name">Notebook</span>
          <button className="icon-btn small sb-collapse" title={`Close sidebar (${modKey}+\\)`} onClick={() => setSidebar({ open: false })}>
            <IconChevronsLeft size={16} />
          </button>
        </div>
        <button className="sb-item" onClick={onSearch}>
          <IconSearch size={16} /> <span>Search</span> <kbd>{modKey}K</kbd>
        </button>
        <button className="sb-item" onClick={() => navigate(roots[0]?.id ?? null)}>
          <IconHome size={16} /> <span>Home</span>
        </button>
        <button className="sb-item" onClick={(e) => setSettingsAt(anchorOf(e.currentTarget))}>
          <IconSettings size={16} /> <span>Settings</span>
        </button>
        <button
          className="sb-item"
          onClick={() => {
            navigate(addChildPage(null));
          }}
        >
          <IconPlus size={16} /> <span>New page</span>
        </button>
      </div>

      <div className="sb-scroll">
        {favorites.length > 0 && (
          <div className="sb-section">
            <button className="sb-heading" onClick={() => setShowFav(!showFav)}>
              Favorites
            </button>
            {showFav && favorites.map((p) => <TreeItem key={"fav" + p.id} page={p} depth={0} currentId={currentId} />)}
          </div>
        )}
        <div
          className={`sb-section${rootDrop ? " root-drop" : ""}`}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes(DRAG) && (e.target as HTMLElement).classList.contains("sb-heading")) {
              e.preventDefault();
              setRootDrop(true);
            }
          }}
          onDragLeave={() => setRootDrop(false)}
          onDrop={(e) => {
            setRootDrop(false);
            const id = e.dataTransfer.getData(DRAG);
            if (id && (e.target as HTMLElement).classList.contains("sb-heading")) {
              const first = childrenOf(useStore.getState().pages, null)[0];
              useStore.getState().movePage(id, null, first ? first.order - 1 : 0);
            }
          }}
        >
          <div className="sb-heading-row">
            <button className="sb-heading" onClick={() => setShowPriv(!showPriv)}>
              Private
            </button>
            <button className="icon-btn small" title="Add a page" onClick={() => navigate(addChildPage(null))}>
              <IconPlus size={14} />
            </button>
          </div>
          {showPriv && roots.map((p) => <TreeItem key={p.id} page={p} depth={0} currentId={currentId} />)}
          {showPriv && (
            <button className="sb-item faint" onClick={() => navigate(addChildPage(null))}>
              <IconPlus size={14} /> <span>Add a page</span>
            </button>
          )}
        </div>
      </div>

      <div className="sb-bottom">
        <button className="sb-item" onClick={() => navigate(createDatabase(null, "New database"))}>
          <IconDatabase size={16} /> <span>New database</span>
        </button>
        <button className="sb-item" onClick={onTemplates}>
          <IconTemplate size={16} /> <span>Templates</span>
        </button>
        <button className="sb-item" onClick={(e) => setTrashAt(anchorOf(e.currentTarget))}>
          <IconTrash size={16} /> <span>Trash</span>
          {trashCount > 0 && <span className="sb-count">{trashCount}</span>}
        </button>
      </div>
      <div className="sb-resizer" onMouseDown={startResize} onDoubleClick={() => setSidebar({ width: 248 })} />
      {trashAt && <TrashPanel anchor={trashAt} onClose={() => setTrashAt(null)} />}
      {settingsAt && <SettingsPanel anchor={settingsAt} onClose={() => setSettingsAt(null)} />}
    </aside>
  );
}
