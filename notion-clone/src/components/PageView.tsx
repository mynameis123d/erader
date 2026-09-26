import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Page } from "../types";
import { useStore } from "../store";
import { Editor } from "./Editor";
import { Database, PROP_ICONS, PropHeaderMenu } from "./database/Database";
import { PropEditor } from "./database/cells";
import { EmojiPicker } from "./EmojiPicker";
import { anchorOf, MenuHeading, MenuItem, Popover, type Anchor } from "./Popover";
import { COVERS, coverStyle, randomCover } from "../covers";
import { randomEmoji } from "../emojis";
import { PROP_TYPES } from "../db";
import { navigate } from "../router";
import { childrenOf, newBlock, pageTitle } from "../utils";
import { IconImage, IconLock, IconPlus, IconSmile } from "./Icons";

function Title({ page, readOnly, onEnter }: { page: Page; readOnly: boolean; onEnter(): void }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const updatePage = useStore((s) => s.updatePage);
  useLayoutEffect(() => {
    if (ref.current && ref.current.textContent !== page.title) ref.current.textContent = page.title;
  }, [page.title]);
  // Freshly created pages start with the caret in the title, like Notion.
  useLayoutEffect(() => {
    if (!readOnly && !page.title && Date.now() - page.createdAt < 3000) ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);
  return (
    <h1
      ref={ref}
      className="page-title"
      contentEditable={!readOnly}
      suppressContentEditableWarning
      data-placeholder={page.kind === "database" ? "Untitled database" : "Untitled"}
      onInput={(e) => {
        const t = e.currentTarget.textContent || "";
        if (!t && e.currentTarget.innerHTML) e.currentTarget.innerHTML = "";
        updatePage(page.id, { title: t }, `title:${page.id}`);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || (e.key === "ArrowDown" && !e.shiftKey)) {
          e.preventDefault();
          onEnter();
        }
      }}
      onPaste={(e) => {
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain").replace(/\s*\n\s*/g, " "));
      }}
    />
  );
}

export function CoverPicker({ anchor, onPick, onClose }: { anchor: Anchor; onPick(c: string | null): void; onClose(): void }) {
  const [url, setUrl] = useState("");
  return (
    <Popover anchor={anchor} onClose={onClose} width={420} align="right">
      <MenuHeading>Gallery</MenuHeading>
      <div className="cover-grid">
        {Object.keys(COVERS).map((k) => (
          <button key={k} className="cover-swatch" style={{ background: COVERS[k] }} title={k} onClick={() => onPick(k)} />
        ))}
      </div>
      <MenuHeading>Link or upload</MenuHeading>
      <div className="cover-link">
        <input placeholder="Paste an image link…" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && url && onPick(url)} />
        <button className="btn primary" disabled={!url} onClick={() => onPick(url)}>
          Submit
        </button>
        <label className="btn">
          Upload
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 1.5 * 1024 * 1024) {
                useStore.getState().toast("Please choose an image under 1.5 MB");
                return;
              }
              const r = new FileReader();
              r.onload = () => onPick(String(r.result));
              r.readAsDataURL(f);
            }}
          />
        </label>
      </div>
      <div className="pad">
        <button className="btn" onClick={() => onPick(null)}>
          Remove cover
        </button>
      </div>
    </Popover>
  );
}

function RowProperties({ page }: { page: Page }) {
  const db = useStore((s) => (page.parentId ? s.pages[page.parentId] : undefined));
  const [menu, setMenu] = useState<{ propId: string; anchor: Anchor } | null>(null);
  const [adding, setAdding] = useState<Anchor | null>(null);
  if (!db?.db) return null;
  const props = db.db.props.filter((p) => p.type !== "title");
  const menuProp = menu ? db.db.props.find((p) => p.id === menu.propId) : null;
  return (
    <div className="row-props">
      {props.map((p) => {
        const Icon = PROP_ICONS[p.type];
        return (
          <div key={p.id} className="row-prop">
            <button className="row-prop-name" onClick={(e) => setMenu({ propId: p.id, anchor: anchorOf(e.currentTarget) })}>
              <Icon size={14} /> {p.name}
            </button>
            <div className="row-prop-value">
              <PropEditor dbId={db.id} row={page} prop={p} />
            </div>
          </div>
        );
      })}
      <button className="row-prop-add" onClick={(e) => setAdding(anchorOf(e.currentTarget))}>
        <IconPlus size={14} /> Add a property
      </button>
      {menu && menuProp && <PropHeaderMenu page={db} prop={menuProp} anchor={menu.anchor} onClose={() => setMenu(null)} />}
      {adding && (
        <Popover anchor={adding} onClose={() => setAdding(null)} width={220}>
          <MenuHeading>New property</MenuHeading>
          {PROP_TYPES.map((t) => {
            const Icon = PROP_ICONS[t.type];
            return (
              <MenuItem
                key={t.type}
                icon={<Icon />}
                label={t.label}
                onClick={() => {
                  useStore.getState().addProp(db.id, { name: t.label, type: t.type, options: ["select", "multi", "status"].includes(t.type) ? [] : undefined });
                  setAdding(null);
                }}
              />
            );
          })}
        </Popover>
      )}
    </div>
  );
}

