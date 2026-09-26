import type { Database, DbProp, Page, PropType, PropValue, SelectOption } from "./types";
import { COLORS, uid } from "./utils";
import { useStore } from "./store";

export function defaultDatabase(): Database {
  const status: DbProp = {
    id: uid(),
    name: "Status",
    type: "status",
    options: [
      { id: uid(), name: "Not started", color: "gray" },
      { id: uid(), name: "In progress", color: "blue" },
      { id: uid(), name: "Done", color: "green" },
    ],
  };
  const tableId = uid();
  return {
    props: [{ id: "title", name: "Name", type: "title" }, status, { id: uid(), name: "Tags", type: "multi", options: [] }, { id: uid(), name: "Date", type: "date" }],
    views: [
      { id: tableId, name: "Table", type: "table" },
      { id: uid(), name: "Board", type: "board", groupBy: status.id },
    ],
    activeView: tableId,
  };
}

/** Create a full-page database (with a few empty rows) and return its id. */
export function createDatabase(parentId: string | null, title = ""): string {
  const s = useStore.getState();
  const id = s.createPage(parentId, { kind: "database", title, icon: "🗃️", blocks: [], db: defaultDatabase() });
  for (let i = 0; i < 3; i++) s.addRow(id);
  return id;
}

export const PROP_TYPES: { type: PropType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "number", label: "Number" },
  { type: "select", label: "Select" },
  { type: "multi", label: "Multi-select" },
  { type: "status", label: "Status" },
  { type: "date", label: "Date" },
  { type: "checkbox", label: "Checkbox" },
  { type: "url", label: "URL" },
];

export function randomColor(): SelectOption["color"] {
  return COLORS[1 + Math.floor(Math.random() * (COLORS.length - 1))];
}

export function rowValue(row: Page, prop: DbProp): PropValue {
  if (prop.type === "title") return row.title;
  return row.props?.[prop.id] ?? null;
}

/** Comparable/displayable plain value for sorting, filtering and search. */
export function plainValue(row: Page, prop: DbProp): string | number {
  const v = rowValue(row, prop);
  if (v === null || v === undefined) return "";
  switch (prop.type) {
    case "select":
    case "status":
      return prop.options?.find((o) => o.id === v)?.name ?? "";
    case "multi":
      return (Array.isArray(v) ? v : [])
        .map((id) => prop.options?.find((o) => o.id === id)?.name ?? "")
        .join(", ");
    case "checkbox":
      return v ? 1 : 0;
    case "number":
      return typeof v === "number" ? v : Number(v) || 0;
    default:
      return String(v);
  }
}

export function sortRows(rows: Page[], props: DbProp[], sort?: { propId: string; dir: "asc" | "desc" } | null) {
  if (!sort) return rows;
  const prop = props.find((p) => p.id === sort.propId);
  if (!prop) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = plainValue(a, prop);
    const vb = plainValue(b, prop);
    if (va === "" && vb !== "") return 1;
    if (vb === "" && va !== "") return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
    return String(va).localeCompare(String(vb), undefined, { numeric: true }) * dir;
  });
}

/** Convert a value when a property changes type, keeping as much meaning as possible. */
export function convertValue(v: PropValue, from: DbProp, to: PropType, toOptions: SelectOption[]): PropValue {
  if (v === null || v === undefined) return null;
  const names = (): string[] => {
    if (from.type === "select" || from.type === "status") return [from.options?.find((o) => o.id === v)?.name ?? ""].filter(Boolean);
    if (from.type === "multi") return (v as string[]).map((id) => from.options?.find((o) => o.id === id)?.name ?? "").filter(Boolean);
    return String(v)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };
  switch (to) {
    case "text":
    case "url":
      return names().join(", ") || (typeof v === "boolean" ? (v ? "Yes" : "") : String(v));
    case "number": {
      const n = Number(typeof v === "string" ? v : names()[0]);
      return Number.isFinite(n) ? n : null;
    }
    case "checkbox":
      return !!v && v !== "0" && v !== "false";
    case "select":
    case "status": {
      const n = names()[0];
      return toOptions.find((o) => o.name === n)?.id ?? null;
    }
    case "multi":
      return names()
        .map((n) => toOptions.find((o) => o.name === n)?.id)
        .filter(Boolean) as string[];
    case "date":
      return typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null;
    default:
      return v;
  }
}

export function optionsFromValues(rows: Page[], from: DbProp): SelectOption[] {
  const seen = new Map<string, SelectOption>();
  for (const o of from.options ?? []) seen.set(o.name, { ...o });
  if (from.type !== "select" && from.type !== "status" && from.type !== "multi") {
    for (const r of rows) {
      const v = r.props?.[from.id];
      if (v === null || v === undefined || v === "") continue;
      for (const name of String(v).split(",").map((s) => s.trim()).filter(Boolean))
        if (!seen.has(name)) seen.set(name, { id: uid(), name, color: randomColor() });
    }
  }
  return [...seen.values()];
}

export function formatDate(v: string) {
  if (!v) return "";
  const d = new Date(v + "T00:00:00");
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
