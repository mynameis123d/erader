import type { Block, BlockType, Database, DbProp, Page, Pages, PropValue, SelectOption } from "./types";
import { newBlock, uid } from "./utils";

const b = (type: BlockType, html = "", extra: Partial<Block> = {}) => newBlock(type, html, extra);

function page(init: Partial<Page> & { title: string }): Page {
  const now = Date.now();
  return {
    id: uid(),
    parentId: null,
    icon: "",
    cover: null,
    blocks: [b("text")],
    createdAt: now,
    updatedAt: now,
    order: 0,
    favorite: false,
    trashed: false,
    kind: "doc",
    ...init,
  };
}

const opt = (name: string, color: SelectOption["color"]): SelectOption => ({ id: uid(), name, color });

interface DbSpec {
  title: string;
  icon: string;
  cover?: string | null;
  parentId?: string | null;
  order?: number;
  props: DbProp[];
  views: Database["views"];
  rows: { title: string; icon?: string; props: Record<string, PropValue>; blocks?: Block[] }[];
}

function database(spec: DbSpec): Page[] {
  const db = page({
    title: spec.title,
    icon: spec.icon,
    cover: spec.cover ?? null,
    parentId: spec.parentId ?? null,
    order: spec.order ?? 0,
    kind: "database",
    blocks: [],
    db: { props: spec.props, views: spec.views, activeView: spec.views[0].id },
  });
  const rows = spec.rows.map((r, i) =>
    page({
      title: r.title,
      icon: r.icon || "",
      parentId: db.id,
      isRow: true,
      order: i,
      props: r.props,
      blocks: r.blocks || [b("text")],
    }),
  );
  return [db, ...rows];
}

const dayOffset = (d: number) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toISOString().slice(0, 10);
};

export function projectTrackerPages(parentId: string | null = null, order = 0): Page[] {
  const status = [opt("Not started", "gray"), opt("In progress", "blue"), opt("Done", "green")];
  const prio = [opt("High", "red"), opt("Medium", "yellow"), opt("Low", "gray")];
  const tags = [opt("Design", "purple"), opt("Engineering", "blue"), opt("Marketing", "orange"), opt("Research", "green")];
  const P = {
    title: { id: "title", name: "Name", type: "title" } as DbProp,
    status: { id: uid(), name: "Status", type: "status", options: status } as DbProp,
    prio: { id: uid(), name: "Priority", type: "select", options: prio } as DbProp,
    owner: { id: uid(), name: "Owner", type: "text" } as DbProp,
    due: { id: uid(), name: "Due", type: "date" } as DbProp,
    tags: { id: uid(), name: "Tags", type: "multi", options: tags } as DbProp,
    est: { id: uid(), name: "Estimate", type: "number" } as DbProp,
  };
  const row = (title: string, icon: string, s: number, p: number, owner: string, due: number, t: number[], est: number) => ({
    title,
    icon,
    props: {
      [P.status.id]: status[s].id,
      [P.prio.id]: prio[p].id,
      [P.owner.id]: owner,
      [P.due.id]: dayOffset(due),
      [P.tags.id]: t.map((i) => tags[i].id),
      [P.est.id]: est,
    },
  });
  return database({
    title: "Project Tracker",
    icon: "🚀",
    cover: "aurora",
    parentId,
    order,
    props: Object.values(P),
    views: [
      { id: uid(), name: "Board", type: "board", groupBy: P.status.id },
      { id: uid(), name: "All tasks", type: "table" },
      { id: uid(), name: "Calendar", type: "calendar", dateProp: P.due.id },
      { id: uid(), name: "Gallery", type: "gallery" },
    ],
    rows: [
      {
        ...row("Design the new landing page", "🎨", 1, 0, "Maya", 2, [0, 2], 5),
        blocks: [
          b("h2", "Goals"),
          b("bullet", "Make the value prop obvious in <b>5 seconds</b>"),
          b("bullet", "Show real product screenshots"),
          b("h2", "Checklist"),
          b("todo", "Wireframes", { checked: true }),
          b("todo", "High-fidelity mockups"),
          b("todo", "Review with marketing"),
        ],
      },
      row("Ship dark mode", "🌙", 2, 1, "Alex", -3, [1], 3),
      row("User interviews round 2", "🎙️", 0, 1, "Sam", 6, [3], 8),
      row("Migrate to new build pipeline", "⚙️", 1, 2, "Alex", 9, [1], 5),
      row("Write launch blog post", "✍️", 0, 0, "Jordan", 12, [2], 2),
      row("Fix onboarding drop-off", "🧭", 1, 0, "Maya", 4, [0, 3], 3),
      row("Accessibility audit", "♿", 2, 1, "Sam", -6, [0, 1], 2),
    ],
  });
}

