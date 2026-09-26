/** Caret and selection helpers for contentEditable blocks. Offsets are measured in text characters. */

function textLength(el: Node) {
  return (el.textContent || "").length;
}

export function getOffsets(el: HTMLElement): { start: number; end: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.startContainer)) return null;
  const pre = document.createRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  pre.setEnd(range.endContainer, range.endOffset);
  return { start, end: pre.toString().length };
}

export function caretOffset(el: HTMLElement): number {
  return getOffsets(el)?.start ?? 0;
}

/** Locate the DOM position for a text offset inside `el`. */
export function positionAt(el: HTMLElement, offset: number): { node: Node; offset: number } {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node = walker.nextNode();
  let last: Node | null = null;
  while (node) {
    const len = (node as Text).data.length;
    // Skip text inside non-editable mentions; the caret can't live there.
    const inMention = (node.parentElement as HTMLElement | null)?.closest("[contenteditable=false]");
    if (remaining <= len && !inMention) return { node, offset: remaining };
    if (inMention && remaining <= len) {
      const m = inMention as HTMLElement;
      const idx = Array.from(m.parentNode!.childNodes).indexOf(m);
      return { node: m.parentNode!, offset: remaining === 0 ? idx : idx + 1 };
    }
    remaining -= len;
    last = node;
    node = walker.nextNode();
  }
  if (last && !(last.parentElement as HTMLElement | null)?.closest("[contenteditable=false]"))
    return { node: last, offset: (last as Text).data.length };
  return { node: el, offset: el.childNodes.length };
}

export function rangeFromOffsets(el: HTMLElement, start: number, end: number): Range {
  const r = document.createRange();
  const a = positionAt(el, start);
  const b = positionAt(el, end);
  r.setStart(a.node, a.offset);
  r.setEnd(b.node, b.offset);
  return r;
}

export function setCaret(el: HTMLElement, offset: number | "start" | "end") {
  el.focus({ preventScroll: true });
  const total = textLength(el);
  const pos = offset === "start" ? 0 : offset === "end" ? total : Math.min(offset, total);
  const sel = window.getSelection();
  if (!sel) return;
  const r = document.createRange();
  if (pos === total) {
    r.selectNodeContents(el);
    r.collapse(false);
  } else {
    const p = positionAt(el, pos);
    r.setStart(p.node, p.offset);
    r.collapse(true);
  }
  sel.removeAllRanges();
  sel.addRange(r);
  scrollIntoViewIfNeeded(el);
}

export function scrollIntoViewIfNeeded(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  if (r.top < 60 || r.bottom > window.innerHeight - 40) el.scrollIntoView({ block: "nearest" });
}

/** Place the caret on the first/last line of `el` as close as possible to horizontal position `x`. */
export function setCaretAtX(el: HTMLElement, x: number, line: "first" | "last") {
  const r = el.getBoundingClientRect();
  const y = line === "first" ? r.top + 8 : r.bottom - 8;
  const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null };
  let range: Range | null = null;
  if (doc.caretRangeFromPoint) range = doc.caretRangeFromPoint(x, y);
  else if ("caretPositionFromPoint" in document) {
    const p = (document as unknown as { caretPositionFromPoint(x: number, y: number): { offsetNode: Node; offset: number } | null }).caretPositionFromPoint(x, y);
    if (p) {
      range = document.createRange();
      range.setStart(p.offsetNode, p.offset);
    }
  }
  if (range && el.contains(range.startContainer)) {
    el.focus({ preventScroll: true });
    range.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    scrollIntoViewIfNeeded(el);
  } else {
    setCaret(el, line === "first" ? "start" : "end");
  }
}

function caretRect(): DOMRect | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rects = range.getClientRects();
  if (rects.length) return rects[0];
  // Collapsed ranges in empty nodes have no rects; measure via a temporary marker.
  const span = document.createElement("span");
  span.textContent = "​";
  range.insertNode(span);
  const r = span.getBoundingClientRect();
  const parent = span.parentNode;
  span.remove();
  parent?.normalize();
  return r;
}

export function caretClientRect(): DOMRect | null {
  return caretRect();
}

export function isOnFirstLine(el: HTMLElement) {
  const c = caretRect();
  if (!c) return true;
  const r = el.getBoundingClientRect();
  const lh = parseFloat(getComputedStyle(el).lineHeight) || 24;
  return c.top - r.top < lh * 0.8;
}

export function isOnLastLine(el: HTMLElement) {
  const c = caretRect();
  if (!c) return true;
  const r = el.getBoundingClientRect();
  const lh = parseFloat(getComputedStyle(el).lineHeight) || 24;
  return r.bottom - c.bottom < lh * 0.8;
}

export function selectionCollapsed() {
  const sel = window.getSelection();
  return !sel || sel.isCollapsed;
}

function fragmentHtml(frag: DocumentFragment) {
  const d = document.createElement("div");
  d.appendChild(frag);
  return d.innerHTML;
}

/** HTML before and after the caret (the selection, if any, is dropped). */
export function splitAtCaret(el: HTMLElement): [string, string] {
  const offs = getOffsets(el) ?? { start: textLength(el), end: textLength(el) };
  const total = textLength(el);
  const before = document.createRange();
  before.selectNodeContents(el);
  const a = offs.start >= total ? null : positionAt(el, offs.start);
  if (a) before.setEnd(a.node, a.offset);
  const after = document.createRange();
  after.selectNodeContents(el);
  if (offs.end < total) {
    const b = positionAt(el, offs.end);
    after.setStart(b.node, b.offset);
  } else after.collapse(false);
  const clean = (h: string) => (h === "<br>" ? "" : h);
  return [clean(fragmentHtml(before.cloneContents())), clean(fragmentHtml(after.cloneContents()))];
}

export function textBeforeCaret(el: HTMLElement): string {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return "";
  const r = sel.getRangeAt(0);
  if (!el.contains(r.startContainer)) return "";
  const pre = document.createRange();
  pre.selectNodeContents(el);
  pre.setEnd(r.startContainer, r.startOffset);
  return pre.toString();
}

export function deleteTextRange(el: HTMLElement, start: number, end: number) {
  const r = rangeFromOffsets(el, start, end);
  r.deleteContents();
  setCaret(el, start);
}
