import { COLOR_VALUES } from "./blockTypes";
import type { Color } from "./types";
import { escapeHtml } from "./utils";

/** Inline formatting on the current selection. Uses execCommand so native undo & input events keep working. */

export function editableFromSelection(): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const n = sel.anchorNode;
  const el = (n?.nodeType === 1 ? (n as HTMLElement) : n?.parentElement)?.closest<HTMLElement>(".block-content[contenteditable=true]");
  return el ?? null;
}

function fireInput(el: HTMLElement | null) {
  el?.dispatchEvent(new InputEvent("input", { bubbles: true }));
}

export function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

export function toggleMark(cmd: "bold" | "italic" | "underline" | "strikeThrough") {
  exec(cmd);
}

function closestInSelection(tag: string): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const n = sel.getRangeAt(0).commonAncestorContainer;
  const el = n.nodeType === 1 ? (n as HTMLElement) : n.parentElement;
  return el?.closest(tag) ?? null;
}

export function isCodeActive() {
  return !!closestInSelection("code");
}

export function toggleInlineCode() {
  const host = editableFromSelection();
  const code = closestInSelection("code");
  if (code && host?.contains(code)) {
    const parent = code.parentNode!;
    while (code.firstChild) parent.insertBefore(code.firstChild, code);
    code.remove();
    fireInput(host);
    return;
  }
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;
  const text = sel.toString();
  exec("insertHTML", `<code>${escapeHtml(text)}</code>`);
}

export function currentLink(): string {
  return closestInSelection("a")?.getAttribute("href") ?? "";
}

export function applyLink(url: string) {
  if (!url.trim()) {
    exec("unlink");
    return;
  }
  let href = url.trim();
  if (!/^(https?:|mailto:|#)/i.test(href)) href = "https://" + href;
  exec("createLink", href);
}

const SENTINEL = "rgb(1, 2, 3)";

/** Apply a text or background color. "default" strips the color instead of baking in a theme-specific one. */
export function applyColor(kind: "text" | "bg", color: Color) {
  const host = editableFromSelection();
  exec("styleWithCSS", "true");
  const value = color === "default" ? SENTINEL : kind === "text" ? COLOR_VALUES[color].text : COLOR_VALUES[color].bg;
  exec(kind === "text" ? "foreColor" : "hiliteColor", value);
  exec("styleWithCSS", "false");
  if (color === "default" && host) {
    host.querySelectorAll<HTMLElement>("*").forEach((s) => {
      if (kind === "text" && (s.style.color === SENTINEL || s.getAttribute("color") === "#010203")) {
        s.style.removeProperty("color");
        s.removeAttribute("color");
      }
      if (kind === "bg" && s.style.backgroundColor === SENTINEL) s.style.removeProperty("background-color");
      if (!s.getAttribute("style")) s.removeAttribute("style");
      if ((s.tagName === "SPAN" || s.tagName === "FONT") && !s.attributes.length) {
        while (s.firstChild) s.parentNode!.insertBefore(s.firstChild, s);
        s.remove();
      }
    });
    fireInput(host);
  }
}

const INLINE_RULES: [RegExp, string, number][] = [
  [/\*\*([^*]+)\*\*$/, "b", 2],
  [/~~([^~]+)~~$/, "s", 2],
  [/`([^`]+)`$/, "code", 1],
  [/(?:^|[^*\w])\*([^*\s][^*]*)\*$/, "i", 1],
  [/(?:^|[^_\w])_([^_\s][^_]*)_$/, "i", 1],
];

/** Turn `**bold**`, `*italic*`, `_italic_`, `~~strike~~` and `` `code` `` into formatting as you type. */
export function applyInlineMarkdown(el: HTMLElement): boolean {
  const sel = window.getSelection();
  const node = sel?.anchorNode;
  if (!sel || !node || node.nodeType !== Node.TEXT_NODE || !el.contains(node) || !sel.isCollapsed) return false;
  if (node.parentElement?.closest("code")) return false;
  const text = (node as Text).data.slice(0, sel.anchorOffset);
  for (const [re, tag, markerLen] of INLINE_RULES) {
    const m = text.match(re);
    if (!m) continue;
    const inner = m[1];
    const start = text.length - (inner.length + markerLen * 2);
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, sel.anchorOffset);
    range.deleteContents();
    const wrap = document.createElement(tag);
    wrap.textContent = inner;
    range.insertNode(wrap);
    // A zero-width space after the mark keeps the next typed characters outside the formatting.
    const after = document.createTextNode("​");
    wrap.after(after);
    const r = document.createRange();
    r.setStart(after, 1);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    return true;
  }
  return false;
}
