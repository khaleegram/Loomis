'use client';

import Link from 'next/link';
import { useWorkflowInbox } from '@loomis/api-client';
import {
  Banknote,
  ClipboardCheck,
  GraduationCap,
  UserPlus,
} from 'lucide-react';

import { AttentionTaskList } from '@/components/dashboard/attention-task-list';
import { LoomisPlatformFootnote } from '@/components/dashboard/loomis-platform-footnote';
import { SchoolOwnerHero } from '@/components/dashboard/school-owner-hero';
import { SCHOOL_OWNER_QUICK_ACTIONS } from '@/components/dashboard/school-owner-quick-actions';
import { CorePendingApprovals } from '@/components/workflow/core-inline-workflow-decision';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';
import { filterInboxByTypes } from '@/lib/leadership/leadership-attention';
import { useLeadershipAttention } from '@/lib/leadership/use-leadership-attention';

interface CoreOwnerHomeProps {
  tenantId: string;
  displayName?: string | null;
}

/** Core school owner home — school pulse, inline approvals, de-emphasized platform billing. */
export function CoreOwnerHome({ tenantId, displayName }: CoreOwnerHomeProps) {
  const {
    isLoading,
    stats,
    tasks,
    actionCount,
    psfSummary,
    census,
    schoolTermPulse,
    schoolName,
  } = useLeadershipAttention(tenantId, 'school_owner');
  const inboxQuery = useWorkflowInbox(tenantId);
  const ownerInbox = filterInboxByTypes(inboxQuery.data?.items ?? [], [
    'staff_role_change',
    'refund_request',
    'fee_structure_change',
  ]).filter((item) => item.activeStep.approverRole === 'school_owner');

  const stripItems = [
    { ...stats[0]!, icon: GraduationCap, gradient: SURFACES.kpi.g1 },
    { ...stats[1]!, icon: UserPlus, gradient: SURFACES.kpi.g2 },
    { ...stats[2]!, icon: Banknote, gradient: SURFACES.kpi.g3 },
    { ...stats[3]!, icon: ClipboardCheck, gradient: SURFACES.kpi.g4 },
  ];

  return (
    <div className="space-y-6">
      <SchoolOwnerHero
        variant="core"
        displayName={displayName}
        schoolName={schoolName}
        schoolTermPulse={schoolTermPulse}
        actionCount={actionCount}
        stripItems={stripItems}
      />

      <section className="space-y-4 pt-20 sm:pt-24">
        <div>
          <p className={ACADEMIC_UI.sectionLabel}>Today</p>
          <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">
            Items needing your action
          </h2>
        </div>
        <AttentionTaskList
          tasks={tasks}
          emptyTitle="School is up to date"
          emptyDescription="Admissions, collections, and approvals are clear. Check back when applications or refunds arrive."
        />
      </section>

      {ownerInbox.length > 0 ? (
        <section className="space-y-4">
          <div>
            <p className={ACADEMIC_UI.sectionLabel}>One-tap approvals</p>
            <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">
              Approve without the workflow inbox
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Role changes, large refunds, and fee amendments that need the owner.
            </p>
          </div>
          <CorePendingApprovals
            tenantId={tenantId}
            items={ownerInbox}
            emptyMessage="No owner approvals pending."
          />
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SCHOOL_OWNER_QUICK_ACTIONS.map((action) => {
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
