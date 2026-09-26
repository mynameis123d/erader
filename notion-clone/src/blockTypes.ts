import type { BlockType, Color } from "./types";

export interface SlashItem {
  id: string;
  label: string;
  description: string;
  glyph: string;
  keywords: string;
  group: "Basic blocks" | "Media & pages" | "Colors";
  type?: BlockType;
  action?: "page" | "database" | "color" | "bg";
  color?: Color;
  shortcut?: string;
}

export const TEXT_TYPES: BlockType[] = ["text", "h1", "h2", "h3", "bullet", "number", "todo", "toggle", "quote", "callout", "code"];

export const LIST_TYPES: BlockType[] = ["bullet", "number", "todo", "toggle"];

export const isTextual = (t: BlockType) => TEXT_TYPES.includes(t);

export const BLOCK_ITEMS: SlashItem[] = [
  { id: "text", type: "text", label: "Text", description: "Just start writing with plain text.", glyph: "Aa", keywords: "paragraph plain", group: "Basic blocks" },
  { id: "h1", type: "h1", label: "Heading 1", description: "Big section heading.", glyph: "H1", keywords: "title heading h1", group: "Basic blocks", shortcut: "#" },
  { id: "h2", type: "h2", label: "Heading 2", description: "Medium section heading.", glyph: "H2", keywords: "subtitle heading h2", group: "Basic blocks", shortcut: "##" },
  { id: "h3", type: "h3", label: "Heading 3", description: "Small section heading.", glyph: "H3", keywords: "heading h3", group: "Basic blocks", shortcut: "###" },
  { id: "bullet", type: "bullet", label: "Bulleted list", description: "Create a simple bulleted list.", glyph: "•", keywords: "unordered ul list bullet", group: "Basic blocks", shortcut: "-" },
  { id: "number", type: "number", label: "Numbered list", description: "Create a list with numbering.", glyph: "1.", keywords: "ordered ol list number", group: "Basic blocks", shortcut: "1." },
  { id: "todo", type: "todo", label: "To-do list", description: "Track tasks with a to-do list.", glyph: "☑", keywords: "todo task checkbox check", group: "Basic blocks", shortcut: "[]" },
  { id: "toggle", type: "toggle", label: "Toggle list", description: "Toggles can hide and show content inside.", glyph: "▸", keywords: "toggle collapse fold details", group: "Basic blocks", shortcut: ">" },
  { id: "quote", type: "quote", label: "Quote", description: "Capture a quote.", glyph: "❝", keywords: "blockquote citation", group: "Basic blocks", shortcut: "\"" },
  { id: "callout", type: "callout", label: "Callout", description: "Make writing stand out.", glyph: "💡", keywords: "note tip warning info callout", group: "Basic blocks" },
  { id: "divider", type: "divider", label: "Divider", description: "Visually divide blocks.", glyph: "—", keywords: "hr line separator rule", group: "Basic blocks", shortcut: "---" },
  { id: "code", type: "code", label: "Code", description: "Capture a code snippet.", glyph: "</>", keywords: "code snippet pre program", group: "Basic blocks", shortcut: "```" },
  { id: "toc", type: "toc", label: "Table of contents", description: "Show an outline of this page.", glyph: "☰", keywords: "toc outline contents headings", group: "Basic blocks" },
  { id: "page", action: "page", label: "Page", description: "Embed a sub-page inside this page.", glyph: "📄", keywords: "page subpage doc", group: "Media & pages" },
  { id: "database", action: "database", label: "Database", description: "Add a full-page database as a sub-page.", glyph: "🗃️", keywords: "database table board kanban calendar gallery", group: "Media & pages" },
  { id: "image", type: "image", label: "Image", description: "Upload or embed with a link.", glyph: "🖼️", keywords: "image picture photo media", group: "Media & pages" },
];

export const COLOR_VALUES: Record<Color, { text: string; bg: string; label: string }> = {
  default: { text: "inherit", bg: "transparent", label: "Default" },
  gray: { text: "rgb(120, 119, 116)", bg: "rgba(135, 131, 120, 0.15)", label: "Gray" },
  brown: { text: "rgb(159, 107, 83)", bg: "rgba(159, 107, 83, 0.18)", label: "Brown" },
  orange: { text: "rgb(217, 115, 13)", bg: "rgba(245, 144, 45, 0.2)", label: "Orange" },
  yellow: { text: "rgb(203, 145, 47)", bg: "rgba(233, 188, 50, 0.24)", label: "Yellow" },
  green: { text: "rgb(68, 131, 97)", bg: "rgba(77, 171, 154, 0.2)", label: "Green" },
  blue: { text: "rgb(51, 126, 169)", bg: "rgba(82, 156, 202, 0.2)", label: "Blue" },
  purple: { text: "rgb(144, 101, 176)", bg: "rgba(154, 109, 215, 0.2)", label: "Purple" },
  pink: { text: "rgb(193, 76, 138)", bg: "rgba(226, 85, 161, 0.18)", label: "Pink" },
  red: { text: "rgb(212, 76, 71)", bg: "rgba(255, 115, 105, 0.2)", label: "Red" },
};

export const COLOR_ITEMS: SlashItem[] = (Object.keys(COLOR_VALUES) as Color[]).flatMap((c) => [
  { id: `color-${c}`, action: "color" as const, color: c, label: c === "default" ? "Default text" : `${COLOR_VALUES[c].label} text`, description: "", glyph: "A", keywords: `color ${c}`, group: "Colors" as const },
  ...(c === "default" ? [] : [{ id: `bg-${c}`, action: "bg" as const, color: c, label: `${COLOR_VALUES[c].label} background`, description: "", glyph: "A", keywords: `background highlight ${c}`, group: "Colors" as const }]),
]);

export const SLASH_ITEMS = [...BLOCK_ITEMS, ...COLOR_ITEMS];

export function filterSlash(query: string): SlashItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return BLOCK_ITEMS;
  // Match on word starts so "red" finds "Red text" but not "unordered list".
  const hit = (i: SlashItem) =>
    i.label.toLowerCase().startsWith(q) || `${i.label} ${i.keywords} ${i.id}`.toLowerCase().split(/[\s-]+/).some((w) => w.startsWith(q));
  return SLASH_ITEMS.filter(hit).sort((a, b) => {
    const as = a.label.toLowerCase().startsWith(q) ? 0 : 1;
    const bs = b.label.toLowerCase().startsWith(q) ? 0 : 1;
    return as - bs;
  });
}

export const TURN_INTO: BlockType[] = ["text", "h1", "h2", "h3", "bullet", "number", "todo", "toggle", "quote", "callout", "code"];

export const typeLabel = (t: BlockType) => BLOCK_ITEMS.find((i) => i.type === t)?.label ?? "Text";
export const typeGlyph = (t: BlockType) => BLOCK_ITEMS.find((i) => i.type === t)?.glyph ?? "Aa";

export const CODE_LANGS = ["plain", "javascript", "typescript", "python", "html", "css", "json", "bash", "sql", "go", "rust", "java", "c", "cpp", "markdown", "yaml"];
