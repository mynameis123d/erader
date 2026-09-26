import { memo, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as RKE } from "react";
import type { Block, Page } from "../types";
import { useStore } from "../store";
import { COLOR_VALUES, CODE_LANGS } from "../blockTypes";
import { highlight } from "../highlight";
import { escapeHtml, htmlToText, pageTitle } from "../utils";
import { navigate } from "../router";
import { IconCopy, IconGrip, IconImage, IconPlus } from "./Icons";
import { EmojiPicker } from "./EmojiPicker";
import { anchorOf, type Anchor } from "./Popover";

export interface BlockHandlers {
  register(id: string, el: HTMLElement | null): void;
  onKeyDown(e: RKE<HTMLElement>, block: Block): void;
  onInput(block: Block, el: HTMLElement, data: string | null): void;
  onPaste(e: React.ClipboardEvent<HTMLElement>, block: Block): void;
  onFocus(block: Block): void;
  update(block: Block, patch: Partial<Block>, key?: string): void;
  openBlockMenu(block: Block, anchor: Anchor): void;
  addBelow(block: Block): void;
  selectBlock(block: Block, additive: boolean): void;
  dragStart(e: React.DragEvent, block: Block): void;
  codeKeyDown(e: RKE<HTMLTextAreaElement>, block: Block): void;
}

interface Props {
  block: Block;
  number?: number;
  pageId: string;
  readOnly: boolean;
  selected: boolean;
  dropPos: "before" | "after" | "inside" | null;
  handlers: BlockHandlers;
  headings: Block[];
}

const PLACEHOLDERS: Partial<Record<Block["type"], string>> = {
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  bullet: "List",
  number: "List",
  todo: "To-do",
  toggle: "Toggle",
  quote: "Empty quote",
  callout: "Type something…",
};

const BULLETS = ["•", "◦", "▪"];

function Editable({
  block,
  readOnly,
  handlers,
  className,
  placeholder,
}: {
  block: Block;
  readOnly: boolean;
  handlers: BlockHandlers;
  className: string;
  placeholder: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== block.html) el.innerHTML = block.html;
  }, [block.html]);

  useEffect(() => {
    handlers.register(block.id, ref.current);
    return () => handlers.register(block.id, null);
  }, [block.id, handlers]);

  return (
    <div
      ref={ref}
      className={`block-content ${className}`}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      spellCheck
      data-placeholder={placeholder}
      data-block-id={block.id}
      style={{
        color: block.color && block.color !== "default" ? COLOR_VALUES[block.color].text : undefined,
      }}
      onKeyDown={(e) => handlers.onKeyDown(e, block)}
      onInput={(e) => handlers.onInput(block, e.currentTarget, (e.nativeEvent as InputEvent).data ?? null)}
      onPaste={(e) => handlers.onPaste(e, block)}
      onFocus={() => handlers.onFocus(block)}
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest("a");
        if (!a) return;
        const pid = a.getAttribute("data-page");
        if (pid) {
          e.preventDefault();
          navigate(pid);
        } else if (a.getAttribute("href") && (e.metaKey || e.ctrlKey || readOnly)) {
          e.preventDefault();
          window.open(a.getAttribute("href")!, "_blank", "noopener");
        }
      }}
    />
  );
}

function CodeBlock({ block, readOnly, handlers }: { block: Block; readOnly: boolean; handlers: BlockHandlers }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const text = htmlToText(block.html);
  const [copied, setCopied] = useState(false);
  const lang = block.lang || "plain";

  useEffect(() => {
    handlers.register(block.id, ref.current);
    return () => handlers.register(block.id, null);
  }, [block.id, handlers]);

  return (
    <div className="code-block">
      <div className="code-toolbar">
        <select
          value={lang}
          disabled={readOnly}
          onChange={(e) => handlers.update(block, { lang: e.target.value })}
          aria-label="Code language"
        >
          {CODE_LANGS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <button
          className="code-copy"
          onClick={() => {
            navigator.clipboard?.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          <IconCopy size={13} /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="code-area">
        <pre className="code-highlight" aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlight(text, lang) + "\n" }} />
        <textarea
          ref={ref}
          className="code-input"
          value={text}
          readOnly={readOnly}
          spellCheck={false}
          data-block-id={block.id}
          onChange={(e) => handlers.update(block, { html: escapeHtml(e.target.value) }, `type:${block.id}`)}
          onKeyDown={(e) => handlers.codeKeyDown(e, block)}
          onFocus={() => handlers.onFocus(block)}
          placeholder="// Write some code"
        />
      </div>
    </div>
  );
}

function ImageBlock({ block, readOnly, handlers }: { block: Block; readOnly: boolean; handlers: BlockHandlers }) {
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  if (!block.url) {
    return (
      <div className="image-empty">
        <div className="image-empty-title">
          <IconImage /> Add an image
        </div>
        {!readOnly && (
          <div className="image-empty-row">
            <input
              placeholder="Paste an image link…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && url.trim()) handlers.update(block, { url: url.trim() });
              }}
            />
            <button className="btn primary" disabled={!url.trim()} onClick={() => handlers.update(block, { url: url.trim() })}>
              Embed
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
                    setErr("Images are stored in your browser — please use one under 1.5 MB, or embed a link.");
                    return;
                  }
                  const r = new FileReader();
                  r.onload = () => handlers.update(block, { url: String(r.result) });
                  r.readAsDataURL(f);
                }}
              />
            </label>
          </div>
        )}
        {err && <div className="image-err">{err}</div>}
      </div>
    );
  }
  return (
    <figure className="image-block">
      <img src={block.url} alt={htmlToText(block.html)} draggable={false} />
      <Editable block={block} readOnly={readOnly} handlers={handlers} className="image-caption" placeholder="Write a caption…" />
    </figure>
  );
}

