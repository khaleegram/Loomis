'use client';

import { cn } from '@loomis/ui-web';
import { Check } from 'lucide-react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

interface CensusLockStepperProps {
  steps: readonly string[];
  currentStep: number;
}

export function CensusLockStepper({ steps, currentStep }: CensusLockStepperProps) {
  return (
    <nav aria-label="Census lock progress" className="rounded-xl border border-neutral-200 bg-white p-2 sm:p-3">
      <ol className="flex flex-wrap gap-1.5">
        {steps.map((label, index) => {
          const completed = index < currentStep;
          const active = index === currentStep;
          return (
            <li
              key={label}
              className={cn(
                'flex min-h-[44px] flex-1 items-center gap-2 rounded-xl px-3 py-2 sm:min-w-[140px] sm:flex-none',
                active
                  ? ACADEMIC_UI.chipActive
                  : completed
                    ? 'bg-accent-green-50 text-accent-green-800 ring-1 ring-accent-green-200/60'
                    : ACADEMIC_UI.chipInactive,
              )}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                  active
                    ? 'bg-neutral-900/10 text-neutral-900'
                    : completed
                      ? 'bg-accent-green-600 text-white'
                      : 'bg-neutral-100 text-neutral-500',
                )}
              >
                {completed ? <Check aria-hidden className="size-3.5" /> : index + 1}
              </span>
              <span className="text-[11px] font-semibold leading-tight sm:text-[12px]">{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
