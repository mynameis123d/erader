import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface Anchor {
  x: number;
  y: number;
  /** Height of the anchor so the popover can flip above it when there is no room below. */
  h?: number;
}

export const anchorOf = (el: Element | null | undefined, align: "left" | "right" = "left"): Anchor => {
  const r = el?.getBoundingClientRect();
  if (!r) return { x: 100, y: 100 };
  return { x: align === "left" ? r.left : r.right, y: r.bottom + 4, h: r.height + 8 };
};

interface Props {
  anchor: Anchor;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
  width?: number;
}

export function Popover({ anchor, onClose, children, className = "", align = "left", width }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = align === "right" ? anchor.x - r.width : anchor.x;
    let top = anchor.y;
    if (top + r.height > vh - 8) {
      const above = anchor.y - (anchor.h || 0) - r.height;
      top = above > 8 ? above : Math.max(8, vh - r.height - 8);
    }
    left = Math.max(8, Math.min(left, vw - r.width - 8));
    setPos({ left, top });
  }, [anchor.x, anchor.y, anchor.h, align]);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    // Defer so the click that opened the popover doesn't immediately close it.
    const t = setTimeout(() => document.addEventListener("mousedown", down), 0);
    document.addEventListener("keydown", key, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className={`popover ${className}`}
      // Hidden via opacity (not visibility) so autoFocus inputs can take focus on the first frame.
      style={{ left: pos?.left ?? anchor.x, top: pos?.top ?? anchor.y, opacity: pos ? 1 : 0, width }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}

interface ItemProps {
  icon?: ReactNode;
  label: ReactNode;
  hint?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  active?: boolean;
  right?: ReactNode;
}

export function MenuItem({ icon, label, hint, onClick, danger, active, right }: ItemProps) {
  return (
    <button className={`menu-item${danger ? " danger" : ""}${active ? " active" : ""}`} onClick={onClick}>
      {icon !== undefined && <span className="menu-icon">{icon}</span>}
      <span className="menu-label">{label}</span>
      {hint && <span className="menu-hint">{hint}</span>}
      {right}
    </button>
  );
}

export function MenuSep() {
  return <div className="menu-sep" />;
}

export function MenuHeading({ children }: { children: ReactNode }) {
  return <div className="menu-heading">{children}</div>;
}
