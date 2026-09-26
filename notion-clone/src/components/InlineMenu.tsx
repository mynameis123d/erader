import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { filterSlash, COLOR_VALUES, type SlashItem } from "../blockTypes";
import { useStore } from "../store";
import { pageTitle } from "../utils";

export interface MenuApi {
  key(k: string): void;
}

interface Pos {
  x: number;
  y: number;
}

/** Place the menu below the caret, or above it when there's more room there; re-measured as results change. */
function useFlip(pos: Pos, ref: React.RefObject<HTMLDivElement | null>, dep: unknown) {
  const [style, setStyle] = useState<React.CSSProperties>({ left: pos.x, top: pos.y + 24, visibility: "hidden" });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.maxHeight = "";
    const h = Math.min(el.scrollHeight, 420);
    const w = el.offsetWidth;
    const below = window.innerHeight - (pos.y + 26) - 8;
    const above = pos.y - 14;
    const left = Math.max(8, Math.min(pos.x, window.innerWidth - w - 8));
    if (h <= below || below >= above) setStyle({ left, top: pos.y + 26, maxHeight: Math.min(420, below), visibility: "visible" });
    else setStyle({ left, top: Math.max(8, pos.y - Math.min(h, above) - 6), maxHeight: Math.min(420, above), visibility: "visible" });
  }, [pos.x, pos.y, ref, dep]);
  return style;
}

function useNav<T>(items: T[], onPick: (i: T) => void, ref: React.ForwardedRef<MenuApi>) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => setIndex(0), [items]);
  useEffect(() => {
    listRef.current?.querySelector(".active")?.scrollIntoView({ block: "nearest" });
  }, [index]);
  useImperativeHandle(ref, () => ({
    key(k: string) {
      if (!items.length) return;
      if (k === "ArrowDown") setIndex((i) => (i + 1) % items.length);
      else if (k === "ArrowUp") setIndex((i) => (i - 1 + items.length) % items.length);
      else if (k === "Enter" || k === "Tab") onPick(items[Math.min(index, items.length - 1)]);
    },
  }));
  return { index, setIndex, listRef };
}

interface SlashProps {
  pos: Pos;
  query: string;
  onPick: (item: SlashItem) => void;
}

export const SlashMenu = forwardRef<MenuApi, SlashProps>(function SlashMenu({ pos, query, onPick }, ref) {
  const items = useMemo(() => filterSlash(query), [query]);
  const { index, setIndex, listRef } = useNav(items, onPick, ref);
  const box = useRef<HTMLDivElement>(null);
  const style = useFlip(pos, box, items.length);
  let lastGroup = "";
  return createPortal(
    <div ref={box} className="popover inline-menu" style={style} onMouseDown={(e) => e.preventDefault()}>
      <div ref={listRef} className="inline-menu-list">
        {items.length === 0 && <div className="muted pad">No results</div>}
        {items.map((item, i) => {
          const heading = item.group !== lastGroup ? item.group : null;
          lastGroup = item.group;
          return (
            <div key={item.id}>
              {heading && <div className="menu-heading">{heading}</div>}
              <button className={`slash-item${i === index ? " active" : ""}`} onMouseEnter={() => setIndex(i)} onClick={() => onPick(item)}>
                <span
                  className="slash-glyph"
                  style={
                    item.action === "color"
                      ? { color: COLOR_VALUES[item.color!].text }
                      : item.action === "bg"
                        ? { background: COLOR_VALUES[item.color!].bg }
                        : undefined
                  }
                >
                  {item.glyph}
                </span>
                <span className="slash-text">
                  <span className="slash-label">{item.label}</span>
                  {item.description && <span className="slash-desc">{item.description}</span>}
                </span>
                {item.shortcut && <span className="menu-hint">{item.shortcut}</span>}
              </button>
            </div>
          );
        })}
      </div>
    </div>,
    document.body,
  );
});

export type MentionPick = { pageId: string } | { create: string } | { date: string };

interface MentionProps {
  pos: Pos;
  query: string;
  excludeId: string;
  onPick: (item: MentionPick) => void;
}

export const MentionMenu = forwardRef<MenuApi, MentionProps>(function MentionMenu({ pos, query, excludeId, onPick }, ref) {
  const pages = useStore((s) => s.pages);
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const found = Object.values(pages)
      .filter((p) => !p.trashed && p.id !== excludeId && pageTitle(p).toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 8)
      .map((p) => ({ key: p.id, label: pageTitle(p), icon: p.icon || "📄", pick: { pageId: p.id } as MentionPick }));
    const today = new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
    const extra = [];
    if ("today".includes(q) || "date".includes(q)) extra.push({ key: "date", label: `Today — ${today}`, icon: "📅", pick: { date: today } as MentionPick });
    if (q) extra.push({ key: "new", label: `New page “${query.trim()}”`, icon: "➕", pick: { create: query.trim() } as MentionPick });
    return [...found, ...extra];
  }, [pages, query, excludeId]);
  const { index, setIndex, listRef } = useNav(items, (i) => onPick(i.pick), ref);
  const box = useRef<HTMLDivElement>(null);
  const style = useFlip(pos, box, items.length);
  return createPortal(
    <div ref={box} className="popover inline-menu" style={style} onMouseDown={(e) => e.preventDefault()}>
      <div className="menu-heading">Link to page</div>
      <div ref={listRef} className="inline-menu-list">
        {items.map((it, i) => (
          <button key={it.key} className={`menu-item${i === index ? " active" : ""}`} onMouseEnter={() => setIndex(i)} onClick={() => onPick(it.pick)}>
            <span className="menu-icon">{it.icon}</span>
            <span className="menu-label">{it.label}</span>
          </button>
        ))}
        {!items.length && <div className="muted pad">Type to search pages</div>}
      </div>
    </div>,
    document.body,
  );
});
