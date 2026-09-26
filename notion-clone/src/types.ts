export type BlockType =
  | "text"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "number"
  | "todo"
  | "toggle"
  | "quote"
  | "callout"
  | "divider"
  | "code"
  | "image"
  | "page"
  | "toc";

export type Color =
  | "default"
  | "gray"
  | "brown"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "red";

export interface Block {
  id: string;
  type: BlockType;
  /** Inline rich text as sanitized HTML. */
  html: string;
  /** Nesting depth. Children of a toggle/list are the following blocks with a deeper indent. */
  indent: number;
  checked?: boolean;
  collapsed?: boolean;
  color?: Color;
  bg?: Color;
  icon?: string;
  lang?: string;
  url?: string;
  pageId?: string;
}

export type PropType =
  | "title"
  | "text"
  | "number"
  | "select"
  | "multi"
  | "status"
  | "checkbox"
  | "date"
  | "url";

export interface SelectOption {
  id: string;
  name: string;
  color: Color;
}

export interface DbProp {
  id: string;
  name: string;
  type: PropType;
  options?: SelectOption[];
  width?: number;
}

export type ViewType = "table" | "board" | "gallery" | "list" | "calendar";

export interface DbView {
  id: string;
  name: string;
  type: ViewType;
  groupBy?: string;
  dateProp?: string;
  sort?: { propId: string; dir: "asc" | "desc" } | null;
  filter?: { propId: string; value: string } | null;
  hidden?: string[];
}

export interface Database {
  props: DbProp[];
  views: DbView[];
  activeView: string;
}

export type PropValue = string | number | boolean | string[] | null;

export interface Page {
  id: string;
  parentId: string | null;
  title: string;
  icon: string;
  cover: string | null;
  blocks: Block[];
  createdAt: number;
  updatedAt: number;
  order: number;
  favorite: boolean;
  trashed: boolean;
  trashedAt?: number;
  kind: "doc" | "database";
  db?: Database;
  /** Set when this page is a row of a database. */
  isRow?: boolean;
  props?: Record<string, PropValue>;
  fullWidth?: boolean;
  smallText?: boolean;
  font?: "sans" | "serif" | "mono";
  locked?: boolean;
  expanded?: boolean;
}

export type Pages = Record<string, Page>;

export type Theme = "system" | "light" | "dark";