export function readingListPages(parentId: string | null = null, order = 0): Page[] {
  const type = [opt("Book", "brown"), opt("Article", "blue"), opt("Podcast", "purple")];
  const P = {
    title: { id: "title", name: "Title", type: "title" } as DbProp,
    type: { id: uid(), name: "Type", type: "select", options: type } as DbProp,
    author: { id: uid(), name: "Author", type: "text" } as DbProp,
    rating: { id: uid(), name: "Rating", type: "number" } as DbProp,
    done: { id: uid(), name: "Finished", type: "checkbox" } as DbProp,
    link: { id: uid(), name: "Link", type: "url" } as DbProp,
  };
  const r = (title: string, icon: string, t: number, author: string, rating: number | null, done: boolean, link = "") => ({
    title,
    icon,
    props: { [P.type.id]: type[t].id, [P.author.id]: author, [P.rating.id]: rating, [P.done.id]: done, [P.link.id]: link },
  });
  return database({
    title: "Reading List",
    icon: "📚",
    cover: "peach",
    parentId,
    order,
    props: Object.values(P),
    views: [
      { id: uid(), name: "Library", type: "gallery" },
      { id: uid(), name: "Table", type: "table", sort: { propId: P.rating.id, dir: "desc" } },
      { id: uid(), name: "By type", type: "board", groupBy: P.type.id },
    ],
    rows: [
      r("The Design of Everyday Things", "🚪", 0, "Don Norman", 5, true),
      r("Thinking, Fast and Slow", "🧠", 0, "Daniel Kahneman", 4, true),
      r("How to Do Great Work", "💡", 1, "Paul Graham", 5, false, "https://paulgraham.com/greatwork.html"),
      r("Shape Up", "🏔️", 0, "Ryan Singer", null, false, "https://basecamp.com/shapeup"),
      r("Acquired: Nintendo", "🎮", 2, "Ben & David", 4, true),
    ],
  });
}

export function meetingNotesPage(parentId: string | null = null, order = 0): Page {
  return page({
    title: "Weekly Sync",
    icon: "🗓️",
    parentId,
    order,
    blocks: [
      b("callout", "Date: <b>" + new Date().toLocaleDateString() + "</b> · Attendees: @you, @team", { icon: "📅", bg: "gray" }),
      b("h2", "Agenda"),
      b("number", "Wins from last week"),
      b("number", "Blockers"),
      b("number", "Priorities for this week"),
      b("h2", "Notes"),
      b("text"),
      b("h2", "Action items"),
      b("todo", "Share notes with the team"),
      b("todo"),
    ],
  });
}

export function journalPage(parentId: string | null = null, order = 0): Page {
  return page({
    title: new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
    icon: "📓",
    cover: "dusk",
    parentId,
    order,
    font: "serif",
    blocks: [
      b("quote", "What would make today great?"),
      b("bullet"),
      b("h3", "Grateful for"),
      b("number"),
      b("number"),
      b("number"),
      b("h3", "Reflection"),
      b("text"),
    ],
  });
}

export function docsPage(parentId: string | null = null, order = 0): Page {
  return page({
    title: "Engineering Spec",
    icon: "📐",
    parentId,
    order,
    blocks: [
      b("toc"),
      b("h1", "Context"),
      b("text", "What problem are we solving and why now?"),
      b("h1", "Proposal"),
      b("text", "Describe the approach."),
      b("code", "function hello(name) {\n  return `Hello, ${name}!`;\n}", { lang: "javascript" }),
      b("h1", "Alternatives considered"),
      b("toggle", "Option A — do nothing"),
      b("text", "Cheap, but the problem keeps growing.", { indent: 1 }),
      b("toggle", "Option B — buy a vendor solution"),
      b("text", "Fast, but expensive and inflexible.", { indent: 1 }),
      b("h1", "Open questions"),
      b("todo", "Who owns the migration?"),
    ],
  });
}

