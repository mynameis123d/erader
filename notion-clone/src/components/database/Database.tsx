import { useMemo, useRef, useState } from "react";
import type { DbProp, DbView, Page, PropType, PropValue, ViewType } from "../../types";
import { useStore } from "../../store";
import { childrenOf, uid } from "../../utils";
import { convertValue, optionsFromValues, plainValue, PROP_TYPES, rowValue, sortRows } from "../../db";
import { navigate } from "../../router";
import { anchorOf, MenuHeading, MenuItem, MenuSep, Popover, type Anchor } from "../Popover";
import {
  IconBoard,
  IconCalendar,
  IconCheckSquare,
  IconChevronDown,
  IconDots,
  IconEye,
  IconEyeOff,
  IconFilter,
  IconGallery,
  IconHash,
  IconList,
  IconPlus,
  IconSearch,
  IconSelect,
  IconSort,
  IconStatus,
  IconTable,
  IconTags,
  IconText,
  IconTrash,
  IconUrl,
} from "../Icons";
import { PropEditor } from "./cells";
import { BoardView, CalendarView, GalleryView, ListView } from "./views";

export const VIEW_ICONS: Record<ViewType, typeof IconTable> = {
  table: IconTable,
  board: IconBoard,
  gallery: IconGallery,
  list: IconList,
  calendar: IconCalendar,
};

export const PROP_ICONS: Record<PropType, typeof IconTable> = {
  title: IconText,
  text: IconText,
  number: IconHash,
  select: IconSelect,
  multi: IconTags,
  status: IconStatus,
  checkbox: IconCheckSquare,
  date: IconCalendar,
  url: IconUrl,
};

export interface ViewProps {
  db: Page;
  view: DbView;
  rows: Page[];
  props: DbProp[];
  open(row: Page): void;
  addRow(values?: Record<string, PropValue>): void;
}

/** Rows of a database with the view's filter, search and sort applied. */
function useRows(db: Page, view: DbView, search: string) {
  const pages = useStore((s) => s.pages);
  return useMemo(() => {
    const props = db.db!.props;
    let rows = childrenOf(pages, db.id, { rows: true });
    if (view.filter?.propId) {
      const prop = props.find((p) => p.id === view.filter!.propId);
      const want = view.filter.value;
      if (prop)
        rows = rows.filter((r) => {
          const v = rowValue(r, prop);
          if (prop.type === "checkbox") return String(!!v) === want;
          if (prop.type === "select" || prop.type === "status") return want === "" ? !v : v === want;
          if (prop.type === "multi") return Array.isArray(v) && v.includes(want);
          return String(plainValue(r, prop)).toLowerCase().includes(want.toLowerCase());
        });
    }
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((r) => props.some((p) => String(plainValue(r, p)).toLowerCase().includes(q)));
    return sortRows(rows, props, view.sort);
  }, [pages, db, view, search]);
}

