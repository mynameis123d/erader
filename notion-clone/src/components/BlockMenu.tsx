import { useState } from "react";
import type { Block, BlockType, Color } from "../types";
import { COLOR_VALUES, TURN_INTO, typeGlyph, typeLabel, isTextual } from "../blockTypes";
import { COLORS, modKey } from "../utils";
import { MenuHeading, MenuItem, MenuSep, Popover, type Anchor } from "./Popover";
import { IconChevronRight, IconCopy, IconTrash } from "./Icons";

interface Props {
  block: Block;
  anchor: Anchor;
  onClose(): void;
  onTurnInto(type: BlockType): void;
  onColor(kind: "text" | "bg", color: Color): void;
  onDuplicate(): void;
  onDelete(): void;
  onCopyText(): void;
  onMove(dir: -1 | 1): void;
}

export function BlockMenu({ block, anchor, onClose, onTurnInto, onColor, onDuplicate, onDelete, onCopyText, onMove }: Props) {
  const [sub, setSub] = useState<"turn" | "color" | null>(null);
  const [q, setQ] = useState("");
  const textual = isTextual(block.type);
  const ql = q.toLowerCase();
  const match = (s: string) => !ql || s.toLowerCase().includes(ql);

  return (
    <Popover anchor={anchor} onClose={onClose} className="block-menu" width={260}>
      <div className="menu-search">
        <input autoFocus placeholder="Search actions…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {sub === null && (
        <>
          {match("delete") && <MenuItem icon={<IconTrash />} label="Delete" hint="Del" onClick={onDelete} />}
          {match("duplicate") && <MenuItem icon={<IconCopy />} label="Duplicate" hint={`${modKey}+D`} onClick={onDuplicate} />}
          {textual && match("turn into") && <MenuItem icon="↻" label="Turn into" right={<IconChevronRight />} onClick={() => setSub("turn")} />}
          {match("color") && <MenuItem icon="🎨" label="Color" right={<IconChevronRight />} onClick={() => setSub("color")} />}
          {match("copy markdown") && <MenuItem icon="⎘" label="Copy as Markdown" onClick={onCopyText} />}
          {match("move up") && <MenuItem icon="↑" label="Move up" hint={`${modKey}+⇧+↑`} onClick={() => onMove(-1)} />}
          {match("move down") && <MenuItem icon="↓" label="Move down" hint={`${modKey}+⇧+↓`} onClick={() => onMove(1)} />}
          {ql &&
            textual &&
            TURN_INTO.filter((t) => match(typeLabel(t))).map((t) => (
              <MenuItem key={t} icon={<span className="glyph-sm">{typeGlyph(t)}</span>} label={`Turn into ${typeLabel(t)}`} onClick={() => onTurnInto(t)} />
            ))}
        </>
      )}
      {sub === "turn" && (
        <>
          <MenuHeading>Turn into</MenuHeading>
          {TURN_INTO.filter((t) => match(typeLabel(t))).map((t) => (
            <MenuItem key={t} icon={<span className="glyph-sm">{typeGlyph(t)}</span>} label={typeLabel(t)} active={block.type === t} onClick={() => onTurnInto(t)} />
          ))}
        </>
      )}
      {sub === "color" && (
        <>
          <MenuHeading>Text color</MenuHeading>
          {COLORS.filter((c) => match(c)).map((c) => (
            <MenuItem
              key={"t" + c}
              icon={<span className="color-swatch" style={{ color: COLOR_VALUES[c].text }}>A</span>}
              label={COLOR_VALUES[c].label}
              active={(block.color || "default") === c}
              onClick={() => onColor("text", c)}
            />
          ))}
          <MenuSep />
          <MenuHeading>Background</MenuHeading>
          {COLORS.filter((c) => match(c)).map((c) => (
            <MenuItem
              key={"b" + c}
              icon={<span className="color-swatch" style={{ background: COLOR_VALUES[c].bg }}>A</span>}
              label={`${COLOR_VALUES[c].label} background`}
              active={(block.bg || "default") === c}
              onClick={() => onColor("bg", c)}
            />
          ))}
        </>
      )}
    </Popover>
  );
}