export interface Template {
  id: string;
  name: string;
  icon: string;
  description: string;
  build: (parentId: string | null, order: number) => Page[];
}

export const TEMPLATES: Template[] = [
  { id: "tracker", name: "Project tracker", icon: "🚀", description: "Board, table, calendar & gallery views", build: projectTrackerPages },
  { id: "reading", name: "Reading list", icon: "📚", description: "Track books, articles and podcasts", build: readingListPages },
  { id: "meeting", name: "Meeting notes", icon: "🗓️", description: "Agenda, notes and action items", build: (p, o) => [meetingNotesPage(p, o)] },
  { id: "journal", name: "Daily journal", icon: "📓", description: "A calm serif page for reflection", build: (p, o) => [journalPage(p, o)] },
  { id: "spec", name: "Engineering spec", icon: "📐", description: "Table of contents, toggles & code", build: (p, o) => [docsPage(p, o)] },
];

export function seedWorkspace(): Pages {
  const welcome = page({ title: "Getting Started", icon: "👋", cover: "sunrise", order: 0, favorite: true });
  const tracker = projectTrackerPages(null, 1);
  const reading = readingListPages(null, 2);
  const notes = page({ title: "Quick Notes", icon: "🗒️", order: 3 });
  const meeting = meetingNotesPage(notes.id, 0);
  const spec = docsPage(notes.id, 1);
  const journal = journalPage(null, 4);

  welcome.blocks = [
    b("text", "Welcome to <b>Notebook</b> — a fast, local-first workspace for notes, docs and databases. Everything saves automatically in your browser."),
    b("callout", "Type <code>/</code> anywhere to insert a block, or select text to format it. Press <code>" + (/Mac/.test(navigator.platform) ? "⌘" : "Ctrl") + "+K</code> to search.", { icon: "💡", bg: "yellow" }),
    b("toc"),
    b("h1", "The basics"),
    b("todo", "Click a checkbox to complete a to-do", { checked: true }),
    b("todo", "Hover a block and drag <b>⋮⋮</b> to reorder it"),
    b("todo", "Press <code>Tab</code> to indent, <code>Shift+Tab</code> to outdent"),
    b("todo", "Type <code>@</code> to link to another page"),
    b("todo", "Use Markdown: <code>#</code>, <code>-</code>, <code>1.</code>, <code>[]</code>, <code>&gt;</code>, <code>```</code>, <code>**bold**</code>"),
    b("h1", "Blocks you can use"),
    b("toggle", "Toggles hide nested content — click the arrow"),
    b("text", "Surprise! 🎉 Anything indented under a toggle collapses with it.", { indent: 1 }),
    b("bullet", "Bulleted lists"),
    b("bullet", "can be nested", { indent: 1 }),
    b("number", "Numbered lists"),
    b("number", "count automatically"),
    b("quote", "“The details are not the details. They make the design.” — Charles Eames"),
    b("code", "const workspace = useStore((s) => s.pages);\nconsole.log(Object.keys(workspace).length, 'pages');", { lang: "typescript" }),
    b("divider"),
    b("h1", "Explore"),
    b("page", "", { pageId: tracker[0].id }),
    b("page", "", { pageId: reading[0].id }),
    b("text", "Try the <b>Board</b>, <b>Calendar</b> and <b>Gallery</b> views in the <span style=\"color: rgb(51, 126, 169);\">Project Tracker</span>."),
    b("h1", "Keyboard shortcuts"),
    b("bullet", "<code>⌘/Ctrl + K</code> — search & jump"),
    b("bullet", "<code>⌘/Ctrl + Z</code> / <code>⌘/Ctrl + Shift + Z</code> — undo / redo"),
    b("bullet", "<code>⌘/Ctrl + \\</code> — toggle the sidebar"),
    b("bullet", "<code>⌘/Ctrl + D</code> — duplicate block · <code>⌘/Ctrl + Shift + ↑/↓</code> — move block"),
    b("bullet", "<code>Esc</code> — select the block, then <code>Backspace</code> to delete"),
    b("text"),
  ];

  const all = [welcome, ...tracker, ...reading, notes, meeting, spec, journal];
  return Object.fromEntries(all.map((p) => [p.id, p]));
}
