'use client';

import Link from 'next/link';
import {
  Banknote,
  ClipboardCheck,
  GraduationCap,
  UserPlus,
} from 'lucide-react';

import { AttentionTaskList } from '@/components/dashboard/attention-task-list';
import { SchoolPsfWidget } from '@/components/dashboard/school-psf-widget';
import { LoomisPlatformFootnote } from '@/components/dashboard/loomis-platform-footnote';
import { SchoolOwnerHero } from '@/components/dashboard/school-owner-hero';
import {
  SCHOOL_OWNER_QUICK_ACTIONS,
  SCHOOL_OWNER_WORKFLOW_ACTION,
} from '@/components/dashboard/school-owner-quick-actions';
import { UnverifiedPaymentsBanner } from '@/components/dashboard/unverified-payments-banner';
import { SchoolOnboardingChecklist } from '@/components/school/school-onboarding-checklist';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';
import { useLeadershipAttention } from '@/lib/leadership/use-leadership-attention';
import { useWorkflowInboxModule } from '@/lib/workflow/use-workflow-inbox-module';

interface SchoolOwnerDashboardProps {
  tenantId: string;
  displayName?: string | null;
}

/** Advanced school owner — school command dashboard (operations + governance). */
export function SchoolOwnerDashboard({ tenantId, displayName }: SchoolOwnerDashboardProps) {
  const workflowInboxModule = useWorkflowInboxModule();
  const {
    isLoading,
    stats,
    tasks,
    actionCount,
    psfSummary,
    census,
    focusTerm,
    schoolTermPulse,
    schoolName,
  } = useLeadershipAttention(tenantId, 'school_owner', { workflowInboxModule });

  const stripItems = [
    { ...stats[0]!, icon: GraduationCap, gradient: SURFACES.kpi.g1 },
    { ...stats[1]!, icon: UserPlus, gradient: SURFACES.kpi.g2 },
    { ...stats[2]!, icon: Banknote, gradient: SURFACES.kpi.g3 },
    { ...stats[3]!, icon: ClipboardCheck, gradient: SURFACES.kpi.g4 },
  ];

  const quickActions = workflowInboxModule
    ? [...SCHOOL_OWNER_QUICK_ACTIONS, SCHOOL_OWNER_WORKFLOW_ACTION]
    : SCHOOL_OWNER_QUICK_ACTIONS;

  return (
    <div className="space-y-6">
      <SchoolOwnerHero
        variant="advanced"
        displayName={displayName}
        schoolName={schoolName}
        schoolTermPulse={schoolTermPulse}
        actionCount={actionCount}
        stripItems={stripItems}
        workflowInboxHref={workflowInboxModule ? '/school/workflows' : undefined}
      />

      <div className="space-y-4 pt-20 sm:pt-24">
        <SchoolPsfWidget tenantId={tenantId} />
        <SchoolOnboardingChecklist tenantId={tenantId} />
        <UnverifiedPaymentsBanner tenantId={tenantId} termId={focusTerm?.id} />

        <section className="space-y-4">
          <div>
            <p className={ACADEMIC_UI.sectionLabel}>Today</p>
            <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">
              Items needing your action
            </h2>
          </div>
          <AttentionTaskList
            tasks={tasks}
            emptyTitle="School is up to date"
            emptyDescription="Admissions, fee collections, and owner approvals are clear. Check back when something needs your sign-off."
          />
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="group card flex gap-3 rounded-xl p-4 transition-colors hover:border-border hover:bg-accent/30"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground ring-1 ring-border">
                <Icon aria-hidden className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-foreground group-hover:text-primary">
                  {action.label}
                </p>
                <p className="mt-0.5 text-[12px] leading-snug text-neutral-500">
                  {action.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <LoomisPlatformFootnote psfSummary={psfSummary} census={census} isLoading={isLoading} />
    </div>
  );
}
