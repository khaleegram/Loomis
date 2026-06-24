'use client';

import { CheckCircle2, CircleDashed } from 'lucide-react';
import { cn } from '@loomis/ui-web';
import type { TenantOnboardingStatus } from '@loomis/contracts';

interface TenantOnboardingTimelineProps {
  onboarding: TenantOnboardingStatus;
}

export function TenantOnboardingTimeline({ onboarding }: TenantOnboardingTimelineProps) {
  return (
    <div className="card overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div>
          <p className="text-[12px] font-bold text-neutral-900">Onboarding checklist</p>
          <p className="text-[11px] text-neutral-400">
            {onboarding.completedStepCount} of {onboarding.totalStepCount} complete
          </p>
        </div>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]',
            onboarding.readyForOperations
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700',
          )}
        >
          {onboarding.readyForOperations ? 'Ready for operations' : 'Setup in progress'}
        </span>
      </div>

      <ol className="divide-y divide-neutral-100">
        {onboarding.steps.map((step) => (
          <li key={step.id} className="flex items-start gap-3 px-5 py-3.5">
            {step.complete ? (
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            ) : (
              <CircleDashed aria-hidden className="mt-0.5 size-4 shrink-0 text-neutral-300" />
            )}
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-[13px] font-semibold',
                  step.complete ? 'text-neutral-700' : 'text-neutral-900',
                )}
              >
                {step.label}
              </p>
              {step.detail ? (
                <p className="mt-0.5 text-[11px] text-neutral-400">{step.detail}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {onboarding.suggestedPsfBasisMinor != null ? (
        <div className="border-t border-neutral-100 bg-neutral-50/60 px-5 py-3 text-[11px] text-neutral-500">
          Fee basis for PSF suggestion recorded from school fee structures.
        </div>
      ) : null}
    </div>
  );
}
