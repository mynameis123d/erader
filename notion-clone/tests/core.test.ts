import { beforeEach, describe, expect, it } from "vitest";
import { hiddenBlocks, listNumbers, markdownToBlocks, newBlock, pageToMarkdown, sanitizeHtml, subtreeRange } from "../src/utils";
import { convertValue, sortRows } from "../src/db";
import { highlight } from "../src/highlight";
import { filterSlash } from "../src/blockTypes";
import { useStore } from "../src/store";
import type { DbProp, Page } from "../src/types";

describe("block structure helpers", () => {
  it("numbers lists per depth and restarts after a break", () => {
    const blocks = [
      newBlock("number", "a"),
      newBlock("number", "b"),
      newBlock("number", "b1", { indent: 1 }),
      newBlock("number", "c"),
      newBlock("text", "break"),
      newBlock("number", "d"),
    ];
    const n = listNumbers(blocks);
    expect(blocks.map((b) => n[b.id])).toEqual([1, 2, 1, 3, undefined, 1]);
  });

  it("hides children of collapsed toggles and finds subtrees", () => {
    const blocks = [
      newBlock("toggle", "t", { collapsed: true }),
      newBlock("text", "child", { indent: 1 }),
      newBlock("text", "grandchild", { indent: 2 }),
      newBlock("text", "sibling"),
    ];
    expect([...hiddenBlocks(blocks)]).toEqual([blocks[1].id, blocks[2].id]);
    expect(subtreeRange(blocks, 0)).toEqual([0, 3]);
    expect(subtreeRange(blocks, 3)).toEqual([3, 4]);
  });
});

describe("markdown", () => {
  it("parses pasted markdown into typed blocks", () => {
    const blocks = markdownToBlocks("# Title\n- item **bold**\n  - nested\n1. first\n- [x] done\n> quote\n---\n```js\nlet a = 1;\n```");
    expect(blocks.map((b) => [b.type, b.indent])).toEqual([
      ["h1", 0],
      ["bullet", 0],
      ["bullet", 1],
      ["number", 0],
      ["todo", 0],
      ["quote", 0],
      ["divider", 0],
      ["code", 0],
    ]);
    expect(blocks[1].html).toBe("item <b>bold</b>");
    expect(blocks[4].checked).toBe(true);
    expect(blocks[7].lang).toBe("js");
  });

  it("exports a page back to markdown", () => {
    const page = {
      id: "p",
      title: "Doc",
      icon: "",
      blocks: [newBlock("h1", "Hi"), newBlock("todo", "<b>x</b>", { checked: true }), newBlock("number", "one"), newBlock("number", "two")],
    } as Page;
    expect(pageToMarkdown(page, {})).toBe("# Doc\n\n## Hi\n- [x] **x**\n1. one\n2. two");
  });

  it("sanitizes pasted html", () => {
    expect(sanitizeHtml('<p onclick="x()">hi <script>bad()</script><b>there</b> <a href="javascript:alert(1)">l</a></p>')).toBe("hi <b>there</b> <a>l</a>");
  });
});

describe("database helpers", () => {
  const status: DbProp = { id: "s", name: "Status", type: "select", options: [{ id: "o1", name: "Done", color: "green" }] };
  const num: DbProp = { id: "n", name: "N", type: "number" };
  const row = (id: string, props: Page["props"]) => ({ id, title: id, props }) as Page;

  it("sorts rows with empty values last", () => {
    const rows = [row("a", { n: 3 }), row("b", {}), row("c", { n: 1 })];
    expect(sortRows(rows, [num], { propId: "n", dir: "asc" }).map((r) => r.id)).toEqual(["c", "a", "b"]);
    expect(sortRows(rows, [num], { propId: "n", dir: "desc" }).map((r) => r.id)).toEqual(["a", "c", "b"]);
  });

  it("converts values between property types", () => {
    expect(convertValue("o1", status, "text", [])).toBe("Done");
    expect(convertValue("Done, Later", { id: "t", name: "T", type: "text" }, "multi", [
      { id: "x", name: "Done", color: "gray" },
      { id: "y", name: "Later", color: "gray" },
    ])).toEqual(["x", "y"]);
    expect(convertValue("42", { id: "t", name: "T", type: "text" }, "number", [])).toBe(42);
  });
});

describe("misc", () => {
  it("highlights code tokens", () => {
    const html = highlight('const s = "hi"; // note', "javascript");
    expect(html).toContain('<span class="tk-k">const</span>');
    expect(html).toContain('<span class="tk-s">&quot;hi&quot;</span>');
    expect(html).toContain('<span class="tk-c">// note</span>');
  });

  it("filters slash commands by word start", () => {
    expect(filterSlash("red").map((i) => i.id)).toEqual(["color-red", "bg-red"]);
    expect(filterSlash("h2")[0].id).toBe("h2");
  });
});

describe("store", () => {
  beforeEach(() => {
    useStore.setState({ pages: {}, history: { past: [], future: [], lastKey: null, lastTime: 0 } });
  });

  it("creates, trashes, restores and deletes page trees", () => {
    const s = useStore.getState();
    const parent = s.createPage(null, { title: "Parent" });
    const child = s.createPage(parent, { title: "Child" });
    s.trashPage(parent);
    expect(useStore.getState().pages[child].trashed).toBe(true);
    s.restorePage(parent);
    expect(useStore.getState().pages[child].trashed).toBe(false);
    s.deletePage(parent);
    expect(useStore.getState().pages[child]).toBeUndefined();
  });

  it("undoes and redoes, coalescing rapid edits with the same key", () => {
    const s = useStore.getState();
    const id = s.createPage(null);
    s.updatePage(id, { title: "H" }, "title");
    s.updatePage(id, { title: "He" }, "title");
    s.updatePage(id, { title: "Hey" }, "title");
    s.undo();
    expect(useStore.getState().pages[id].title).toBe("");
    s.redo();
    expect(useStore.getState().pages[id].title).toBe("Hey");
    s.undo();
    s.undo();
    expect(useStore.getState().pages[id]).toBeUndefined();
  });

  it("keeps @-mentions in sync with renamed pages", () => {
    const s = useStore.getState();
    const target = s.createPage(null, { title: "Old", icon: "📘" });
    const host = s.createPage(null, {
      blocks: [newBlock("text", `see <a data-page="${target}" contenteditable="false" class="mention">📘 Old</a> ok`)],
    });
    s.updatePage(target, { title: "New <name>" });
    expect(useStore.getState().pages[host].blocks[0].html).toContain(">📘 New &lt;name&gt;</a> ok");
  });

  it("refuses to move a page inside its own descendant", () => {
    const s = useStore.getState();
    const a = s.createPage(null);
    const b = s.createPage(a);
    s.movePage(a, b, 0);
    expect(useStore.getState().pages[a].parentId).toBeNull();
  });
});
