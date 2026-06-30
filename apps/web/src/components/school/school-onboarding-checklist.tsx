'use client';

import Link from 'next/link';
import { CheckCircle2, CircleDashed, Rocket } from 'lucide-react';
import { Skeleton, cn } from '@loomis/ui-web';
import { useTenantOnboarding } from '@loomis/api-client';
import type { TenantOnboardingStep } from '@loomis/contracts';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';

const STEP_LINKS: Partial<Record<string, { href: string; label: string }>> = {
  academic_year: { href: '/school/academic', label: 'Set up academic year' },
  fee_structures: { href: '/school/finance/structures', label: 'Configure fees' },
};

interface SchoolOnboardingChecklistProps {
  tenantId: string;
}

function StepAction({ step }: { step: TenantOnboardingStep }) {
  const action = STEP_LINKS[step.id];
  if (step.complete || !action) return null;
  return (
    <Link
      href={action.href}
      className="mt-2 inline-flex min-h-[44px] items-center rounded-lg bg-[#c9a96e] px-3 py-2 text-[12px] font-bold text-neutral-900 transition hover:bg-[#b89555]"
    >
      {action.label}
    </Link>
  );
}

export function SchoolOnboardingChecklist({ tenantId }: SchoolOnboardingChecklistProps) {
  const { data: onboarding, isLoading } = useTenantOnboarding(tenantId);

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }

  if (!onboarding || onboarding.readyForOperations) {
    return null;
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-brand-100/40"
      style={{ background: SURFACES.hero }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#c9a96e] text-neutral-900">
            <Rocket aria-hidden className="size-5" />
          </span>
          <div>
            <p className={ACADEMIC_UI.sectionLabel}>Getting started</p>
            <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">
              Finish setting up your school
            </h2>
            <p className="mt-1 text-[13px] text-neutral-600">
              {onboarding.completedStepCount} of {onboarding.totalStepCount} steps complete
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-brand-100/30 bg-white/80 px-5 py-4 sm:px-6">
        <ol className="space-y-4">
          {onboarding.steps.map((step) => (
            <li key={step.id} className="flex items-start gap-3">
              {step.complete ? (
                <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              ) : (
                <CircleDashed aria-hidden className="mt-0.5 size-4 shrink-0 text-neutral-300" />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-[13px] font-semibold',
                    step.complete ? 'text-neutral-500 line-through' : 'text-neutral-900',
                  )}
                >
                  {step.label}
                </p>
                {step.detail && !step.complete ? (
                  <p className="mt-0.5 text-[11px] text-neutral-500">{step.detail}</p>
                ) : null}
                <StepAction step={step} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
