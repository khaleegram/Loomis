'use client';

import type { AcademicTermResponse } from '@loomis/contracts';
import { cn } from '@loomis/ui-web';

const LIFECYCLE_STEPS = [
  { key: 'draft', label: 'Configure' },
  { key: 'open', label: 'Open' },
  { key: 'census_locked', label: 'Census lock' },
  { key: 'closed', label: 'Close' },
] as const;

type LifecycleKey = (typeof LIFECYCLE_STEPS)[number]['key'];

const STATUS_ORDER: Record<LifecycleKey, number> = {
  draft: 0,
  open: 1,
  census_locked: 2,
  closed: 3,
};

function stepState(
  stepKey: LifecycleKey,
  termStatus: AcademicTermResponse['status'],
): 'complete' | 'current' | 'upcoming' {
  const current = STATUS_ORDER[termStatus];
  const step = STATUS_ORDER[stepKey];
  if (step < current) return 'complete';
  if (step === current) return 'current';
  return 'upcoming';
}

interface TermLifecycleTimelineProps {
  term: AcademicTermResponse;
  className?: string;
}

/** Horizontal Emerald Rail — term lifecycle (draft → open → census_locked → closed). */
export function TermLifecycleTimeline({ term, className }: TermLifecycleTimelineProps) {
  return (
    <nav
      aria-label={`${term.name} lifecycle`}
      className={cn('w-full overflow-x-auto pb-1', className)}
    >
      <ol className="flex min-w-[32rem] items-center gap-0">
        {LIFECYCLE_STEPS.map((step, index) => {
          const state = stepState(step.key, term.status);
          const isLast = index === LIFECYCLE_STEPS.length - 1;
          return (
            <li key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5 px-2">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
                    state === 'complete' &&
                      'border-brand-600 bg-brand-600 text-primary-foreground dark:border-mint-500 dark:bg-mint-500',
                    state === 'current' &&
                      'border-gold bg-gold/10 text-foreground ring-2 ring-gold/30 dark:border-gold dark:bg-gold/15',
                    state === 'upcoming' &&
                      'border-border bg-muted text-muted-foreground',
                  )}
                  aria-current={state === 'current' ? 'step' : undefined}
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    'text-center text-xs font-medium',
                    state === 'current' ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast ? (
                <div
                  className={cn(
                    'mx-1 h-0.5 flex-1 rounded-full',
                    STATUS_ORDER[step.key] < STATUS_ORDER[term.status]
                      ? 'bg-brand-600 dark:bg-mint-500/60'
                      : 'bg-border',
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