export function Database({ page, inline = false }: { page: Page; inline?: boolean }) {
  const db = page.db!;
  const view = db.views.find((v) => v.id === db.activeView) ?? db.views[0];
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menu, setMenu] = useState<{ kind: "addView" | "viewMenu" | "sort" | "filter"; anchor: Anchor; viewId?: string } | null>(null);
  const store = useStore.getState;
  const rows = useRows(page, view, search);
  const visibleProps = db.props.filter((p) => !view.hidden?.includes(p.id));

  const open = (row: Page) => navigate(page.id, row.id);
  const addRow = (values: Record<string, PropValue> = {}) => {
    const initial = { ...values };
    if (view.filter?.propId && initial[view.filter.propId] === undefined) {
      const fp = db.props.find((p) => p.id === view.filter!.propId);
      if (fp?.type === "select" || fp?.type === "status") initial[fp.id] = view.filter.value || null;
      if (fp?.type === "multi") initial[fp.id] = [view.filter.value];
      if (fp?.type === "checkbox") initial[fp.id] = view.filter.value === "true";
    }
    const id = store().addRow(page.id, initial);
    navigate(page.id, id);
  };

  const setActive = (id: string) => store().updateDb(page.id, (d) => ({ ...d, activeView: id }));
  const addView = (type: ViewType) => {
    const id = uid();
    const firstSelect = db.props.find((p) => p.type === "status" || p.type === "select");
    const firstDate = db.props.find((p) => p.type === "date");
    const label = { table: "Table", board: "Board", gallery: "Gallery", list: "List", calendar: "Calendar" }[type];
    store().updateDb(page.id, (d) => ({
      ...d,
      views: [...d.views, { id, name: label, type, groupBy: firstSelect?.id, dateProp: firstDate?.id }],
      activeView: id,
    }));
    setMenu(null);
  };

  const viewProps: ViewProps = { db: page, view, rows, props: visibleProps, open, addRow };
  const menuView = menu?.viewId ? db.views.find((v) => v.id === menu.viewId) : null;

  return (
    <div className={`database${inline ? " inline" : ""}`}>
      <div className="db-toolbar">
        <div className="db-tabs">
          {db.views.map((v) => {
            const Icon = VIEW_ICONS[v.type];
            return (
              <button
                key={v.id}
                className={`db-tab${v.id === view.id ? " active" : ""}`}
                onClick={(e) => (v.id === view.id ? setMenu({ kind: "viewMenu", anchor: anchorOf(e.currentTarget), viewId: v.id }) : setActive(v.id))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ kind: "viewMenu", anchor: anchorOf(e.currentTarget), viewId: v.id });
                }}
              >
                <Icon size={14} /> {v.name}
                {v.id === view.id && <IconChevronDown size={11} className="db-tab-caret" />}
              </button>
            );
          })}
          <button className="icon-btn" title="Add a view" onClick={(e) => setMenu({ kind: "addView", anchor: anchorOf(e.currentTarget) })}>
            <IconPlus size={14} />
          </button>
        </div>
        <div className="db-actions">
          <button
            className={`icon-btn${view.filter ? " on" : ""}`}
            title="Filter"
            onClick={(e) => setMenu({ kind: "filter", anchor: anchorOf(e.currentTarget, "right") })}
          >
            <IconFilter size={14} />
          </button>
          <button className={`icon-btn${view.sort ? " on" : ""}`} title="Sort" onClick={(e) => setMenu({ kind: "sort", anchor: anchorOf(e.currentTarget, "right") })}>
            <IconSort size={14} />
          </button>
          {searchOpen || search ? (
            <input
              className="db-search"
              autoFocus
              placeholder="Type to search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => !search && setSearchOpen(false)}
              onKeyDown={(e) => e.key === "Escape" && (setSearch(""), setSearchOpen(false))}
            />
          ) : (
            <button className="icon-btn" title="Search" onClick={() => setSearchOpen(true)}>
              <IconSearch size={14} />
            </button>
          )}
          <button
            className="icon-btn"
            title="View settings"
            onClick={(e) => setMenu({ kind: "viewMenu", anchor: anchorOf(e.currentTarget, "right"), viewId: view.id })}
          >
            <IconDots size={14} />
          </button>
          <button className="btn primary small" onClick={() => addRow()}>
            New
          </button>
        </div>
      </div>
      {(view.filter || view.sort) && (
        <div className="db-chips">
          {view.sort && (
            <button className="chip" onClick={(e) => setMenu({ kind: "sort", anchor: anchorOf(e.currentTarget) })}>
              <IconSort size={12} /> {db.props.find((p) => p.id === view.sort!.propId)?.name} {view.sort.dir === "asc" ? "↑" : "↓"}
            </button>
          )}
          {view.filter && (
            <button className="chip" onClick={(e) => setMenu({ kind: "filter", anchor: anchorOf(e.currentTarget) })}>
              <IconFilter size={12} /> {db.props.find((p) => p.id === view.filter!.propId)?.name}: {filterLabel(db.props, view)}
            </button>
          )}
        </div>
      )}

      <div className="db-body">
        {view.type === "table" && <TableView {...viewProps} />}
        {view.type === "board" && <BoardView {...viewProps} />}
        {view.type === "gallery" && <GalleryView {...viewProps} />}
        {view.type === "list" && <ListView {...viewProps} />}
        {view.type === "calendar" && <CalendarView {...viewProps} />}
      </div>

      {menu?.kind === "addView" && (
        <Popover anchor={menu.anchor} onClose={() => setMenu(null)} width={220}>
          <MenuHeading>Add a view</MenuHeading>
          {(Object.keys(VIEW_ICONS) as ViewType[]).map((t) => {
            const Icon = VIEW_ICONS[t];
            return <MenuItem key={t} icon={<Icon />} label={t[0].toUpperCase() + t.slice(1)} onClick={() => addView(t)} />;
          })}
        </Popover>
      )}
      {menu?.kind === "viewMenu" && menuView && <ViewMenu page={page} view={menuView} anchor={menu.anchor} onClose={() => setMenu(null)} />}
      {menu?.kind === "sort" && <SortMenu page={page} view={view} anchor={menu.anchor} onClose={() => setMenu(null)} />}
      {menu?.kind === "filter" && <FilterMenu page={page} view={view} anchor={menu.anchor} onClose={() => setMenu(null)} />}
    </div>
  );
}

