import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COLOR_VALUES, TURN_INTO, typeLabel } from "../blockTypes";
import { applyColor, applyLink, currentLink, editableFromSelection, isCodeActive, toggleInlineCode, toggleMark } from "../format";
import { useStore } from "../store";
import type { Block, BlockType } from "../types";
import { COLORS, escapeHtml, htmlToText } from "../utils";
import { IconChevronDown, IconLink } from "./Icons";

interface State {
  x: number;
  y: number;
  blockId: string;
  pageId: string;
}

/** Floating toolbar shown above a non-empty text selection inside a block. */
export function FormatToolbar() {
  const [st, setSt] = useState<State | null>(null);
  const [mode, setMode] = useState<"main" | "link" | "color" | "turn">("main");
  const [link, setLink] = useState("");
  const [active, setActive] = useState<Record<string, boolean>>({});
  const saved = useRef<Range | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const update = () => {
      if (modeRef.current === "link") return;
      const sel = window.getSelection();
      const host = editableFromSelection();
      if (!sel || sel.isCollapsed || !host || !sel.toString().trim()) {
        setSt(null);
        setMode("main");
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      const pageId = host.closest<HTMLElement>("[data-page-id]")?.dataset.pageId ?? "";
      setSt({ x: rect.left + rect.width / 2, y: rect.top, blockId: host.dataset.blockId ?? "", pageId });
      setActive({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strike: document.queryCommandState("strikeThrough"),
        code: isCodeActive(),
        link: !!currentLink(),
      });
    };
    const openLink = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !editableFromSelection()) return;
      saved.current = sel.getRangeAt(0).cloneRange();
      setLink(currentLink());
      setMode("link");
    };
    document.addEventListener("selectionchange", update);
    window.addEventListener("nb:link", openLink);
    return () => {
      document.removeEventListener("selectionchange", update);
      window.removeEventListener("nb:link", openLink);
    };
  }, []);

  if (!st) return null;

  const restore = () => {
    const r = saved.current;
    if (!r) return;
    const host = (r.startContainer.nodeType === 1 ? (r.startContainer as HTMLElement) : r.startContainer.parentElement)?.closest<HTMLElement>(".block-content");
    host?.focus({ preventScroll: true });
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(r);
  };

  const run = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    fn();
    // Refresh active states after the command.
    setTimeout(() => document.dispatchEvent(new Event("selectionchange")), 0);
  };

  const block = useStore.getState().pages[st.pageId]?.blocks.find((b) => b.id === st.blockId) as Block | undefined;

  const turnInto = (type: BlockType) => {
    if (!block) return;
    const html = type === "code" ? escapeHtml(htmlToText(block.html)) : block.html;
    useStore.getState().updateBlock(st.pageId, block.id, { type, html, ...(type === "callout" && !block.icon ? { icon: "💡" } : {}) });
    setMode("main");
  };

  return createPortal(
    <div
      ref={box}
      className="format-toolbar"
      style={{ left: Math.max(8, Math.min(st.x, window.innerWidth - 8)), top: Math.max(8, st.y - 44) }}
      onMouseDown={(e) => {
        if (!(e.target as HTMLElement).closest("input")) e.preventDefault();
      }}
    >
      {mode === "link" ? (
        <form
          className="ft-link"
          onSubmit={(e) => {
            e.preventDefault();
            restore();
            applyLink(link);
            setMode("main");
          }}
        >
          <input
            autoFocus
            placeholder="Paste link… (empty to remove)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                restore();
                setMode("main");
              }
            }}
          />
          <button type="submit" className="btn primary">
            Apply
          </button>
        </form>
      ) : (
        <>
          <button className="ft-btn ft-turn" onMouseDown={run(() => setMode(mode === "turn" ? "main" : "turn"))}>
            {block ? typeLabel(block.type) : "Text"} <IconChevronDown size={12} />
          </button>
          <span className="ft-sep" />
          <button className={`ft-btn b${active.bold ? " on" : ""}`} title="Bold" onMouseDown={run(() => toggleMark("bold"))}>
            B
          </button>
          <button className={`ft-btn i${active.italic ? " on" : ""}`} title="Italic" onMouseDown={run(() => toggleMark("italic"))}>
            i
          </button>
          <button className={`ft-btn u${active.underline ? " on" : ""}`} title="Underline" onMouseDown={run(() => toggleMark("underline"))}>
            U
          </button>
          <button className={`ft-btn s${active.strike ? " on" : ""}`} title="Strikethrough" onMouseDown={run(() => toggleMark("strikeThrough"))}>
            S
          </button>
          <button className={`ft-btn mono${active.code ? " on" : ""}`} title="Inline code" onMouseDown={run(toggleInlineCode)}>
            {"</>"}
          </button>
          <button
            className={`ft-btn${active.link ? " on" : ""}`}
            title="Link"
            onMouseDown={run(() => {
              const sel = window.getSelection();
              if (sel?.rangeCount) saved.current = sel.getRangeAt(0).cloneRange();
              setLink(currentLink());
              setMode("link");
            })}
          >
            <IconLink size={14} />
          </button>
          <span className="ft-sep" />
          <button className="ft-btn" title="Color" onMouseDown={run(() => setMode(mode === "color" ? "main" : "color"))}>
            <span className="ft-color">A</span> <IconChevronDown size={12} />
          </button>
        </>
      )}
      {mode === "color" && (
        <div className="ft-drop">
          <div className="menu-heading">Text color</div>
          <div className="ft-swatches">
            {COLORS.map((c) => (
              <button key={c} title={COLOR_VALUES[c].label} className="ft-swatch" style={{ color: COLOR_VALUES[c].text }} onMouseDown={run(() => applyColor("text", c))}>
                A
              </button>
            ))}
          </div>
          <div className="menu-heading">Background</div>
          <div className="ft-swatches">
            {COLORS.map((c) => (
              <button key={c} title={`${COLOR_VALUES[c].label} background`} className="ft-swatch" style={{ background: COLOR_VALUES[c].bg }} onMouseDown={run(() => applyColor("bg", c))}>
                A
              </button>
            ))}
          </div>
        </div>
      )}
      {mode === "turn" && (
        <div className="ft-drop ft-turn-list">
          {TURN_INTO.map((t) => (
            <button key={t} className={`menu-item${block?.type === t ? " active" : ""}`} onMouseDown={run(() => turnInto(t))}>
              {typeLabel(t)}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
