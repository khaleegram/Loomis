'use client';

import type { AcademicTermResponse } from '@loomis/contracts';
import { Check, Lock, PenLine, Play } from 'lucide-react';

import { cn } from '@loomis/ui-web';

const LIFECYCLE_STEPS = [
  { key: 'draft', label: 'Configure', icon: PenLine },
  { key: 'open', label: 'Open', icon: Play },
  { key: 'census_locked', label: 'Census', icon: Lock },
  { key: 'closed', label: 'Closed', icon: Check },
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
  variant?: 'default' | 'compact';
}

export function TermLifecycleTimeline({
  term,
  className,
  variant = 'default',
}: TermLifecycleTimelineProps) {
  return (
    <nav
      aria-label={`${term.name} lifecycle`}
      className={cn('w-full overflow-x-auto', className)}
    >
      <ol
        className={cn(
          'flex w-full min-w-0 items-center justify-between sm:justify-normal',
          variant === 'compact' ? 'gap-1' : 'gap-0',
        )}
      >
        {LIFECYCLE_STEPS.map((step, index) => {
          const state = stepState(step.key, term.status);
          const Icon = step.icon;
          const isLast = index === LIFECYCLE_STEPS.length - 1;

          return (
            <li key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5 px-1">
                <span
                  className={cn(
                    'flex items-center justify-center rounded-xl transition-colors',
                    variant === 'compact' ? 'size-8' : 'size-9',
                    state === 'complete' && 'bg-brand-600 text-neutral-900',
                    state === 'current' &&
                      'bg-brand-500 text-neutral-900 ring-2 ring-brand-300 ring-offset-2',
                    state === 'upcoming' && 'bg-neutral-100 text-neutral-400',
                  )}
                  aria-current={state === 'current' ? 'step' : undefined}
                >
                  <Icon aria-hidden className="size-3.5" />
                </span>
                <span
                  className={cn(
                    'text-center text-[10px] font-semibold uppercase tracking-wide',
                    state === 'current' ? 'text-brand-800' : 'text-neutral-400',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast ? (
                <div
                  className={cn(
                    'mx-0.5 h-0.5 flex-1 rounded-full',
                    STATUS_ORDER[step.key] < STATUS_ORDER[term.status]
                      ? 'bg-brand-500'
                      : 'bg-neutral-100',
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
