import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils.js';

const priorityBadgeVariants = cva(
  'inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
  {
    variants: {
      priority: {
        p1: 'border-danger/30 bg-danger/10 text-danger dark:border-danger/40 dark:bg-danger/15 dark:text-red-300',
        p2: 'border-warning/30 bg-warning/10 text-warning dark:border-warning/40 dark:bg-warning/15 dark:text-amber-300',
        p3: 'border-neutral-300 bg-neutral-100 text-neutral-600 dark:border-forest-700 dark:bg-forest-800 dark:text-neutral-400',
      },
    },
    defaultVariants: {
      priority: 'p3',
    },
  },
);

export interface PriorityBadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof priorityBadgeVariants> {
  label?: string;
}

export function PriorityBadge({ priority, label, className, ...props }: PriorityBadgeProps) {
  const text = label ?? (priority === 'p1' ? 'P1' : priority === 'p2' ? 'P2' : 'P3');
  return (
    <span className={cn(priorityBadgeVariants({ priority }), className)} {...props}>
      {text}
    </span>
  );
}

export function dsarPriority(daysRemaining: number): 'p1' | 'p2' | 'p3' {
  if (daysRemaining <= 0) return 'p1';
  if (daysRemaining <= 7) return 'p2';
  return 'p3';
}

export function breachPriority(hoursRemaining: number | null): 'p1' | 'p2' | 'p3' {
  if (hoursRemaining == null) return 'p3';
  if (hoursRemaining <= 24) return 'p1';
  if (hoursRemaining <= 48) return 'p2';
  return 'p3';
}
