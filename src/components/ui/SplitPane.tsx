import { useState, useRef, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  className?: string;
  leftClassName?: string;
  rightClassName?: string;
}

export function SplitPane({
  left,
  right,
  defaultLeftWidth = 320,
  minLeftWidth = 240,
  maxLeftWidth = 600,
  className,
  leftClassName,
  rightClassName,
}: SplitPaneProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;

      if (newWidth >= minLeftWidth && newWidth <= maxLeftWidth) {
        setLeftWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minLeftWidth, maxLeftWidth]);

  return (
    <div
      ref={containerRef}
      className={cn('flex h-full overflow-hidden', className)}
      style={{ userSelect: isDragging ? 'none' : 'auto' }}
    >
      <div
        className={cn('overflow-auto scrollbar-thin', leftClassName)}
        style={{ width: leftWidth }}
      >
        {left}
      </div>

      <div
        className={cn(
          'w-1 cursor-col-resize hover:bg-[var(--color-accent)] transition-colors',
          isDragging && 'bg-[var(--color-accent)]'
        )}
        style={{ backgroundColor: isDragging ? undefined : 'var(--color-border)' }}
        onMouseDown={() => setIsDragging(true)}
      />

      <div className={cn('flex-1 overflow-auto scrollbar-thin', rightClassName)}>{right}</div>
    </div>
  );
}
