import type { Block, BlockType, Color, Page, Pages } from "./types";

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const COLORS: Color[] = [
  "default",
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
];

export function newBlock(type: BlockType = "text", html = "", extra: Partial<Block> = {}): Block {
  return { id: uid(), type, html, indent: 0, ...extra };
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function htmlToText(html: string): string {
  if (!html) return "";
  const d = document.createElement("div");
  d.innerHTML = html;
  return (d.textContent || "").replace(/\u00a0/g, " ").replace(/\u200b/g, "");
}

const ALLOWED = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "DEL", "CODE", "A", "SPAN", "BR", "FONT", "MARK"]);

/** Keep only inline formatting we understand; strips scripts, attributes and block wrappers. */
export function sanitizeHtml(html: string): string {
  const src = document.createElement("div");
  src.innerHTML = html;
  const out = document.createElement("div");
  const walk = (from: Node, to: Node) => {
    from.childNodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        to.appendChild(document.createTextNode(n.textContent || ""));
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        const el = n as HTMLElement;
        if (ALLOWED.has(el.tagName)) {
          const tag = el.tagName === "FONT" ? "span" : el.tagName.toLowerCase();
          const copy = document.createElement(tag);
          if (el.tagName === "A") {
            const href = el.getAttribute("href") || "";
            if (/^(https?:|mailto:|#)/i.test(href)) copy.setAttribute("href", href);
            const pid = el.getAttribute("data-page");
            if (pid) {
              copy.setAttribute("data-page", pid);
              copy.setAttribute("contenteditable", "false");
              copy.className = "mention";
            }
          }
          const color = el.style.color || el.getAttribute("color");
          const bg = el.style.backgroundColor;
          if (color) copy.style.color = color;
          if (bg) copy.style.backgroundColor = bg;
          if (el.style.fontWeight === "bold" || Number(el.style.fontWeight) >= 600) copy.style.fontWeight = "600";
          if (el.style.fontStyle === "italic") copy.style.fontStyle = "italic";
          walk(el, copy);
          to.appendChild(copy);
        } else if (!["SCRIPT", "STYLE", "IFRAME", "OBJECT"].includes(el.tagName)) {
          walk(el, to);
        }
      }
    });
  };
  walk(src, out);
  return out.innerHTML;
}

export function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function pageTitle(p?: Page | null) {
  return p?.title?.trim() || "Untitled";
}

export function ancestors(pages: Pages, id: string): Page[] {
  const chain: Page[] = [];
  let cur = pages[id];
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.unshift(cur);
    cur = cur.parentId ? pages[cur.parentId] : undefined!;
  }
  return chain;
}

export function descendants(pages: Pages, id: string): string[] {
  const out: string[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const p of Object.values(pages)) {
      if (p.parentId === cur) {
        out.push(p.id);
        stack.push(p.id);
      }
    }
  }
  return out;
}

export function childrenOf(pages: Pages, parentId: string | null, opts: { rows?: boolean; trashed?: boolean } = {}) {
  return Object.values(pages)
    .filter(
      (p) =>
        p.parentId === parentId &&
        (opts.trashed ? true : !p.trashed) &&
        (opts.rows ? p.isRow : !p.isRow),
    )
    .sort((a, b) => a.order - b.order);
}

/** Numbered-list index for each block, restarting whenever the run is broken at that depth. */
export function listNumbers(blocks: Block[]): Record<string, number> {
  const res: Record<string, number> = {};
  const counters: number[] = [];
  for (const b of blocks) {
    counters.length = b.indent + 1;
    if (b.type === "number") {
      counters[b.indent] = (counters[b.indent] || 0) + 1;
      res[b.id] = counters[b.indent];
    } else {
      counters[b.indent] = 0;
    }
  }
  return res;
}

/** Blocks hidden because an ancestor toggle is collapsed. */
export function hiddenBlocks(blocks: Block[]): Set<string> {
  const hidden = new Set<string>();
  let hideDeeperThan = Infinity;
  for (const b of blocks) {
    if (b.indent > hideDeeperThan) {
      hidden.add(b.id);
      continue;
    }
    hideDeeperThan = Infinity;
    if (b.type === "toggle" && b.collapsed) hideDeeperThan = b.indent;
  }
  return hidden;
}

/** Index range [start, end) of a block plus all of its nested children. */
export function subtreeRange(blocks: Block[], index: number): [number, number] {
  const base = blocks[index].indent;
  let end = index + 1;
  while (end < blocks.length && blocks[end].indent > base) end++;
  return [index, end];
}