function Backlinks({ page }: { page: Page }) {
  const pages = useStore((s) => s.pages);
  const [open, setOpen] = useState(false);
  const links = useMemo(() => {
    const marker = `data-page="${page.id}"`;
    return Object.values(pages).filter(
      (p) => p.id !== page.id && !p.trashed && p.blocks.some((b) => b.html.includes(marker) || (b.type === "page" && b.pageId === page.id && p.id !== page.parentId)),
    );
  }, [pages, page.id, page.parentId]);
  if (!links.length) return null;
  return (
    <div className="backlinks">
      <button className="backlinks-toggle" onClick={() => setOpen(!open)}>
        ↙ {links.length} backlink{links.length > 1 ? "s" : ""}
      </button>
      {open && (
        <div className="backlinks-list">
          {links.map((p) => (
            <a key={p.id} href={`#/${p.id}`} className="backlink">
              {p.icon || "📄"} {pageTitle(p)}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function SubPages({ page }: { page: Page }) {
  const pages = useStore((s) => s.pages);
  // Children that aren't linked from a page block (e.g. created from the sidebar before linking existed).
  const orphans = childrenOf(pages, page.id).filter((c) => !page.blocks.some((b) => b.type === "page" && b.pageId === c.id));
  if (!orphans.length) return null;
  return (
    <div className="subpages">
      {orphans.map((c) => (
        <a key={c.id} href={`#/${c.id}`} className="page-link">
          <span className="page-link-icon">{c.icon || (c.kind === "database" ? "🗃️" : "📄")}</span>
          <span className="page-link-title">{pageTitle(c)}</span>
        </a>
      ))}
    </div>
  );
}

export function PageView({ page, peek = false }: { page: Page; peek?: boolean }) {
  const updatePage = useStore((s) => s.updatePage);
  const setBlocks = useStore((s) => s.setBlocks);
  const [emojiAt, setEmojiAt] = useState<Anchor | null>(null);
  const [coverAt, setCoverAt] = useState<Anchor | null>(null);
  const readOnly = !!page.locked || page.trashed;
  const bg = coverStyle(page.cover);
  const isDb = page.kind === "database";

  const focusFirst = () => {
    if (isDb) return;
    const first = page.blocks[0];
    if (!first || first.type !== "text") {
      const nb = newBlock();
      setBlocks(page.id, [nb, ...page.blocks]);
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-block-id="${nb.id}"]`)?.focus());
    } else document.querySelector<HTMLElement>(`[data-page-id="${page.id}"] [data-block-id="${first.id}"]`)?.focus();
  };

  return (
    <div className={`page font-${page.font ?? "sans"}${page.smallText ? " small-text" : ""}${page.fullWidth || isDb ? " full-width" : ""}${peek ? " in-peek" : ""}`}>
      {page.trashed && (
        <div className="trash-banner">
          This page is in Trash.
          <button className="btn small" onClick={() => useStore.getState().restorePage(page.id)}>
            Restore page
          </button>
          <button
            className="btn small danger"
            onClick={() => {
              useStore.getState().deletePage(page.id);
              navigate(null);
            }}
          >
            Delete permanently
          </button>
        </div>
      )}
      {bg && (
        <div className="cover" style={{ background: bg }}>
          {!readOnly && (
            <div className="cover-actions">
              <button className="btn glass" onClick={(e) => setCoverAt(anchorOf(e.currentTarget, "right"))}>
                Change cover
              </button>
              <button className="btn glass" onClick={() => updatePage(page.id, { cover: null })}>
                Remove
              </button>
            </div>
          )}
        </div>
      )}
      <div className={`page-inner${bg ? " has-cover" : ""}${page.icon ? " has-icon" : ""}`}>
        {page.icon && (
          <button className="page-icon" disabled={readOnly} onClick={(e) => setEmojiAt(anchorOf(e.currentTarget))} aria-label="Change icon">
            {page.icon}
          </button>
        )}
        {!readOnly && (
          <div className="page-controls">
            {!page.icon && (
              <button className="ghost-btn" onClick={() => updatePage(page.id, { icon: randomEmoji() })}>
                <IconSmile size={14} /> Add icon
              </button>
            )}
            {!page.cover && (
              <button className="ghost-btn" onClick={() => updatePage(page.id, { cover: randomCover() })}>
                <IconImage size={14} /> Add cover
              </button>
            )}
            {page.locked && (
              <span className="ghost-btn">
                <IconLock size={14} /> Locked
              </span>
            )}
          </div>
        )}
        {page.locked && (
          <button className="lock-pill" onClick={() => updatePage(page.id, { locked: false })}>
            <IconLock size={12} /> Locked — click to unlock
          </button>
        )}
        <Title page={page} readOnly={readOnly} onEnter={focusFirst} />
        {page.isRow && <RowProperties page={page} />}
        {page.isRow && <div className="row-divider" />}
        {isDb ? <Database page={page} /> : <Editor page={page} readOnly={readOnly} />}
        {!isDb && <SubPages page={page} />}
        {!peek && <Backlinks page={page} />}
      </div>
      {emojiAt && (
        <EmojiPicker
          anchor={emojiAt}
          allowRemove
          onClose={() => setEmojiAt(null)}
          onPick={(icon) => {
            updatePage(page.id, { icon });
            setEmojiAt(null);
          }}
        />
      )}
      {coverAt && (
        <CoverPicker
          anchor={coverAt}
          onClose={() => setCoverAt(null)}
          onPick={(c) => {
            updatePage(page.id, { cover: c });
            setCoverAt(null);
          }}
        />
      )}
    </div>
  );
}
