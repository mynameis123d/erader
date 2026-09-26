# Notebook: a Notion-style workspace

A local-first clone of Notion built with React, TypeScript and Zustand. It has no backend, needs no account, and saves everything to `localStorage`.

```bash
cd notion-clone
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests (vitest)
npm run build        # typecheck + production build → dist/
npm run build:single # one self-contained index.html → dist-single/
```

## Features

**Block editor**
- Block types: text, headings H1–H3, bulleted, numbered and to-do lists, toggles, quotes, callouts with a custom emoji, dividers, code with syntax highlighting and a language picker, images (link or upload), sub-page links and a live table of contents.
- `/` opens the slash command menu, filtered as you type and navigable with the keyboard. It inserts blocks and applies text or background colors.
- `@` links another page. The mention stays in sync when that page is renamed, and the target page lists its backlinks.
- Markdown shortcuts: `#`, `##`, `###`, `-`, `1.`, `[]`, `>` (toggle), `"` (quote), a code fence of three backticks, `---`, plus inline `**bold**`, `*italic*`, `~~strike~~` and `` `code` ``.
- Selecting text shows a floating toolbar: bold, italic, underline, strike, inline code, link, text and background color, and "turn into".
- Nesting with `Tab`/`Shift+Tab`. `Enter` splits a block and `Backspace` merges it. Arrow keys move between blocks and keep the caret's horizontal position.
- Block handle `⋮⋮`: drag to reorder (drop to the right of a block to nest it), or click for delete, duplicate, turn into, color, move, and copy as Markdown.
- Block selection: press `Esc`, or drag in the page margin to select several. Then `Backspace` deletes, `⌘D` duplicates, `⌘C`/`⌘X` copy or cut as Markdown, and `⌘⇧↑/↓` moves.
- Pasting multi-line Markdown creates real blocks. Pasting a URL over selected text makes a link.
- Undo and redo across the whole workspace (`⌘Z` / `⌘⇧Z`). Typing is grouped into sensible chunks.

**Pages**
- Nested page tree in the sidebar with drag-and-drop reordering and re-parenting, favorites, and a resizable, collapsible sidebar (`⌘\`).
- Emoji icons (searchable picker), gradient or image covers, breadcrumbs, and "Edited 3m ago".
- Per-page options: serif or mono font, small text, full width, lock page, duplicate, move to, export as Markdown, print or save as PDF, and word count.
- Trash with restore, permanent delete and "Undo" toasts.
- `⌘K` search across titles and page content, with highlighted snippets and recent pages.
- Templates: project tracker, reading list, meeting notes, journal and engineering spec.

**Databases**
- Five views: **Table**, **Board** (kanban), **Gallery**, **List** and **Calendar**, with any number of saved views per database.
- Property types: title, text, number, select, multi-select, status, date, checkbox and URL. Values are converted when a property changes type.
- Inline cell editing, select options you can create, rename and recolor, resizable columns, per-view hidden properties, sort, filter and search.
- Drag cards between board columns or calendar days to update them.
- Rows are full pages: they open in a side peek with editable properties and their own block content.

**Everything else**
- Light, dark and system themes. Responsive down to phone width.
- Export or import the whole workspace as JSON, or reset it to the demo content.

## Structure

```
src/
  store.ts              Zustand store: pages, undo/redo history, persistence
  types.ts              Page / Block / Database model
  utils.ts, caret.ts    tree helpers, markdown import/export, caret maths
  format.ts             inline formatting commands and inline markdown
  components/Editor.tsx block editor: keyboard, slash/mention menus, DnD, selection
  components/Block.tsx  rendering for each block type
  components/database/  table, board, gallery, list and calendar views
```

Blocks are stored as a flat list with an `indent` level, so moving, nesting, collapsing and numbering are simple list operations. Rich text is kept as sanitized inline HTML.
