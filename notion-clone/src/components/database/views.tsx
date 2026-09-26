import { useMemo, useState } from "react";
import type { Page, SelectOption } from "../../types";
import { useStore } from "../../store";
import { COLOR_VALUES } from "../../blockTypes";
import { htmlToText, pageTitle } from "../../utils";
import { rowValue } from "../../db";
import { coverStyle } from "../../covers";
import { IconChevronRight, IconBack, IconPlus } from "../Icons";
import { PropDisplay, RowTitle } from "./cells";
import type { ViewProps } from "./Database";

function CardProps({ row, props }: { row: Page; props: ViewProps["props"] }) {
  const shown = props.filter((p) => p.type !== "title");
  return (
    <div className="card-props">
      {shown.map((p) => (
        <PropDisplay key={p.id} row={row} prop={p} />
      ))}
    </div>
  );
}

const DRAG_MIME = "application/x-notebook-row";

export function BoardView({ db, view, rows, props, open, addRow }: ViewProps) {
  const s = useStore.getState();
  const groupProp = db.db!.props.find((p) => p.id === view.groupBy && (p.type === "select" || p.type === "status"));
  const [over, setOver] = useState<{ col: string; before: string | null } | null>(null);

  if (!groupProp)
    return (
      <div className="db-empty">
        Board views group cards by a <b>Select</b> or <b>Status</b> property. Open the view menu (⋯) to choose one.
      </div>
    );

  const options = groupProp.options ?? [];
  const cols: { id: string; opt: SelectOption | null }[] = [{ id: "__none", opt: null }, ...options.map((o) => ({ id: o.id, opt: o }))];
  const byCol = (id: string) =>
    rows.filter((r) => {
      const v = rowValue(r, groupProp);
      return id === "__none" ? !options.some((o) => o.id === v) : v === id;
    });

  const dropOn = (colId: string, beforeId: string | null, e: React.DragEvent) => {
    e.preventDefault();
    setOver(null);
    const rowId = e.dataTransfer.getData(DRAG_MIME);
    if (!rowId) return;
    s.setRowProp(rowId, groupProp.id, colId === "__none" ? null : colId);
    // Reorder: place between neighbours unless the view is sorted.
    if (!view.sort) {
      const list = byCol(colId).filter((r) => r.id !== rowId);
      const idx = beforeId ? list.findIndex((r) => r.id === beforeId) : list.length;
      const prev = list[idx - 1]?.order;
      const next = list[idx]?.order;
      const order = prev === undefined && next === undefined ? 0 : prev === undefined ? next! - 1 : next === undefined ? prev + 1 : (prev + next) / 2;
      s.updatePage(rowId, { order });
    }
  };

  return (
    <div className="board">
      {cols.map(({ id, opt }) => {
        const items = byCol(id);
        if (id === "__none" && !items.length) return null;
        return (
          <div
            key={id}
            className={`board-col${over?.col === id ? " over" : ""}`}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
              e.preventDefault();
              const card = (e.target as HTMLElement).closest<HTMLElement>(".board-card");
              let before: string | null = null;
              if (card) {
                const r = card.getBoundingClientRect();
                before = e.clientY < r.top + r.height / 2 ? card.dataset.id! : (items[items.findIndex((x) => x.id === card.dataset.id) + 1]?.id ?? null);
              }
              if (over?.col !== id || over.before !== before) setOver({ col: id, before });
            }}
            onDragLeave={(e) => {
              if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setOver(null);
            }}
            onDrop={(e) => dropOn(id, over?.col === id ? over.before : null, e)}
          >
            <div className="board-col-head">
              {opt ? (
                <span className="tag" style={{ background: COLOR_VALUES[opt.color].bg }}>
                  {groupProp.type === "status" && <span className="dot" style={{ background: COLOR_VALUES[opt.color].text }} />}
                  {opt.name}
                </span>
              ) : (
                <span className="muted">No {groupProp.name}</span>
              )}
              <span className="muted count">{items.length}</span>
              <button className="icon-btn small push" title="New" onClick={() => addRow({ [groupProp.id]: opt?.id ?? null })}>
                <IconPlus size={14} />
              </button>
            </div>
            <div className="board-cards">
              {items.map((r) => (
                <div key={r.id}>
                  {over?.col === id && over.before === r.id && <div className="board-drop" />}
                  <div
                    className="board-card"
                    data-id={r.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(DRAG_MIME, r.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => open(r)}
                  >
                    <RowTitle row={r} />
                    <CardProps row={r} props={props.filter((p) => p.id !== groupProp.id)} />
                  </div>
                </div>
              ))}
              {over?.col === id && over.before === null && <div className="board-drop" />}
              <button className="board-new" onClick={() => addRow({ [groupProp.id]: opt?.id ?? null })}>
                <IconPlus size={14} /> New
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function preview(row: Page) {
  return row.blocks
    .map((b) => htmlToText(b.html))
    .filter((t) => t.trim())
    .slice(0, 4);
}

export function GalleryView({ rows, props, open, addRow }: ViewProps) {
  return (
    <div className="gallery">
      {rows.map((r) => {
        const lines = preview(r);
        return (
          <div key={r.id} className="gallery-card" onClick={() => open(r)}>
            <div className="gallery-cover" style={{ background: coverStyle(r.cover) }}>
              {!r.cover &&
                (lines.length ? (
                  <div className="gallery-preview">
                    {lines.map((l, i) => (
                      <div key={i}>{l}</div>
                    ))}
                  </div>
                ) : (
                  <div className="gallery-emoji">{r.icon || "📄"}</div>
                ))}
            </div>
            <div className="gallery-body">
              <RowTitle row={r} />
              <CardProps row={r} props={props} />
            </div>
          </div>
        );
      })}
      <button className="gallery-card gallery-new" onClick={() => addRow()}>
        <IconPlus /> New
      </button>
    </div>
  );
}

export function ListView({ rows, props, open, addRow }: ViewProps) {
  return (
    <div className="list-view">
      {rows.map((r) => (
        <div key={r.id} className="list-row" onClick={() => open(r)}>
          <RowTitle row={r} />
          <CardProps row={r} props={props} />
        </div>
      ))}
      <button className="db-new-row" onClick={() => addRow()}>
        <IconPlus size={14} /> New
      </button>
    </div>
  );
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function CalendarView({ db, view, rows, open, addRow }: ViewProps) {
  const s = useStore.getState();
  const dateProp = db.db!.props.find((p) => p.id === view.dateProp && p.type === "date");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [over, setOver] = useState<string | null>(null);

  const days = useMemo(() => {
    const start = new Date(month);
    start.setDate(1 - ((start.getDay() + 6) % 7)); // weeks start on Monday
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);

  if (!dateProp)
    return (
      <div className="db-empty">
        Calendar views need a <b>Date</b> property. Open the view menu (⋯) to choose one.
      </div>
    );

  const byDay = new Map<string, Page[]>();
  for (const r of rows) {
    const v = rowValue(r, dateProp);
    if (typeof v === "string" && v) byDay.set(v.slice(0, 10), [...(byDay.get(v.slice(0, 10)) ?? []), r]);
  }
  const today = iso(new Date());
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const undated = rows.filter((r) => !rowValue(r, dateProp));

  return (
    <div className="calendar">
      <div className="cal-head">
        <div className="cal-title">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month">
            <IconBack size={14} />
          </button>
          <button className="btn small" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
            Today
          </button>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month">
            <IconChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="cal-grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="cal-dow">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const key = iso(d);
          const items = byDay.get(key) ?? [];
          return (
            <div
              key={key}
              className={`cal-cell${d.getMonth() !== month.getMonth() ? " other" : ""}${key === today ? " today" : ""}${over === key ? " over" : ""}`}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
                e.preventDefault();
                setOver(key);
              }}
              onDragLeave={() => setOver((o) => (o === key ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = e.dataTransfer.getData(DRAG_MIME);
                if (id) s.setRowProp(id, dateProp.id, key);
              }}
            >
              <div className="cal-date">
                <span>{d.getDate() === 1 ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : d.getDate()}</span>
                <button className="icon-btn small cal-add" onClick={() => addRow({ [dateProp.id]: key })} aria-label={`New on ${key}`}>
                  <IconPlus size={12} />
                </button>
              </div>
              {items.map((r) => (
                <div
                  key={r.id}
                  className="cal-item"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData(DRAG_MIME, r.id)}
                  onClick={() => open(r)}
                  title={pageTitle(r)}
                >
                  <span>{r.icon || "📄"}</span> {pageTitle(r)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {undated.length > 0 && (
        <div className="cal-undated">
          <span className="muted">No date ({undated.length}):</span>
          {undated.map((r) => (
            <span key={r.id} className="cal-item inline" draggable onDragStart={(e) => e.dataTransfer.setData(DRAG_MIME, r.id)} onClick={() => open(r)}>
              {r.icon || "📄"} {pageTitle(r)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
