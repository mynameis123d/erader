import { useMemo, useState } from "react";
import { ALL_EMOJIS, EMOJI_CATEGORIES, randomEmoji } from "../emojis";
import { Popover, type Anchor } from "./Popover";

interface Props {
  anchor: Anchor;
  onPick: (emoji: string) => void;
  onClose: () => void;
  allowRemove?: boolean;
}

export function EmojiPicker({ anchor, onPick, onClose, allowRemove }: Props) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return null;
    return ALL_EMOJIS.filter((e) => e.keywords.includes(s) || e.char === s);
  }, [q]);

  return (
    <Popover anchor={anchor} onClose={onClose} className="emoji-picker" width={380}>
      <div className="emoji-top">
        <input autoFocus placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn" onClick={() => onPick(randomEmoji())} title="Random">
          🎲
        </button>
        {allowRemove && (
          <button className="btn" onClick={() => onPick("")}>
            Remove
          </button>
        )}
      </div>
      <div className="emoji-scroll">
        {results ? (
          results.length ? (
            <div className="emoji-grid">
              {results.map((e) => (
                <button key={e.char} title={e.keywords} onClick={() => onPick(e.char)}>
                  {e.char}
                </button>
              ))}
            </div>
          ) : (
            <div className="muted pad">No emoji found</div>
          )
        ) : (
          EMOJI_CATEGORIES.map((c) => (
            <div key={c.name}>
              <div className="menu-heading">{c.name}</div>
              <div className="emoji-grid">
                {c.emojis.map((e) => (
                  <button key={e.char + c.name} title={e.keywords} onClick={() => onPick(e.char)}>
                    {e.char}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Popover>
  );
}