function filterLabel(props: DbProp[], view: DbView) {
  const p = props.find((x) => x.id === view.filter?.propId);
  const v = view.filter?.value ?? "";
  if (!p) return v;
  if (p.type === "checkbox") return v === "true" ? "Checked" : "Unchecked";
  if (p.options) return p.options.find((o) => o.id === v)?.name ?? (v ? v : "Empty");
  return `“${v}”`;
}

function ViewMenu({ page, view, anchor, onClose }: { page: Page; view: DbView; anchor: Anchor; onClose(): void }) {
  const db = page.db!;
  const s = useStore.getState();
  const groupable = db.props.filter((p) => p.type === "select" || p.type === "status");
  const dates = db.props.filter((p) => p.type === "date");
  return (
    <Popover anchor={anchor} onClose={onClose} width={260}>
      <div className="menu-search">
        <input value={view.name} onChange={(e) => s.updateView(page.id, view.id, { name: e.target.value })} aria-label="View name" />
      </div>
      <MenuHeading>Layout</MenuHeading>
      <div className="layout-grid">
        {(Object.keys(VIEW_ICONS) as ViewType[]).map((t) => {
          const Icon = VIEW_ICONS[t];
          return (
            <button
              key={t}
              className={`layout-opt${view.type === t ? " active" : ""}`}
              onClick={() =>
                s.updateView(page.id, view.id, {
                  type: t,
                  groupBy: view.groupBy ?? groupable[0]?.id,
                  dateProp: view.dateProp ?? dates[0]?.id,
                })
              }
            >
              <Icon size={18} />
              <span>{t[0].toUpperCase() + t.slice(1)}</span>
            </button>
          );
        })}
      </div>
      {view.type === "board" && (
        <>
          <MenuHeading>Group by</MenuHeading>
          {groupable.length ? (
            groupable.map((p) => <MenuItem key={p.id} icon={<IconSelect />} label={p.name} active={view.groupBy === p.id} onClick={() => s.updateView(page.id, view.id, { groupBy: p.id })} />)
          ) : (
            <div className="muted pad">Add a Select or Status property to group by.</div>
          )}
        </>
      )}
      {view.type === "calendar" && (
        <>
          <MenuHeading>Show calendar by</MenuHeading>
          {dates.length ? (
            dates.map((p) => <MenuItem key={p.id} icon={<IconCalendar />} label={p.name} active={view.dateProp === p.id} onClick={() => s.updateView(page.id, view.id, { dateProp: p.id })} />)
          ) : (
            <div className="muted pad">Add a Date property first.</div>
          )}
        </>
      )}
      <MenuHeading>Properties</MenuHeading>
      {db.props
        .filter((p) => p.type !== "title")
        .map((p) => {
          const hidden = view.hidden?.includes(p.id);
          const Icon = PROP_ICONS[p.type];
          return (
            <MenuItem
              key={p.id}
              icon={<Icon />}
              label={p.name}
              right={hidden ? <IconEyeOff size={14} className="muted" /> : <IconEye size={14} />}
              onClick={() =>
                s.updateView(page.id, view.id, {
                  hidden: hidden ? (view.hidden ?? []).filter((h) => h !== p.id) : [...(view.hidden ?? []), p.id],
                })
              }
            />
          );
        })}
      <MenuSep />
      <MenuItem
        icon="⧉"
        label="Duplicate view"
        onClick={() => {
          const id = uid();
          s.updateDb(page.id, (d) => ({ ...d, views: [...d.views, { ...view, id, name: `${view.name} copy` }], activeView: id }));
          onClose();
        }}
      />
      {db.views.length > 1 && (
        <MenuItem
          icon={<IconTrash />}
          label="Delete view"
          danger
          onClick={() => {
            s.updateDb(page.id, (d) => {
              const views = d.views.filter((v) => v.id !== view.id);
              return { ...d, views, activeView: d.activeView === view.id ? views[0].id : d.activeView };
            });
            onClose();
          }}
        />
      )}
    </Popover>
  );
}

