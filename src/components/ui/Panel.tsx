import type { PropsWithChildren, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: 'none' | 'soft' | 'medium';
  padded?: boolean;
}

const elevationClasses: Record<NonNullable<PanelProps['elevation']>, string> = {
  none: 'border border-[var(--color-border)] bg-[var(--color-surface)]',
  soft: 'surface-elevated shadow-soft',
  medium: 'surface-elevated shadow-medium',
};

export function Panel({
  children,
  className,
  elevation = 'none',
  padded = true,
  ...props
}: PropsWithChildren<PanelProps>) {
  return (
    <div
      className={cn(
        'rounded-xl transition-base',
        elevationClasses[elevation],
        padded && 'p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
