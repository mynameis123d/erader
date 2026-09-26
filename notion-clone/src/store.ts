import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Block, Database, DbProp, DbView, Page, Pages, PropValue, Theme } from "./types";
import { childrenOf, descendants, escapeHtml, newBlock, uid } from "./utils";
import { seedWorkspace } from "./seed";

interface HistoryState {
  past: Pages[];
  future: Pages[];
  lastKey: string | null;
  lastTime: number;
}

export interface Toast {
  id: string;
  text: string;
  action?: { label: string; run: () => void };
}

interface State {
  pages: Pages;
  theme: Theme;
  sidebarWidth: number;
  sidebarOpen: boolean;
  recent: string[];
  history: HistoryState;
  toasts: Toast[];

  createPage(parentId: string | null, init?: Partial<Page>): string;
  updatePage(id: string, patch: Partial<Page>, key?: string): void;
  setBlocks(pageId: string, blocks: Block[], key?: string): void;
  updateBlock(pageId: string, blockId: string, patch: Partial<Block>, key?: string): void;
  trashPage(id: string): void;
  restorePage(id: string): void;
  deletePage(id: string): void;
  emptyTrash(): void;
  duplicatePage(id: string): string | null;
  movePage(id: string, parentId: string | null, order: number): void;

  addRow(dbId: string, props?: Record<string, PropValue>, title?: string): string;
  setRowProp(rowId: string, propId: string, value: PropValue): void;
  updateDb(dbId: string, fn: (db: Database) => Database, key?: string): void;
  addProp(dbId: string, prop: Partial<DbProp>): string;
  updateProp(dbId: string, propId: string, patch: Partial<DbProp>): void;
  deleteProp(dbId: string, propId: string): void;
  updateView(dbId: string, viewId: string, patch: Partial<DbView>): void;

  undo(): void;
  redo(): void;
  visit(id: string): void;
  setTheme(t: Theme): void;
  setSidebar(patch: { width?: number; open?: boolean }): void;
  replaceWorkspace(pages: Pages): void;
  toast(text: string, action?: Toast["action"]): void;
  dismissToast(id: string): void;
}

const HISTORY_LIMIT = 150;

