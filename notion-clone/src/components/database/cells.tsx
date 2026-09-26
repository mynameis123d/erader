import { useState } from "react";
import type { DbProp, Page, PropValue, SelectOption } from "../../types";
import { useStore } from "../../store";
import { COLOR_VALUES } from "../../blockTypes";
import { COLORS, pageTitle, uid } from "../../utils";
import { formatDate, randomColor, rowValue } from "../../db";
import { anchorOf, MenuHeading, Popover, type Anchor } from "../Popover";
import { IconArrowUpRight, IconClose, IconTrash } from "../Icons";

export function Tag({ opt, onRemove }: { opt: SelectOption; onRemove?: () => void }) {
  return (
    <span className="tag" style={{ background: COLOR_VALUES[opt.color].bg, color: "var(--text)" }}>
      {opt.name}
      {onRemove && (
        <button
          className="tag-x"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${opt.name}`}
        >
          <IconClose size={10} />
        </button>
      )}
    </span>
  );
}

export function StatusDot({ opt }: { opt: SelectOption }) {
  return (
    <span className="tag status" style={{ background: COLOR_VALUES[opt.color].bg }}>
      <span className="dot" style={{ background: COLOR_VALUES[opt.color].text }} />
      {opt.name}
    </span>
  );
}

/** Read-only rendering of a property value (used by board, gallery, list and calendar cards). */
export function PropDisplay({ row, prop }: { row: Page; prop: DbProp }) {
  const v = rowValue(row, prop);
  if (v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length)) return null;
  switch (prop.type) {
    case "select": {
      const o = prop.options?.find((x) => x.id === v);
      return o ? <Tag opt={o} /> : null;
    }
    case "status": {
      const o = prop.options?.find((x) => x.id === v);
      return o ? <StatusDot opt={o} /> : null;
    }
    case "multi":
      return (
        <span className="tags">
          {(v as string[]).map((id) => {
            const o = prop.options?.find((x) => x.id === id);
            return o ? <Tag key={id} opt={o} /> : null;
          })}
        </span>
      );
    case "checkbox":
      return v ? <span className="muted">☑ {prop.name}</span> : null;
    case "date":
      return <span className="muted">{formatDate(String(v))}</span>;
    case "url":
      return (
        <a className="cell-url" href={String(v)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
          {String(v).replace(/^https?:\/\//, "")}
        </a>
      );
    case "number":
      return <span>{String(v)}</span>;
    default:
      return <span className="muted">{String(v)}</span>;
  }
}

interface OptionPickerProps {
  dbId: string;
  prop: DbProp;
  value: PropValue;
  anchor: Anchor;
  onChange(v: PropValue): void;
  onClose(): void;
}

export function OptionPicker({ dbId, prop, value, anchor, onChange, onClose }: OptionPickerProps) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ opt: SelectOption; anchor: Anchor } | null>(null);
  const updateProp = useStore((s) => s.updateProp);
  const multi = prop.type === "multi";
  const options = prop.options ?? [];
  const selected: string[] = multi ? ((value as string[]) ?? []) : value ? [value as string] : [];
  const filtered = options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase()));
  const exact = options.find((o) => o.name.toLowerCase() === q.trim().toLowerCase());

  const pick = (id: string) => {
    if (multi) onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
    else {
      onChange(selected[0] === id ? null : id);
      onClose();
    }
    setQ("");
  };
  const create = () => {
    const name = q.trim();
    if (!name) return;
    if (exact) return pick(exact.id);
    const opt = { id: uid(), name, color: randomColor() };
    updateProp(dbId, prop.id, { options: [...options, opt] });
    pick(opt.id);
  };

  return (
    <Popover anchor={anchor} onClose={onClose} className="option-picker" width={280}>
      <div className="option-input">
        {selected.map((id) => {
          const o = options.find((x) => x.id === id);
          return o ? <Tag key={id} opt={o} onRemove={() => pick(id)} /> : null;
        })}
        <input
          autoFocus
          value={q}
          placeholder={selected.length ? "" : "Search or create…"}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered.length === 1 && !exact && !q.trim()) pick(filtered[0].id);
              else if (q.trim()) create();
            }
            if (e.key === "Backspace" && !q && selected.length && multi) pick(selected[selected.length - 1]);
          }}
        />
      </div>
      <MenuHeading>{options.length ? "Select an option or create one" : "Type to create an option"}</MenuHeading>
      <div className="option-list">
        {filtered.map((o) => (
          <div key={o.id} className={`option-row${selected.includes(o.id) ? " active" : ""}`} onClick={() => pick(o.id)}>
            <Tag opt={o} />
            <button
              className="icon-btn small"
              onClick={(e) => {
                e.stopPropagation();
                setEditing({ opt: o, anchor: anchorOf(e.currentTarget) });
              }}
              aria-label="Edit option"
            >
              ⋯
            </button>
          </div>
        ))}
        {q.trim() && !exact && (
          <div className="option-row" onClick={create}>
            <span className="muted">Create</span> <Tag opt={{ id: "new", name: q.trim(), color: "gray" }} />
          </div>
        )}
      </div>
      {editing && (
        <Popover anchor={editing.anchor} onClose={() => setEditing(null)} width={220}>
          <div className="menu-search">
            <input
              autoFocus
              defaultValue={editing.opt.name}
              onChange={(e) =>
                updateProp(dbId, prop.id, { options: options.map((o) => (o.id === editing.opt.id ? { ...o, name: e.target.value } : o)) })
              }
            />
          </div>
          <button
            className="menu-item danger"
            onClick={() => {
              updateProp(dbId, prop.id, { options: options.filter((o) => o.id !== editing.opt.id) });
              if (selected.includes(editing.opt.id)) onChange(multi ? selected.filter((s) => s !== editing.opt.id) : null);
              setEditing(null);
            }}
          >
            <span className="menu-icon">
              <IconTrash />
            </span>
            Delete
          </button>
          <MenuHeading>Colors</MenuHeading>
          {COLORS.map((c) => (
            <button
              key={c}
              className={`menu-item${editing.opt.color === c ? " active" : ""}`}
              onClick={() => {
                updateProp(dbId, prop.id, { options: options.map((o) => (o.id === editing.opt.id ? { ...o, color: c } : o)) });
                setEditing({ ...editing, opt: { ...editing.opt, color: c } });
              }}
            >
              <span className="menu-icon">
                <span className="color-chip" style={{ background: COLOR_VALUES[c].bg, borderColor: COLOR_VALUES[c].text }} />
              </span>
              {COLOR_VALUES[c].label}
            </button>
          ))}
        </Popover>
      )}
    </Popover>
  );
}

/** Editable cell used by the table view and the page property panel. */
export function PropEditor({ dbId, row, prop, onOpen }: { dbId: string; row: Page; prop: DbProp; onOpen?: () => void }) {
  const setRowProp = useStore((s) => s.setRowProp);
  const updatePage = useStore((s) => s.updatePage);
  const [picker, setPicker] = useState<Anchor | null>(null);
  const v = rowValue(row, prop);
  const set = (val: PropValue) => setRowProp(row.id, prop.id, val);

  switch (prop.type) {
    case "title":
      return (
        <div className="cell-title">
          <span className="cell-title-icon">{row.icon || "📄"}</span>
          <input
            className="cell-input title"
            value={row.title}
            placeholder="Untitled"
            onChange={(e) => updatePage(row.id, { title: e.target.value }, `title:${row.id}`)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
          {onOpen && (
            <button className="cell-open" onClick={onOpen}>
              <IconArrowUpRight size={12} /> Open
            </button>
          )}
        </div>
      );
    case "text":
      return <input className="cell-input" value={(v as string) ?? ""} onChange={(e) => set(e.target.value)} placeholder="Empty" />;
    case "url":
      return (
        <div className="cell-url-wrap">
          <input className="cell-input" value={(v as string) ?? ""} onChange={(e) => set(e.target.value)} placeholder="Empty" />
          {v ? (
            <a className="cell-url-go" href={/^https?:/.test(String(v)) ? String(v) : `https://${v}`} target="_blank" rel="noopener noreferrer" title="Open link">
              <IconArrowUpRight size={12} />
            </a>
          ) : null}
        </div>
      );
    case "number":
      return (
        <input
          className="cell-input num"
          type="number"
          value={v === null || v === undefined ? "" : String(v)}
          onChange={(e) => set(e.target.value === "" ? null : Number(e.target.value))}
          placeholder="Empty"
        />
      );
    case "checkbox":
      return (
        <label className="cell-check">
          <input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} />
        </label>
      );
    case "date":
      return <input className={`cell-input date${v ? "" : " empty"}`} type="date" value={(v as string) ?? ""} onChange={(e) => set(e.target.value || null)} />;
    case "select":
    case "status":
    case "multi": {
      const ids = prop.type === "multi" ? ((v as string[]) ?? []) : v ? [v as string] : [];
      return (
        <>
          <div className="cell-tags" onClick={(e) => setPicker(anchorOf(e.currentTarget))} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setPicker(anchorOf(e.currentTarget))}>
            {ids.length ? (
              ids.map((id) => {
                const o = prop.options?.find((x) => x.id === id);
                return o ? prop.type === "status" ? <StatusDot key={id} opt={o} /> : <Tag key={id} opt={o} /> : null;
              })
            ) : (
              <span className="placeholder">Empty</span>
            )}
          </div>
          {picker && <OptionPicker dbId={dbId} prop={prop} value={v} anchor={picker} onChange={set} onClose={() => setPicker(null)} />}
        </>
      );
    }
  }
}

export function RowTitle({ row }: { row: Page }) {
  return (
    <span className="row-title">
      <span className="row-title-icon">{row.icon || "📄"}</span>
      {pageTitle(row)}
    </span>
  );
}
