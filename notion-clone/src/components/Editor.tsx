import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Block, BlockType, Color, Page } from "../types";
import { useStore } from "../store";
import BlockView, { type BlockHandlers } from "./Block";
import { MentionMenu, SlashMenu, type MenuApi, type MentionPick } from "./InlineMenu";
import { BlockMenu } from "./BlockMenu";
import type { Anchor } from "./Popover";
import { isTextual, LIST_TYPES, type SlashItem } from "../blockTypes";
import {
  caretClientRect,
  caretOffset,
  deleteTextRange,
  getOffsets,
  isOnFirstLine,
  isOnLastLine,
  setCaret,
  setCaretAtX,
  splitAtCaret,
  textBeforeCaret,
} from "../caret";
import { applyInlineMarkdown, toggleInlineCode, toggleMark } from "../format";
import {
  escapeHtml,
  hiddenBlocks,
  htmlToText,
  listNumbers,
  markdownToBlocks,
  newBlock,
  pageToMarkdown,
  pageTitle,
  sanitizeHtml,
  subtreeRange,
  uid,
} from "../utils";
import { createDatabase } from "../db";
import { navigate } from "../router";

const BLOCK_MIME = "application/x-notebook-blocks";
const EMPTY: Block[] = [];

type Focus = { id: string; pos: number | "start" | "end"; x?: number; line?: "first" | "last" };
type InlineMenuState = { kind: "slash" | "mention"; blockId: string; start: number; query: string; x: number; y: number };

/** Keep indentation well-formed: each block may be at most one level deeper than the one before. */
function normalize(blocks: Block[]): Block[] {
  let prev = -1;
  let changed = false;
  const out = blocks.map((b) => {
    const max = prev + 1;
    const indent = Math.max(0, Math.min(b.indent, max));
    prev = indent;
    if (indent !== b.indent) {
      changed = true;
      return { ...b, indent };
    }
    return b;
  });
  return changed ? out : blocks;
}

const ALT_TYPES: Record<string, BlockType> = { "0": "text", "1": "h1", "2": "h2", "3": "h3", "4": "todo", "5": "bullet", "6": "number", "7": "toggle", "8": "code" };