function SortMenu({ page, view, anchor, onClose }: { page: Page; view: DbView; anchor: Anchor; onClose(): void }) {
  const s = useStore.getState();
  return (
    <Popover anchor={anchor} onClose={onClose} width={240}>
      <MenuHeading>Sort by</MenuHeading>
      {page.db!.props.map((p) => {
        const Icon = PROP_ICONS[p.type];
        const on = view.sort?.propId === p.id;
        return (
          <MenuItem
            key={p.id}
            icon={<Icon />}
            label={p.name}
            active={on}
            right={on ? <span className="menu-hint">{view.sort!.dir === "asc" ? "Ascending" : "Descending"}</span> : null}
            onClick={() =>
              s.updateView(page.id, view.id, {
                sort: on ? (view.sort!.dir === "asc" ? { propId: p.id, dir: "desc" } : null) : { propId: p.id, dir: "asc" },
              })
            }
          />
        );
      })}
      {view.sort && (
        <>
          <MenuSep />
          <MenuItem icon={<IconTrash />} label="Remove sort" danger onClick={() => (s.updateView(page.id, view.id, { sort: null }), onClose())} />
        </>
      )}
    </Popover>
  );
}

function FilterMenu({ page, view, anchor, onClose }: { page: Page; view: DbView; anchor: Anchor; onClose(): void }) {
  const s = useStore.getState();
  const props = page.db!.props;
  const [propId, setPropId] = useState(view.filter?.propId ?? props[0].id);
  const prop = props.find((p) => p.id === propId) ?? props[0];
  const value = view.filter?.propId === prop.id ? view.filter.value : "";
  const set = (v: string) => s.updateView(page.id, view.id, { filter: { propId: prop.id, value: v } });
  return (
    <Popover anchor={anchor} onClose={onClose} width={280}>
      <MenuHeading>Filter</MenuHeading>
      <div className="filter-row">
        <select value={prop.id} onChange={(e) => setPropId(e.target.value)} aria-label="Property">
          {props.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {prop.type === "checkbox" ? (
          <select value={value} onChange={(e) => set(e.target.value)} aria-label="Value">
            <option value="">—</option>
            <option value="true">Checked</option>
            <option value="false">Unchecked</option>
          </select>
        ) : prop.options ? (
          <select value={value} onChange={(e) => set(e.target.value)} aria-label="Value">
            <option value="">{prop.type === "multi" ? "—" : "Is empty"}</option>
            {prop.options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        ) : (
          <input autoFocus placeholder="Contains…" value={value} onChange={(e) => set(e.target.value)} />
        )}
      </div>
      {view.filter && (
        <>
          <MenuSep />
          <MenuItem icon={<IconTrash />} label="Remove filter" danger onClick={() => (s.updateView(page.id, view.id, { filter: null }), onClose())} />
        </>
      )}
    </Popover>
  );
}

export function PropHeaderMenu({ page, prop, anchor, onClose, view }: { page: Page; prop: DbProp; anchor: Anchor; onClose(): void; view?: DbView }) {
  const s = useStore.getState();
  const changeType = (type: PropType) => {
    if (type === prop.type) return;
    const pages = s.pages;
    const rows = childrenOf(pages, page.id, { rows: true });
    const wantsOptions = type === "select" || type === "multi" || type === "status";
    const options = wantsOptions ? optionsFromValues(rows, prop) : undefined;
    s.updateProp(page.id, prop.id, { type, options });
    for (const r of rows) {
      const v = r.props?.[prop.id];
      if (v === undefined) continue;
      s.setRowProp(r.id, prop.id, convertValue(v, prop, type, options ?? []));
    }
  };
  return (
    <Popover anchor={anchor} onClose={onClose} width={240}>
      <div className="menu-search">
        <input autoFocus value={prop.name} onChange={(e) => s.updateProp(page.id, prop.id, { name: e.target.value })} aria-label="Property name" />
      </div>
      {prop.type !== "title" && (
        <>
          <MenuHeading>Type</MenuHeading>
          {PROP_TYPES.map((t) => {
            const Icon = PROP_ICONS[t.type];
            return <MenuItem key={t.type} icon={<Icon />} label={t.label} active={prop.type === t.type} onClick={() => changeType(t.type)} />;
          })}
        </>
      )}
      <MenuSep />
      {view && (
        <>
          <MenuItem icon="↑" label="Sort ascending" onClick={() => (s.updateView(page.id, view.id, { sort: { propId: prop.id, dir: "asc" } }), onClose())} />
          <MenuItem icon="↓" label="Sort descending" onClick={() => (s.updateView(page.id, view.id, { sort: { propId: prop.id, dir: "desc" } }), onClose())} />
          {prop.type !== "title" && (
            <MenuItem icon={<IconEyeOff />} label="Hide in view" onClick={() => (s.updateView(page.id, view.id, { hidden: [...(view.hidden ?? []), prop.id] }), onClose())} />
          )}
        </>
      )}
      {prop.type !== "title" && (
        <MenuItem icon={<IconTrash />} label="Delete property" danger onClick={() => (s.deleteProp(page.id, prop.id), onClose())} />
      )}
    </Popover>
  );
}

function TableView({ db, view, rows, props, open, addRow }: ViewProps) {
  const s = useStore.getState();
  const [headerMenu, setHeaderMenu] = useState<{ prop: DbProp; anchor: Anchor } | null>(null);
  const [rowMenu, setRowMenu] = useState<{ row: Page; anchor: Anchor } | null>(null);
  const [addAnchor, setAddAnchor] = useState<Anchor | null>(null);
  const resizing = useRef<{ id: string; x: number; w: number } | null>(null);
  const liveProp = headerMenu ? db.db!.props.find((p) => p.id === headerMenu.prop.id) : null;

  const startResize = (e: React.MouseEvent, prop: DbProp) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = { id: prop.id, x: e.clientX, w: prop.width ?? (prop.type === "title" ? 280 : 180) };
    const move = (ev: MouseEvent) => {
      const r = resizing.current;
      if (!r) return;
      s.updateDb(db.id, (d) => ({ ...d, props: d.props.map((p) => (p.id === r.id ? { ...p, width: Math.max(80, r.w + ev.clientX - r.x) } : p)) }), `resize:${r.id}`);
    };
    const up = () => {
      resizing.current = null;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  const width = (p: DbProp) => p.width ?? (p.type === "title" ? 280 : 180);

  return (
    <div className="table-wrap">
      <table className="db-table">
        <colgroup>
          <col style={{ width: 28 }} />
          {props.map((p) => (
            <col key={p.id} style={{ width: width(p) }} />
          ))}
          <col style={{ width: 48 }} />
        </colgroup>
        <thead>
          <tr>
            <th className="row-gutter" />
            {props.map((p) => {
              const Icon = PROP_ICONS[p.type];
              return (
                <th key={p.id}>
                  <button className="th-btn" onClick={(e) => setHeaderMenu({ prop: p, anchor: anchorOf(e.currentTarget) })}>
                    <Icon size={13} /> <span>{p.name}</span>
                  </button>
                  <span className="col-resize" onMouseDown={(e) => startResize(e, p)} />
                </th>
              );
            })}
            <th>
              <button className="th-btn add" title="Add a property" onClick={(e) => setAddAnchor(anchorOf(e.currentTarget, "right"))}>
                <IconPlus size={14} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="row-gutter">
                <button className="row-menu-btn" onClick={(e) => setRowMenu({ row: r, anchor: anchorOf(e.currentTarget) })} aria-label="Row actions">
                  ⋮⋮
                </button>
              </td>
              {props.map((p) => (
                <td key={p.id} className={`cell cell-${p.type}`}>
                  <PropEditor dbId={db.id} row={r} prop={p} onOpen={p.type === "title" ? () => open(r) : undefined} />
                </td>
              ))}
              <td />
            </tr>
          ))}
        </tbody>
      </table>
      <button className="db-new-row" onClick={() => addRow()}>
        <IconPlus size={14} /> New
      </button>
      <div className="db-count">
        Count <b>{rows.length}</b>
      </div>

      {headerMenu && liveProp && <PropHeaderMenu page={db} prop={liveProp} view={view} anchor={headerMenu.anchor} onClose={() => setHeaderMenu(null)} />}
      {addAnchor && (
        <Popover anchor={addAnchor} onClose={() => setAddAnchor(null)} width={220} align="right">
          <MenuHeading>New property</MenuHeading>
          {PROP_TYPES.map((t) => {
            const Icon = PROP_ICONS[t.type];
            return (
              <MenuItem
                key={t.type}
                icon={<Icon />}
                label={t.label}
                onClick={() => {
                  s.addProp(db.id, { name: t.label, type: t.type, options: ["select", "multi", "status"].includes(t.type) ? [] : undefined });
                  setAddAnchor(null);
                }}
              />
            );
          })}
        </Popover>
      )}
      {rowMenu && (
        <Popover anchor={rowMenu.anchor} onClose={() => setRowMenu(null)} width={200}>
          <MenuItem icon="↗" label="Open" onClick={() => (open(rowMenu.row), setRowMenu(null))} />
          <MenuItem icon="⧉" label="Duplicate" onClick={() => (s.duplicatePage(rowMenu.row.id), setRowMenu(null))} />
          <MenuItem icon={<IconTrash />} label="Delete" danger onClick={() => (s.trashPage(rowMenu.row.id), setRowMenu(null))} />
        </Popover>
      )}
    </div>
  );
}