/** Keep inline @-mentions of a page in sync with its current icon and title. */
function refreshMentions(pages: Pages, id: string): Pages {
  const target = pages[id];
  const marker = `data-page="${id}"`;
  const label = `${target.icon || "📄"} ${escapeHtml(target.title.trim() || "Untitled")}`;
  const re = new RegExp(`(<a[^>]*${marker}[^>]*>)[\\s\\S]*?(</a>)`, "g");
  let next = pages;
  for (const p of Object.values(pages)) {
    if (!p.blocks.some((b) => b.html.includes(marker))) continue;
    const blocks = p.blocks.map((b) => (b.html.includes(marker) ? { ...b, html: b.html.replace(re, `$1${label}$2`) } : b));
    if (next === pages) next = { ...pages };
    next[p.id] = { ...p, blocks };
  }
  return next;
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /** Apply a change to `pages`, recording undo history. Same `key` within 1.2s coalesces (typing). */
      const change = (fn: (pages: Pages) => Pages, key?: string) => {
        const { pages, history } = get();
        const next = fn(pages);
        if (next === pages) return;
        const now = Date.now();
        const coalesce = key && history.lastKey === key && now - history.lastTime < 1200;
        set({
          pages: next,
          history: {
            past: coalesce ? history.past : [...history.past.slice(-HISTORY_LIMIT), pages],
            future: [],
            lastKey: key || null,
            lastTime: now,
          },
        });
      };

      const patchPage = (pages: Pages, id: string, patch: Partial<Page>): Pages => {
        const p = pages[id];
        if (!p) return pages;
        return { ...pages, [id]: { ...p, ...patch, updatedAt: Date.now() } };
      };

      const nextOrder = (pages: Pages, parentId: string | null, rows = false) => {
        const kids = childrenOf(pages, parentId, { rows, trashed: true });
        return kids.length ? kids[kids.length - 1].order + 1 : 0;
      };

      return {
        pages: seedWorkspace(),
        theme: "system",
        sidebarWidth: 248,
        sidebarOpen: true,
        recent: [],
        history: { past: [], future: [], lastKey: null, lastTime: 0 },
        toasts: [],

        createPage(parentId, init = {}) {
          const id = uid();
          const now = Date.now();
          change((pages) => {
            const page: Page = {
              id,
              parentId,
              title: "",
              icon: "",
              cover: null,
              blocks: [newBlock()],
              createdAt: now,
              updatedAt: now,
              order: nextOrder(pages, parentId, !!init.isRow),
              favorite: false,
              trashed: false,
              kind: "doc",
              ...init,
            };
            let next = { ...pages, [id]: page };
            if (parentId && next[parentId] && !next[parentId].expanded && !init.isRow)
              next = { ...next, [parentId]: { ...next[parentId], expanded: true } };
            return next;
          });
          return id;
        },

        updatePage(id, patch, key) {
          change((pages) => {
            const next = patchPage(pages, id, patch);
            return patch.title !== undefined || patch.icon !== undefined ? refreshMentions(next, id) : next;
          }, key);
        },

        setBlocks(pageId, blocks, key) {
          change((pages) => patchPage(pages, pageId, { blocks }), key);
        },

        updateBlock(pageId, blockId, patch, key) {
          change((pages) => {
            const p = pages[pageId];
            if (!p) return pages;
            return patchPage(pages, pageId, {
              blocks: p.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
            });
          }, key);
        },

        trashPage(id) {
          const title = get().pages[id]?.title || "Untitled";
          change((pages) => {
            const next = { ...pages };
            for (const pid of [id, ...descendants(pages, id)])
              next[pid] = { ...next[pid], trashed: true, favorite: false };
            next[id] = { ...next[id], trashedAt: Date.now() };
            return next;
          });
          get().toast(`Moved “${title}” to trash`, { label: "Undo", run: () => get().restorePage(id) });
        },

        restorePage(id) {
          change((pages) => {
            const next = { ...pages };
            const p = next[id];
            if (!p) return pages;
            // Restoring into a trashed or missing parent would orphan the page, so lift it to the top.
            const parent = p.parentId ? next[p.parentId] : null;
            const parentId = parent && !parent.trashed ? p.parentId : null;
            for (const pid of [id, ...descendants(pages, id)]) next[pid] = { ...next[pid], trashed: false };
            next[id] = { ...next[id], parentId };
            return next;
          });
        },

        deletePage(id) {
          change((pages) => {
            const next = { ...pages };
            for (const pid of [id, ...descendants(pages, id)]) delete next[pid];
            return next;
          });
        },

        emptyTrash() {
          change((pages) => {
            const next = { ...pages };
            for (const p of Object.values(pages)) if (p.trashed) delete next[p.id];
            return next;
          });
        },

        duplicatePage(id) {
          const src = get().pages[id];
          if (!src) return null;
          const map: Record<string, string> = {};
          const ids = [id, ...descendants(get().pages, id)];
          ids.forEach((pid) => (map[pid] = uid()));
          change((pages) => {
            const next = { ...pages };
            for (const pid of ids) {
              const p = pages[pid];
              next[map[pid]] = {
                ...p,
                id: map[pid],
                parentId: p.parentId && map[p.parentId] ? map[p.parentId] : p.parentId,
                title: pid === id ? `${p.title || "Untitled"} (copy)` : p.title,
                order: pid === id ? p.order + 0.5 : p.order,
                favorite: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                blocks: p.blocks.map((b) => ({
                  ...b,
                  id: uid(),
                  pageId: b.pageId && map[b.pageId] ? map[b.pageId] : b.pageId,
                })),
              };
            }
            return next;
          });
          return map[id];
        },

        movePage(id, parentId, order) {
          const pages = get().pages;
          if (parentId && (parentId === id || descendants(pages, id).includes(parentId))) return;
          change((ps) => {
            let next = patchPage(ps, id, { parentId, order });
            if (parentId && next[parentId] && !next[parentId].expanded)
              next = { ...next, [parentId]: { ...next[parentId], expanded: true } };
            return next;
          });
        },

        addRow(dbId, props = {}, title = "") {
          return get().createPage(dbId, { isRow: true, props, title, blocks: [newBlock()] });
        },

        setRowProp(rowId, propId, value) {
          change((pages) => {
            const r = pages[rowId];
            if (!r) return pages;
            return patchPage(pages, rowId, { props: { ...(r.props || {}), [propId]: value } });
          }, `prop:${rowId}:${propId}`);
        },

        updateDb(dbId, fn, key) {
          change((pages) => {
            const p = pages[dbId];
            if (!p?.db) return pages;
            return patchPage(pages, dbId, { db: fn(p.db) });
          }, key);
        },

        addProp(dbId, prop) {
          const id = uid();
          get().updateDb(dbId, (db) => ({
            ...db,
            props: [...db.props, { id, name: "Property", type: "text", ...prop } as DbProp],
          }));
          return id;
        },

        updateProp(dbId, propId, patch) {
          get().updateDb(
            dbId,
            (db) => ({ ...db, props: db.props.map((p) => (p.id === propId ? { ...p, ...patch } : p)) }),
            patch.name !== undefined ? `propname:${propId}` : undefined,
          );
        },

        deleteProp(dbId, propId) {
          get().updateDb(dbId, (db) => ({
            ...db,
            props: db.props.filter((p) => p.id !== propId),
            views: db.views.map((v) => ({
              ...v,
              groupBy: v.groupBy === propId ? undefined : v.groupBy,
              dateProp: v.dateProp === propId ? undefined : v.dateProp,
              sort: v.sort?.propId === propId ? null : v.sort,
              filter: v.filter?.propId === propId ? null : v.filter,
            })),
          }));
        },

        updateView(dbId, viewId, patch) {
          get().updateDb(dbId, (db) => ({
            ...db,
            views: db.views.map((v) => (v.id === viewId ? { ...v, ...patch } : v)),
          }));
        },

        undo() {
          const { history, pages } = get();
          const prev = history.past[history.past.length - 1];
          if (!prev) return;
          set({
            pages: prev,
            history: { past: history.past.slice(0, -1), future: [pages, ...history.future], lastKey: null, lastTime: 0 },
          });
        },

        redo() {
          const { history, pages } = get();
          const nxt = history.future[0];
          if (!nxt) return;
          set({
            pages: nxt,
            history: { past: [...history.past, pages], future: history.future.slice(1), lastKey: null, lastTime: 0 },
          });
        },

        visit(id) {
          set((s) => ({ recent: [id, ...s.recent.filter((r) => r !== id)].slice(0, 12) }));
        },

        setTheme(theme) {
          set({ theme });
        },

        setSidebar({ width, open }) {
          set((s) => ({
            sidebarWidth: width !== undefined ? Math.min(480, Math.max(200, width)) : s.sidebarWidth,
            sidebarOpen: open !== undefined ? open : s.sidebarOpen,
          }));
        },

        replaceWorkspace(pages) {
          change(() => pages);
        },

        toast(text, action) {
          const id = uid();
          set((s) => ({ toasts: [...s.toasts, { id, text, action }] }));
          setTimeout(() => get().dismissToast(id), 5000);
        },

        dismissToast(id) {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        },
      };
    },
    {
      name: "notebook-workspace-v1",
      partialize: (s) => ({
        pages: s.pages,
        theme: s.theme,
        sidebarWidth: s.sidebarWidth,
        sidebarOpen: s.sidebarOpen,
        recent: s.recent,
      }),
    },
  ),
);

export const canUndo = () => useStore.getState().history.past.length > 0;