export function Editor({ page, readOnly }: { page: Page; readOnly: boolean }) {
  const pageId = page.id;
  const blocks = page.blocks;
  const root = useRef<HTMLDivElement>(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const pageIdRef = useRef(pageId);
  pageIdRef.current = pageId;
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;
  const pending = useRef<Focus | null>(null);
  const [selected, setSelectedState] = useState<string[]>([]);
  const selectedRef = useRef(selected);
  const setSelected = useCallback((ids: string[]) => {
    selectedRef.current = ids;
    setSelectedState(ids);
  }, []);
  const [menu, setMenuState] = useState<InlineMenuState | null>(null);
  const menuRef = useRef(menu);
  const setMenu = useCallback((m: InlineMenuState | null) => {
    menuRef.current = m;
    setMenuState(m);
  }, []);
  const menuApi = useRef<MenuApi>(null);
  const [blockMenu, setBlockMenu] = useState<{ id: string; anchor: Anchor } | null>(null);
  const [drop, setDrop] = useState<{ id: string; pos: "before" | "after" | "inside" } | null>(null);
  const dragIds = useRef<string[] | null>(null);
  const [band, setBand] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const hidden = useMemo(() => hiddenBlocks(blocks), [blocks]);
  const numbers = useMemo(() => listNumbers(blocks), [blocks]);
  const headings = useMemo(() => blocks.filter((b) => b.type === "h1" || b.type === "h2" || b.type === "h3"), [blocks]);
  const visible = useMemo(() => blocks.filter((b) => !hidden.has(b.id)), [blocks, hidden]);

  // Reset transient UI when switching pages.
  useEffect(() => {
    setSelected([]);
    setMenu(null);
    setBlockMenu(null);
  }, [pageId, setMenu, setSelected]);

  const getEl = (id: string) =>
    root.current?.querySelector<HTMLElement>(`[data-block-id="${id}"]`) ?? null;

  const applyFocus = (f: Focus) => {
    const el = getEl(f.id);
    if (!el) return false;
    if (el instanceof HTMLTextAreaElement) {
      el.focus();
      const pos = f.pos === "start" ? 0 : f.pos === "end" ? el.value.length : f.pos;
      el.setSelectionRange(pos, pos);
    } else if (f.x !== undefined && f.line) setCaretAtX(el, f.x, f.line);
    else setCaret(el, f.pos);
    return true;
  };

  useLayoutEffect(() => {
    if (pending.current && applyFocus(pending.current)) pending.current = null;
  });

  const focusBlock = (f: Focus) => {
    pending.current = f;
    // If nothing re-renders (e.g. the target already exists), apply right away.
    requestAnimationFrame(() => {
      if (pending.current === f && applyFocus(f)) pending.current = null;
    });
  };

  const commit = (next: Block[], key?: string) => {
    useStore.getState().setBlocks(pageIdRef.current, normalize(next), key);
  };

  const index = (id: string) => blocksRef.current.findIndex((b) => b.id === id);

  const visibleList = () => {
    const h = hiddenBlocks(blocksRef.current);
    return blocksRef.current.filter((b) => !h.has(b.id));
  };
  const neighbor = (id: string, dir: -1 | 1) => {
    const list = visibleList();
    const i = list.findIndex((b) => b.id === id);
    return list[i + dir];
  };
  const focusable = (b: Block) => isTextual(b.type) || (b.type === "image" && !!b.url);

  const moveInto = (target: Block | undefined, pos: "start" | "end", x?: number, line?: "first" | "last") => {
    if (!target) return false;
    if (focusable(target)) {
      (document.activeElement as HTMLElement | null)?.blur?.();
      focusBlock({ id: target.id, pos, x, line });
    } else {
      (document.activeElement as HTMLElement | null)?.blur?.();
      setSelected([target.id]);
    }
    return true;
  };

  const insertAfter = (afterId: string | null, newBlocks: Block[], focus: Focus | null = null) => {
    const list = [...blocksRef.current];
    const at = afterId ? index(afterId) + 1 : list.length;
    list.splice(at, 0, ...newBlocks);
    commit(list);
    if (focus) focusBlock(focus);
  };

  const setIndent = (block: Block, delta: 1 | -1) => {
    const list = [...blocksRef.current];
    const i = index(block.id);
    const [s, e] = subtreeRange(list, i);
    if (delta === 1) {
      const max = i > 0 ? list[i - 1].indent + 1 : 0;
      if (block.indent + 1 > max) return;
    } else if (block.indent === 0) return;
    for (let k = s; k < e; k++) list[k] = { ...list[k], indent: list[k].indent + delta };
    commit(list);
  };

  const idsWithChildren = (ids: string[]) => {
    const list = blocksRef.current;
    const set = new Set<string>();
    for (const id of ids) {
      const i = list.findIndex((b) => b.id === id);
      if (i < 0) continue;
      const [s, e] = subtreeRange(list, i);
      for (let k = s; k < e; k++) set.add(list[k].id);
    }
    return set;
  };

  const deleteBlocks = (ids: string[]) => {
    const list = blocksRef.current;
    const kill = idsWithChildren(ids);
    const first = list.findIndex((b) => kill.has(b.id));
    let next = list.filter((b) => !kill.has(b.id));
    let focusId: string | null = null;
    if (!next.length) {
      const nb = newBlock();
      next = [nb];
      focusId = nb.id;
    } else {
      const before = next[Math.max(0, first - 1)];
      focusId = before && focusable(before) ? before.id : null;
    }
    commit(next);
    setSelected([]);
    if (focusId) focusBlock({ id: focusId, pos: "end" });
  };

  const duplicateBlocks = (ids: string[]) => {
    const list = [...blocksRef.current];
    const set = idsWithChildren(ids);
    const copies = list.filter((b) => set.has(b.id)).map((b) => ({ ...b, id: uid() }));
    let last = -1;
    list.forEach((b, i) => set.has(b.id) && (last = i));
    list.splice(last + 1, 0, ...copies);
    commit(list);
    return copies;
  };

  const moveBlocks = (ids: string[], dir: -1 | 1) => {
    const list = [...blocksRef.current];
    const i = index(ids[0]);
    if (i < 0) return;
    const [s, e] = subtreeRange(list, i);
    const chunk = list.slice(s, e);
    const rest = [...list.slice(0, s), ...list.slice(e)];
    let at: number;
    if (dir === -1) {
      // Jump above the previous sibling (and its subtree).
      let k = s - 1;
      while (k > 0 && rest[k].indent > chunk[0].indent) k--;
      if (k < 0) return;
      at = k;
    } else {
      if (s >= rest.length) return;
      const [, ne] = subtreeRange(rest, s);
      at = ne;
    }
    rest.splice(at, 0, ...chunk);
    commit(rest);
  };

  const changeType = (block: Block, type: BlockType, extra: Partial<Block> = {}) => {
    const list = blocksRef.current.map((stored) => {
      if (stored.id !== block.id) return stored;
      // The caller's html is freshest (it may have just edited the DOM).
      const b = { ...stored, html: block.html };
      const nb: Block = { ...b, type, ...extra };
      if (extra.html === undefined && type === "code" && b.type !== "code") nb.html = escapeHtml(htmlToText(b.html));
      if (extra.html === undefined && type !== "code" && b.type === "code") nb.html = b.html.replace(/\n/g, "<br>");
      if (type === "todo" && nb.checked === undefined) nb.checked = false;
      if (type === "callout" && !nb.icon) nb.icon = "💡";
      if (type === "code" && !nb.lang) nb.lang = "plain";
      return nb;
    });
    commit(list);
  };

  const blocksToMarkdown = (ids: string[]) => {
    const set = idsWithChildren(ids);
    const fake = { ...useStore.getState().pages[pageIdRef.current], title: "", icon: "", blocks: blocksRef.current.filter((b) => set.has(b.id)) };
    return pageToMarkdown(fake, useStore.getState().pages).split("\n").slice(2).join("\n");
  };

  // ---- Slash & mention menus ----

  const applySlash = (item: SlashItem) => {
    const m = menuRef.current;
    if (!m) return;
    const el = getEl(m.blockId);
    const block = blocksRef.current.find((b) => b.id === m.blockId);
    setMenu(null);
    if (!el || !block) return;
    deleteTextRange(el, m.start, Math.max(m.start, caretOffset(el)));
    const html = el.innerHTML === "<br>" ? "" : el.innerHTML;
    const empty = !htmlToText(html).replace(/​/g, "").trim();
    const store = useStore.getState();
    const list = blocksRef.current.map((b) => (b.id === block.id ? { ...b, html } : b));
    const i = index(block.id);
    const replaceOrInsert = (nb: Block[], focus: Focus | null) => {
      const next = [...list];
      if (empty) next.splice(i, 1, ...nb.map((b, k) => (k === 0 ? { ...b, id: block.id, indent: block.indent } : { ...b, indent: block.indent })));
      else next.splice(i + 1, 0, ...nb.map((b) => ({ ...b, indent: block.indent })));
      commit(next);
      if (focus) focusBlock(empty && focus.id === nb[0].id ? { ...focus, id: block.id } : focus);
    };

    if (item.action === "color" || item.action === "bg") {
      commit(list.map((b) => (b.id === block.id ? { ...b, [item.action === "color" ? "color" : "bg"]: item.color as Color } : b)));
      focusBlock({ id: block.id, pos: m.start });
      return;
    }
    if (item.action === "page" || item.action === "database") {
      const childId = item.action === "page" ? store.createPage(pageIdRef.current) : createDatabase(pageIdRef.current);
      const link = newBlock("page", "", { pageId: childId });
      // Re-read blocks: createPage may have changed the store.
      blocksRef.current = useStore.getState().pages[pageIdRef.current].blocks;
      replaceOrInsert([link], null);
      navigate(childId);
      return;
    }
    const type = item.type!;
    if (type === "divider" || type === "toc" || type === "image") {
      const nb = newBlock(type);
      const after = newBlock("text");
      replaceOrInsert(type === "image" ? [nb] : [nb, after], type === "image" ? null : { id: after.id, pos: "start" });
      return;
    }
    if (empty) {
      changeType({ ...block, html }, type, { html: "" });
      focusBlock({ id: block.id, pos: "start" });
    } else {
      const nb = newBlock(type, "", type === "callout" ? { icon: "💡" } : type === "code" ? { lang: "plain" } : {});
      replaceOrInsert([nb], { id: nb.id, pos: "start" });
    }
  };

  const applyMention = (pick: MentionPick) => {
    const m = menuRef.current;
    if (!m) return;
    const el = getEl(m.blockId);
    setMenu(null);
    if (!el) return;
    deleteTextRange(el, m.start, Math.max(m.start, caretOffset(el)));
    let node: Node;
    if ("date" in pick) {
      node = document.createElement("span");
      (node as HTMLElement).className = "date-mention";
      node.textContent = "@" + pick.date;
    } else {
      const id = "create" in pick ? useStore.getState().createPage(pageIdRef.current, { title: pick.create }) : pick.pageId;
      const p = useStore.getState().pages[id];
      const a = document.createElement("a");
      a.setAttribute("data-page", id);
      a.setAttribute("contenteditable", "false");
      a.className = "mention";
      a.textContent = `${p.icon || "📄"} ${pageTitle(p)}`;
      node = a;
    }
    const sel = window.getSelection()!;
    const r = sel.getRangeAt(0);
    r.insertNode(node);
    const space = document.createTextNode(" ");
    (node as ChildNode).after(space);
    const after = document.createRange();
    after.setStart(space, 1);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
    const block = blocksRef.current.find((b) => b.id === m.blockId);
    if (block) useStore.getState().updateBlock(pageIdRef.current, block.id, { html: el.innerHTML });
  };

  // ---- Handlers passed to blocks (stable identity so memoized blocks don't re-render) ----

  const handlers = useMemo<BlockHandlers>(() => {
    const update = (block: Block, patch: Partial<Block>, key?: string) =>
      useStore.getState().updateBlock(pageIdRef.current, block.id, patch, key);

    return {
      register() {},
      update,
      onFocus() {
        if (selectedRef.current.length) setSelected([]);
      },
      addBelow(block) {
        const list = blocksRef.current;
        const i = index(block.id);
        const [, end] = subtreeRange(list, i);
        const nb = newBlock("text", "", { indent: block.indent });
        const next = [...list];
        next.splice(block.type === "toggle" && !block.collapsed ? i + 1 : end, 0, block.type === "toggle" && !block.collapsed ? { ...nb, indent: block.indent + 1 } : nb);
        commit(next);
        focusBlock({ id: nb.id, pos: "start" });
        // Open the slash menu on the new block, like Notion's "+" button.
        setTimeout(() => {
          const el = getEl(nb.id);
          if (!el) return;
          document.execCommand("insertText", false, "/");
        }, 30);
      },
      openBlockMenu(block, anchor) {
        setSelected([block.id]);
        setBlockMenu({ id: block.id, anchor });
      },
      selectBlock(block, additive) {
        (document.activeElement as HTMLElement | null)?.blur?.();
        setSelected(additive ? [...new Set([...selectedRef.current, block.id])] : [block.id]);
      },
      dragStart(e, block) {
        const ids = selectedRef.current.includes(block.id) ? selectedRef.current : [block.id];
        dragIds.current = ids;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", blocksToMarkdown(ids));
        const row = (e.currentTarget as HTMLElement).closest(".block-row");
        if (row) e.dataTransfer.setDragImage(row, 20, 12);
      },

      onInput(block, el, data) {
        if (el.innerHTML === "<br>") el.innerHTML = "";
        const before = textBeforeCaret(el).replace(/ /g, " ");

        // Markdown block shortcuts at the start of a plain text block.
        if (block.type === "text" && (data === " " || data === "`" || data === "-")) {
          const rules: [RegExp, BlockType, Partial<Block>?][] = [
            [/^# $/, "h1"],
            [/^## $/, "h2"],
            [/^### $/, "h3"],
            [/^[-*+] $/, "bullet"],
            [/^\d+[.)] $/, "number"],
            [/^\[\] $/, "todo", { checked: false }],
            [/^\[ \] $/, "todo", { checked: false }],
            [/^\[x\] $/i, "todo", { checked: true }],
            [/^> $/, "toggle", { collapsed: false }],
            [/^" $/, "quote"],
            [/^```$/, "code", { lang: "plain" }],
            [/^---$/, "divider"],
          ];
          for (const [re, type, extra] of rules) {
            if (!re.test(before)) continue;
            deleteTextRange(el, 0, before.length);
            const html = el.innerHTML === "<br>" ? "" : el.innerHTML;
            if (type === "divider") {
              const list = [...blocksRef.current];
              const i = index(block.id);
              const nb = newBlock("text", html, { indent: block.indent });
              list.splice(i, 1, { ...block, type: "divider", html: "" }, nb);
              commit(list);
              focusBlock({ id: nb.id, pos: "start" });
            } else {
              changeType({ ...block, html }, type, { ...extra, html: type === "code" ? escapeHtml(htmlToText(html)) : html });
              focusBlock({ id: block.id, pos: "start" });
            }
            return;
          }
        }

        if (data && "*_~`".includes(data)) applyInlineMarkdown(el);

        // Open the slash / mention menus.
        if (data === "/" || data === "@") {
          const prev = before.slice(-2, -1);
          if (!prev || /\s/.test(prev)) {
            const rect = caretClientRect();
            setMenu({ kind: data === "/" ? "slash" : "mention", blockId: block.id, start: before.length - 1, query: "", x: rect?.left ?? 0, y: rect?.top ?? 0 });
          }
        } else if (menuRef.current && menuRef.current.blockId === block.id) {
          const m = menuRef.current;
          const full = (el.textContent || "").replace(/ /g, " ");
          const trigger = m.kind === "slash" ? "/" : "@";
          if (before.length <= m.start || full[m.start] !== trigger) setMenu(null);
          else {
            const query = before.slice(m.start + 1);
            if (query.length > 30 || /\s\s/.test(query) || (m.kind === "slash" && /^\s/.test(query))) setMenu(null);
            else setMenu({ ...m, query });
          }
        }

        update(block, { html: el.innerHTML }, `type:${block.id}`);
      },

      onPaste(e, block) {
        if (readOnlyRef.current) return;
        const cd = e.clipboardData;
        const internal = cd.getData(BLOCK_MIME);
        const text = cd.getData("text/plain");
        const el = e.currentTarget as HTMLElement;
        let incoming: Block[] | null = null;
        if (internal) {
          try {
            incoming = (JSON.parse(internal) as Block[]).map((b) => ({ ...b, id: uid() }));
          } catch {
            incoming = null;
          }
        } else if (text && /\n\s*\S/.test(text.trim()) && !el.closest(".image-block")) {
          incoming = markdownToBlocks(text);
        }
        if (incoming && incoming.length) {
          e.preventDefault();
          const [before, after] = splitAtCaret(el);
          const list = [...blocksRef.current];
          const i = index(block.id);
          const shift = block.indent;
          const mapped = incoming.map((b) => ({ ...b, indent: b.indent + shift }));
          const beforeEmpty = !htmlToText(before).trim();
          const cur = { ...block, html: before };
          const tail = after ? [newBlock(block.type === "code" ? "text" : block.type, after, { indent: block.indent })] : [];
          const replaced = beforeEmpty && block.type === "text" ? [...mapped, ...tail] : [cur, ...mapped, ...tail];
          list.splice(i, 1, ...replaced);
          el.innerHTML = replaced[0].id === block.id ? before : el.innerHTML;
          commit(list);
          const lastInserted = mapped[mapped.length - 1];
          if (focusable(lastInserted)) focusBlock({ id: lastInserted.id, pos: "end" });
          return;
        }
        e.preventDefault();
        const sel = window.getSelection();
        const url = text.trim();
        if (sel && !sel.isCollapsed && /^https?:\/\/\S+$/.test(url)) {
          document.execCommand("createLink", false, url);
          return;
        }
        const html = cd.getData("text/html");
        if (html && !el.closest(".t-code")) {
          const clean = sanitizeHtml(html);
          document.execCommand("insertHTML", false, clean || escapeHtml(text));
        } else document.execCommand("insertText", false, text);
      },

      codeKeyDown(e, block) {
        const ta = e.currentTarget;
        const mod = e.metaKey || e.ctrlKey;
        if (e.key === "Tab") {
          e.preventDefault();
          if (!e.shiftKey) document.execCommand("insertText", false, "  ");
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          ta.blur();
          setSelected([block.id]);
          return;
        }
        if (mod && e.key === "Enter") {
          e.preventDefault();
          const nb = newBlock("text", "", { indent: block.indent });
          insertAfter(block.id, [nb], { id: nb.id, pos: "start" });
          return;
        }
        if (e.key === "Backspace" && !ta.value) {
          e.preventDefault();
          changeType(block, "text", { html: "" });
          focusBlock({ id: block.id, pos: "start" });
          return;
        }
        const collapsed = ta.selectionStart === ta.selectionEnd;
        if (e.key === "ArrowUp" && collapsed && !ta.value.slice(0, ta.selectionStart).includes("\n")) {
          if (moveInto(neighbor(block.id, -1), "end")) e.preventDefault();
        } else if (e.key === "ArrowDown" && collapsed && !ta.value.slice(ta.selectionEnd).includes("\n")) {
          if (moveInto(neighbor(block.id, 1), "start")) e.preventDefault();
        }
      },

      onKeyDown(e, block) {
        const el = e.currentTarget as HTMLElement;
        const mod = e.metaKey || e.ctrlKey;
        const m = menuRef.current;
        if (m && m.blockId === block.id) {
          if (["ArrowDown", "ArrowUp", "Enter", "Tab"].includes(e.key)) {
            e.preventDefault();
            menuApi.current?.key(e.key);
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setMenu(null);
            return;
          }
        }
        if (e.nativeEvent.isComposing) return;
        const isCaption = block.type === "image";

        if (mod && !e.shiftKey && !e.altKey) {
          const k = e.key.toLowerCase();
          if (k === "d") {
            e.preventDefault();
            const copies = duplicateBlocks([block.id]);
            if (copies[0]) focusBlock({ id: copies[0].id, pos: "end" });
            return;
          }
          if (k === "e") {
            e.preventDefault();
            toggleInlineCode();
            return;
          }
          if (k === "k") {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("nb:link"));
            return;
          }
          if (k === "a") {
            const o = getOffsets(el);
            const len = (el.textContent || "").length;
            if (o && o.start === 0 && o.end === len) {
              e.preventDefault();
              el.blur();
              setSelected(blocksRef.current.map((b) => b.id));
            }
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            if (block.type === "todo") update(block, { checked: !block.checked });
            if (block.type === "toggle") update(block, { collapsed: !block.collapsed });
            return;
          }
        }
        if (mod && e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
          e.preventDefault();
          const off = caretOffset(el);
          moveBlocks([block.id], e.key === "ArrowUp" ? -1 : 1);
          focusBlock({ id: block.id, pos: off });
          return;
        }
        if (mod && e.shiftKey && (e.key.toLowerCase() === "s" || e.key.toLowerCase() === "x")) {
          e.preventDefault();
          toggleMark("strikeThrough");
          return;
        }
        if (mod && e.altKey && ALT_TYPES[e.code?.replace("Digit", "") ?? ""] && !isCaption) {
          e.preventDefault();
          changeType({ ...block, html: el.innerHTML }, ALT_TYPES[e.code.replace("Digit", "")]);
          focusBlock({ id: block.id, pos: caretOffset(el) });
          return;
        }

        switch (e.key) {
          case "Enter": {
            if (e.shiftKey || mod) return;
            e.preventDefault();
            if (isCaption) {
              const nb = newBlock("text", "", { indent: block.indent });
              insertAfter(block.id, [nb], { id: nb.id, pos: "start" });
              return;
            }
            const text = (el.textContent || "").replace(/​/g, "");
            if (!text && (LIST_TYPES.includes(block.type) || block.type === "quote" || block.type === "callout")) {
              if (block.indent > 0 && block.type !== "callout") setIndent(block, -1);
              else changeType(block, "text");
              return;
            }
            const [before, after] = splitAtCaret(el);
            const list = [...blocksRef.current];
            const i = index(block.id);
            const keepType = ["bullet", "number", "todo"].includes(block.type);
            let type: BlockType = keepType ? block.type : "text";
            let indent = block.indent;
            let at = i + 1;
            if (block.type === "toggle") {
              if (block.collapsed) {
                type = "toggle";
                at = subtreeRange(list, i)[1];
              } else indent = block.indent + 1;
            }
            if (!htmlToText(before) && after) {
              // Caret at start: push an empty block above and keep editing this one.
              const above = newBlock(keepType ? block.type : "text", "", { indent: block.indent });
              list.splice(i, 0, above);
              commit(list);
              focusBlock({ id: block.id, pos: "start" });
              return;
            }
            const nb = newBlock(type, after, { indent, ...(type === "todo" ? { checked: false } : {}), ...(type === "toggle" ? { collapsed: true } : {}) });
            list[i] = { ...block, html: before };
            list.splice(at, 0, nb);
            el.innerHTML = before;
            commit(list);
            focusBlock({ id: nb.id, pos: "start" });
            return;
          }
          case "Backspace": {
            if (mod) return;
            const o = getOffsets(el);
            if (!o || o.start !== 0 || o.end !== 0) return;
            if (isCaption) return;
            e.preventDefault();
            if (block.type !== "text") {
              changeType({ ...block, html: el.innerHTML }, "text");
              focusBlock({ id: block.id, pos: "start" });
              return;
            }
            if (block.indent > 0) {
              setIndent(block, -1);
              return;
            }
            const prev = neighbor(block.id, -1);
            if (!prev) return;
            if (!isTextual(prev.type)) {
              if (!el.textContent) {
                commit(blocksRef.current.filter((b) => b.id !== block.id));
              }
              el.blur();
              setSelected([prev.id]);
              return;
            }
            const prevLen = htmlToText(prev.html).length;
            const merged = prev.type === "code" ? prev.html + escapeHtml(el.textContent || "") : prev.html + el.innerHTML;
            commit(blocksRef.current.filter((b) => b.id !== block.id).map((b) => (b.id === prev.id ? { ...b, html: merged } : b)));
            focusBlock({ id: prev.id, pos: prevLen });
            return;
          }
          case "Delete": {
            const o = getOffsets(el);
            const len = (el.textContent || "").length;
            if (!o || o.start !== len || o.end !== len || isCaption) return;
            const next = neighbor(block.id, 1);
            if (!next || !isTextual(next.type) || next.type === "code") return;
            e.preventDefault();
            const html = el.innerHTML + next.html;
            el.innerHTML = html;
            commit(blocksRef.current.filter((b) => b.id !== next.id).map((b) => (b.id === block.id ? { ...b, html } : b)));
            focusBlock({ id: block.id, pos: len });
            return;
          }
          case "Tab": {
            e.preventDefault();
            if (isCaption) return;
            const off = caretOffset(el);
            setIndent(block, e.shiftKey ? -1 : 1);
            focusBlock({ id: block.id, pos: off });
            return;
          }
          case "ArrowUp": {
            if (e.shiftKey || mod || e.altKey) return;
            if (!isOnFirstLine(el)) return;
            const x = caretClientRect()?.left;
            if (moveInto(neighbor(block.id, -1), "end", x, "last")) e.preventDefault();
            return;
          }
          case "ArrowDown": {
            if (e.shiftKey || mod || e.altKey) return;
            if (!isOnLastLine(el)) return;
            const x = caretClientRect()?.left;
            if (moveInto(neighbor(block.id, 1), "start", x, "first")) e.preventDefault();
            return;
          }
          case "ArrowLeft": {
            if (e.shiftKey || mod) return;
            const o = getOffsets(el);
            if (o && o.start === 0 && o.end === 0 && moveInto(neighbor(block.id, -1), "end")) e.preventDefault();
            return;
          }
          case "ArrowRight": {
            if (e.shiftKey || mod) return;
            const o = getOffsets(el);
            const len = (el.textContent || "").length;
            if (o && o.start === len && o.end === len && moveInto(neighbor(block.id, 1), "start")) e.preventDefault();
            return;
          }
          case "Escape": {
            e.preventDefault();
            el.blur();
            setSelected([block.id]);
            return;
          }
        }
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Keyboard & clipboard for block selection ----

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const sel = selectedRef.current;
      if (!sel.length || readOnlyRef.current) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable=true], .popover")) return;
      const mod = e.metaKey || e.ctrlKey;
      const list = visibleList();
      const first = list.findIndex((b) => b.id === sel[0]);
      const last = list.findIndex((b) => b.id === sel[sel.length - 1]);
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        deleteBlocks(sel);
      } else if (e.key === "Escape") {
        setSelected([]);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const b = list[first];
        if (b && focusable(b)) {
          setSelected([]);
          focusBlock({ id: b.id, pos: "end" });
        }
      } else if (mod && e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        moveBlocks(sel, e.key === "ArrowUp" ? -1 : 1);
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const dir = e.key === "ArrowUp" ? -1 : 1;
        if (e.shiftKey) {
          const edge = dir === -1 ? first - 1 : last + 1;
          if (list[edge]) setSelected(dir === -1 ? [list[edge].id, ...sel] : [...sel, list[edge].id]);
        } else {
          const target = list[dir === -1 ? Math.max(0, first - 1) : Math.min(list.length - 1, last + 1)];
          if (target) setSelected([target.id]);
        }
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const copies = duplicateBlocks(sel);
        setSelected(copies.map((c) => c.id));
      } else if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelected(blocksRef.current.map((b) => b.id));
      } else if (!mod && !e.altKey && e.key.length === 1 && sel.length === 1) {
        // Typing while a block is selected jumps back into it.
        const b = list[first];
        if (b && focusable(b)) {
          setSelected([]);
          focusBlock({ id: b.id, pos: "end" });
        }
      }
    };
    const onCopy = (e: ClipboardEvent, cut = false) => {
      const sel = selectedRef.current;
      if (!sel.length || (e.target as HTMLElement).closest?.("input, textarea, [contenteditable=true]")) return;
      const set = idsWithChildren(sel);
      const chosen = blocksRef.current.filter((b) => set.has(b.id));
      e.clipboardData?.setData("text/plain", blocksToMarkdown(sel));
      e.clipboardData?.setData(BLOCK_MIME, JSON.stringify(chosen));
      e.preventDefault();
      if (cut && !readOnlyRef.current) deleteBlocks(sel);
    };
    const onCut = (e: ClipboardEvent) => onCopy(e, true);
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!selectedRef.current.length) return;
      if (t.closest(".block-row.selected, .popover, .block-gutter")) return;
      setSelected([]);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("mousedown", onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Drag & drop ----

  const onDragOver = (e: React.DragEvent) => {
    if (!dragIds.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const row = (e.target as HTMLElement).closest<HTMLElement>(".block-row");
    let target = row?.dataset.rowId;
    let pos: "before" | "after" | "inside" = "after";
    if (row && target) {
      const r = row.getBoundingClientRect();
      const b = blocksRef.current.find((x) => x.id === target)!;
      pos = e.clientY < r.top + r.height / 2 ? "before" : "after";
      if (pos === "after" && e.clientX > r.left + b.indent * 26 + 60 && !["divider", "page", "image", "toc"].includes(b.type)) pos = "inside";
    } else {
      const list = visibleList();
      target = list[list.length - 1]?.id;
    }
    if (!target || idsWithChildren(dragIds.current).has(target)) {
      setDrop(null);
      return;
    }
    if (drop?.id !== target || drop.pos !== pos) setDrop({ id: target, pos });
  };

  const onDrop = (e: React.DragEvent) => {
    const ids = dragIds.current;
    dragIds.current = null;
    const d = drop;
    setDrop(null);
    if (!ids || !d) return;
    e.preventDefault();
    const moving = idsWithChildren(ids);
    const chunk = blocksRef.current.filter((b) => moving.has(b.id));
    const rest = blocksRef.current.filter((b) => !moving.has(b.id));
    const ti = rest.findIndex((b) => b.id === d.id);
    if (ti < 0) return;
    const target = rest[ti];
    let at = ti;
    let indent = target.indent;
    if (d.pos === "after") at = subtreeRange(rest, ti)[1];
    if (d.pos === "inside") {
      at = ti + 1;
      indent = target.indent + 1;
    }
    const delta = indent - chunk[0].indent;
    rest.splice(at, 0, ...chunk.map((b) => ({ ...b, indent: Math.max(0, b.indent + delta) })));
    if (d.pos === "inside" && target.type === "toggle" && target.collapsed)
      rest[ti] = { ...target, collapsed: false };
    commit(rest);
  };

  // ---- Rubber-band selection & click below content ----

  // Listen on the whole page (not just the text column) so selection can start in the margins, like Notion.
  useEffect(() => {
    const host = root.current?.closest<HTMLElement>(".page");
    if (!host) return;
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || readOnlyRef.current) return;
      const t = e.target as HTMLElement;
      if (
        t.closest(
          ".block-content, .block-gutter, input, textarea, button, a, select, .code-block, .image-block, .page-link, .toc, .divider, .popover, label, .page-title, .cover, .page-controls, .row-props, .backlinks, .subpages, .editor-filler",
        )
      )
        return;
      const sx = e.clientX;
      const sy = e.clientY;
      let moved = false;
      const rows = Array.from(root.current?.querySelectorAll<HTMLElement>(".block-row") ?? []);
      const move = (ev: MouseEvent) => {
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        if (!moved) {
          moved = true;
          (document.activeElement as HTMLElement | null)?.blur?.();
        }
        ev.preventDefault();
        window.getSelection()?.removeAllRanges();
        const x = Math.min(sx, ev.clientX);
        const y = Math.min(sy, ev.clientY);
        const w = Math.abs(ev.clientX - sx);
        const h = Math.abs(ev.clientY - sy);
        setBand({ x, y, w, h });
        // Only vertical overlap matters: dragging down the margin selects the blocks beside it.
        const hits = rows
          .filter((r) => {
            const rr = r.getBoundingClientRect();
            return rr.bottom > y && rr.top < y + h;
          })
          .map((r) => r.dataset.rowId!);
        setSelected(hits);
      };
      const up = (ev: MouseEvent) => {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
        setBand(null);
        if (moved) return;
        // Plain click in the margin next to a block focuses that block.
        const row = rows.find((r) => {
          const rr = r.getBoundingClientRect();
          return ev.clientY >= rr.top && ev.clientY <= rr.bottom;
        });
        const b = row && blocksRef.current.find((x) => x.id === row.dataset.rowId);
        if (b && focusable(b)) {
          const el = getEl(b.id);
          const rr = el?.getBoundingClientRect();
          focusBlock({ id: b.id, pos: rr && ev.clientX < rr.left ? "start" : "end" });
        }
      };
      e.preventDefault();
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    };
    host.addEventListener("mousedown", onMouseDown);
    return () => host.removeEventListener("mousedown", onMouseDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  const clickBelow = () => {
    if (readOnly) return;
    const list = blocksRef.current;
    const last = list[list.length - 1];
    if (last && last.type === "text" && !htmlToText(last.html).trim() && last.indent === 0) {
      focusBlock({ id: last.id, pos: "end" });
      return;
    }
    const nb = newBlock();
    commit([...list, nb]);
    focusBlock({ id: nb.id, pos: "start" });
  };

  const menuBlock = blockMenu ? blocks.find((b) => b.id === blockMenu.id) : null;
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  return (
    <div
      ref={root}
      className="editor"
      data-page-id={pageId}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={() => {
        dragIds.current = null;
        setDrop(null);
      }}
      onDragLeave={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node)) setDrop(null);
      }}
    >
      {visible.map((b) => (
        <BlockView
          key={b.id}
          block={b}
          number={numbers[b.id]}
          pageId={pageId}
          readOnly={readOnly}
          selected={selectedSet.has(b.id)}
          dropPos={drop?.id === b.id ? drop.pos : null}
          handlers={handlers}
          headings={b.type === "toc" ? headings : EMPTY}
        />
      ))}
      <div className="editor-filler" onClick={clickBelow} />
      {menu?.kind === "slash" && <SlashMenu ref={menuApi} pos={menu} query={menu.query} onPick={applySlash} />}
      {menu?.kind === "mention" && <MentionMenu ref={menuApi} pos={menu} query={menu.query} excludeId={pageId} onPick={applyMention} />}
      {blockMenu && menuBlock && (
        <BlockMenu
          block={menuBlock}
          anchor={blockMenu.anchor}
          onClose={() => setBlockMenu(null)}
          onTurnInto={(type) => {
            changeType(menuBlock, type);
            setBlockMenu(null);
            setSelected([]);
            if (isTextual(type)) focusBlock({ id: menuBlock.id, pos: "end" });
          }}
          onColor={(kind, color) => {
            useStore.getState().updateBlock(pageId, menuBlock.id, kind === "text" ? { color } : { bg: color });
            setBlockMenu(null);
          }}
          onDuplicate={() => {
            duplicateBlocks(selected.length ? selected : [menuBlock.id]);
            setBlockMenu(null);
          }}
          onDelete={() => {
            deleteBlocks(selected.length ? selected : [menuBlock.id]);
            setBlockMenu(null);
          }}
          onCopyText={() => {
            navigator.clipboard?.writeText(blocksToMarkdown(selected.length ? selected : [menuBlock.id]));
            useStore.getState().toast("Copied as Markdown");
            setBlockMenu(null);
          }}
          onMove={(dir) => moveBlocks([menuBlock.id], dir)}
        />
      )}
      {band && <div className="rubber-band" style={{ left: band.x, top: band.y, width: band.w, height: band.h }} />}
    </div>
  );
}