function inlineToMarkdown(html: string): string {
  const d = document.createElement("div");
  d.innerHTML = html;
  const walk = (n: Node): string => {
    if (n.nodeType === Node.TEXT_NODE) return (n.textContent || "").replace(/ /g, " ");
    if (n.nodeType !== Node.ELEMENT_NODE) return "";
    const el = n as HTMLElement;
    const inner = Array.from(el.childNodes).map(walk).join("");
    if (!inner) return "";
    switch (el.tagName) {
      case "B":
      case "STRONG":
        return `**${inner}**`;
      case "I":
      case "EM":
        return `*${inner}*`;
      case "S":
      case "STRIKE":
      case "DEL":
        return `~~${inner}~~`;
      case "CODE":
        return "`" + inner + "`";
      case "A":
        return el.getAttribute("href") ? `[${inner}](${el.getAttribute("href")})` : inner;
      case "BR":
        return "\n";
      default:
        return inner;
    }
  };
  return walk(d);
}

export function pageToMarkdown(page: Page, pages: Pages): string {
  const lines: string[] = [`# ${page.icon ? page.icon + " " : ""}${pageTitle(page)}`, ""];
  const nums = listNumbers(page.blocks);
  for (const b of page.blocks) {
    const pad = "  ".repeat(b.indent);
    const md = inlineToMarkdown(b.html);
    switch (b.type) {
      case "h1":
        lines.push(`## ${md}`);
        break;
      case "h2":
        lines.push(`### ${md}`);
        break;
      case "h3":
        lines.push(`#### ${md}`);
        break;
      case "bullet":
        lines.push(`${pad}- ${md}`);
        break;
      case "number":
        lines.push(`${pad}${nums[b.id]}. ${md}`);
        break;
      case "todo":
        lines.push(`${pad}- [${b.checked ? "x" : " "}] ${md}`);
        break;
      case "toggle":
        lines.push(`${pad}- ▸ ${md}`);
        break;
      case "quote":
        lines.push(`> ${md}`);
        break;
      case "callout":
        lines.push(`> ${b.icon || "💡"} ${md}`);
        break;
      case "divider":
        lines.push("---");
        break;
      case "code":
        lines.push("```" + (b.lang || ""), htmlToText(b.html), "```");
        break;
      case "image":
        lines.push(`![${md}](${b.url || ""})`);
        break;
      case "page": {
        const p = b.pageId ? pages[b.pageId] : undefined;
        lines.push(`[${p?.icon || "📄"} ${pageTitle(p)}](#/${b.pageId})`);
        break;
      }
      case "toc":
        break;
      default:
        lines.push(pad + md);
    }
  }
  return lines.join("\n");
}

/** Convert one line of pasted markdown into a block. */
export function markdownLineToBlock(line: string): Block {
  const indent = Math.floor((line.match(/^\s*/)?.[0].length || 0) / 2);
  const t = line.trim();
  const inline = (s: string) =>
    escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<i>$2</i>")
      .replace(/~~(.+?)~~/g, "<s>$1</s>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\[(.+?)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>');
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^###\s+(.*)/))) return newBlock("h3", inline(m[1]));
  if ((m = t.match(/^##\s+(.*)/))) return newBlock("h2", inline(m[1]));
  if ((m = t.match(/^#\s+(.*)/))) return newBlock("h1", inline(m[1]));
  if ((m = t.match(/^[-*]\s+\[( |x|X)\]\s*(.*)/)))
    return newBlock("todo", inline(m[2]), { indent, checked: m[1].toLowerCase() === "x" });
  if ((m = t.match(/^[-*•]\s+(.*)/))) return newBlock("bullet", inline(m[1]), { indent });
  if ((m = t.match(/^\d+[.)]\s+(.*)/))) return newBlock("number", inline(m[1]), { indent });
  if ((m = t.match(/^>\s?(.*)/))) return newBlock("quote", inline(m[1]));
  if (/^(---|\*\*\*|___)$/.test(t)) return newBlock("divider");
  return newBlock("text", inline(t), { indent });
}

export function markdownToBlocks(text: string): Block[] {
  const out: Block[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.trim().match(/^```(\w*)/);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) body.push(lines[i++]);
      out.push(newBlock("code", escapeHtml(body.join("\n")), { lang: fence[1] || "plain" }));
      continue;
    }
    if (!line.trim()) continue;
    out.push(markdownLineToBlock(line));
  }
  return out;
}

export function download(filename: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
export const modKey = isMac ? "⌘" : "Ctrl";