function PageLink({ pageId }: { pageId?: string }) {
  const p = useStore((s) => (pageId ? s.pages[pageId] : undefined)) as Page | undefined;
  if (!p) return <div className="page-link missing">Page not found</div>;
  return (
    <a
      className={`page-link${p.trashed ? " trashed" : ""}`}
      href={`#/${p.id}`}
      onClick={(e) => {
        e.preventDefault();
        navigate(p.id);
      }}
      draggable={false}
    >
      <span className="page-link-icon">{p.icon || (p.kind === "database" ? "🗃️" : "📄")}</span>
      <span className="page-link-title">{pageTitle(p)}</span>
      {p.trashed && <span className="muted"> (in trash)</span>}
    </a>
  );
}

function Toc({ headings }: { headings: Block[] }) {
  if (!headings.length) return <div className="toc muted">Add headings to create a table of contents.</div>;
  return (
    <nav className="toc">
      {headings.map((h) => (
        <a
          key={h.id}
          className={`toc-item toc-${h.type}`}
          href={`#${h.id}`}
          onClick={(e) => {
            e.preventDefault();
            document.querySelector(`[data-row-id="${h.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          {htmlToText(h.html) || "Untitled"}
        </a>
      ))}
    </nav>
  );
}

function BlockView({ block, number, readOnly, selected, dropPos, handlers, headings }: Props) {
  const [emojiAt, setEmojiAt] = useState<Anchor | null>(null);
  const t = block.type;
  const ph = PLACEHOLDERS[t] ?? "Type '/' for commands";
  const bg = block.bg && block.bg !== "default" ? COLOR_VALUES[block.bg].bg : undefined;

  let body: React.ReactNode;
  switch (t) {
    case "divider":
      body = (
        <div className="divider" onClick={(e) => handlers.selectBlock(block, e.shiftKey)}>
          <hr />
        </div>
      );
      break;
    case "code":
      body = <CodeBlock block={block} readOnly={readOnly} handlers={handlers} />;
      break;
    case "image":
      body = <ImageBlock block={block} readOnly={readOnly} handlers={handlers} />;
      break;
    case "page":
      body = <PageLink pageId={block.pageId} />;
      break;
    case "toc":
      body = <Toc headings={headings} />;
      break;
    default: {
      const editable = <Editable block={block} readOnly={readOnly} handlers={handlers} className={`t-${t}${block.checked && t === "todo" ? " checked" : ""}`} placeholder={ph} />;
      let marker: React.ReactNode = null;
      if (t === "bullet") marker = <span className="marker bullet">{BULLETS[block.indent % 3]}</span>;
      else if (t === "number") marker = <span className="marker number">{number ?? 1}.</span>;
      else if (t === "todo")
        marker = (
          <span className="marker">
            <input
              type="checkbox"
              className="todo-check"
              checked={!!block.checked}
              disabled={readOnly}
              onChange={(e) => handlers.update(block, { checked: e.target.checked })}
              aria-label="Done"
            />
          </span>
        );
      else if (t === "toggle")
        marker = (
          <span className="marker">
            <button
              className={`toggle-arrow${block.collapsed ? "" : " open"}`}
              onClick={() => handlers.update(block, { collapsed: !block.collapsed })}
              aria-label={block.collapsed ? "Expand" : "Collapse"}
            >
              ▶
            </button>
          </span>
        );
      else if (t === "callout")
        marker = (
          <span className="marker callout-icon">
            <button disabled={readOnly} onClick={(e) => setEmojiAt(anchorOf(e.currentTarget))}>
              {block.icon || "💡"}
            </button>
          </span>
        );
      body = (
        <div className={`block-body kind-${t}`} style={t === "callout" ? { background: bg ?? "var(--callout-bg)" } : undefined}>
          {marker}
          {editable}
        </div>
      );
    }
  }

  return (
    <div
      className={`block-row${selected ? " selected" : ""}${dropPos ? ` drop-${dropPos}` : ""} row-${t}`}
      data-row-id={block.id}
      id={t.startsWith("h") ? block.id : undefined}
      style={{ paddingLeft: block.indent * 26, background: t !== "callout" ? bg : undefined }}
    >
      {!readOnly && (
        <div className="block-gutter" style={{ left: block.indent * 26 - 50 }}>
          <button className="gutter-btn" title="Click to add below" onClick={() => handlers.addBelow(block)}>
            <IconPlus size={16} />
          </button>
          <button
            className="gutter-btn grip"
            title="Drag to move · Click to open menu"
            draggable
            onDragStart={(e) => handlers.dragStart(e, block)}
            onClick={(e) => handlers.openBlockMenu(block, anchorOf(e.currentTarget))}
          >
            <IconGrip size={16} />
          </button>
        </div>
      )}
      {body}
      {emojiAt && (
        <EmojiPicker
          anchor={emojiAt}
          onClose={() => setEmojiAt(null)}
          onPick={(icon) => {
            handlers.update(block, { icon: icon || "💡" });
            setEmojiAt(null);
          }}
        />
      )}
    </div>
  );
}

export default memo(BlockView);
