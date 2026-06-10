import type { ReactNode } from 'react';
import { cn } from '../../lib/utils.js';

export interface SectionLabelProps {
  children: ReactNode;
  className?: string;
}

/** Uppercase section divider label for dashboard rows. */
export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <p
      className={cn(
        'mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground',
        className,
      )}
    >
      {children}
    </p>
  );
}
