'use client';

import { cn } from '@loomis/ui-web';
import { useWorkflowInbox } from '@loomis/api-client';
import { ClipboardList, RefreshCw, UserPlus, Users } from 'lucide-react';

import { AttentionStrip } from '@/components/dashboard/attention-strip';
import { AttentionTaskList } from '@/components/dashboard/attention-task-list';
import { CorePendingApprovals } from '@/components/workflow/core-inline-workflow-decision';
import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';
import { filterInboxByTypes } from '@/lib/leadership/leadership-attention';
import { useLeadershipAttention } from '@/lib/leadership/use-leadership-attention';

interface CorePrincipalHomeProps {
  tenantId: string;
  displayName?: string | null;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Core principal home — operational attention cards, not full §6.2 dashboard (Sprint 4). */
export function CorePrincipalHome({ tenantId, displayName }: CorePrincipalHomeProps) {
  const { stats, tasks, actionCount, focusTerm } = useLeadershipAttention(
    tenantId,
    'principal',
  );
  const inboxQuery = useWorkflowInbox(tenantId, { live: true });
  const principalInbox = filterInboxByTypes(inboxQuery.data?.items ?? [], [
    'refund_request',
    'fee_structure_change',
  ]).filter((item) => item.activeStep.approverRole === 'principal');

  const firstName = displayName?.split(' ')[0];
  const termLabel = focusTerm?.name ?? 'No active term';

  const stripItems = [
    { ...stats[0]!, icon: UserPlus, gradient: SURFACES.kpi.g1 },
    { ...stats[1]!, icon: RefreshCw, gradient: SURFACES.kpi.g2 },
    { ...stats[2]!, icon: ClipboardList, gradient: SURFACES.kpi.g3 },
    { ...stats[3]!, icon: Users, gradient: SURFACES.kpi.g4 },
  ];

  return (
    <div className="space-y-6">
      <div className="hero-panel rounded-2xl">
        <div
          className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8"
          style={{ background: SURFACES.hero }}
        >
          <div
            className="pointer-events-none absolute -right-8 top-6 size-44 rounded-full bg-gold-300/20 blur-3xl dark:bg-primary/10"
            aria-hidden
          />
          <p className={ACADEMIC_UI.sectionLabel}>Principal · Core</p>
          <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
            {firstName ? `${greeting()}, ${firstName}` : 'Operations desk'}
          </h1>
          <p className={ACADEMIC_UI.pageDesc}>
            Admissions, refunds, and fee changes for{' '}
            <span className="font-semibold text-foreground">{termLabel}</span>. Staff role changes
            go to the school owner for final approval.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold',
                actionCount > 0
                  ? 'border-gold-300/70 bg-gold-50/90 text-gold-900'
                  : 'border-emerald-200/80 bg-emerald-50/90 text-emerald-800',
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  actionCount > 0 ? 'bg-gold-500' : 'bg-emerald-500',
                )}
              />
              {actionCount > 0
                ? `${actionCount} item${actionCount === 1 ? '' : 's'} need attention`
                : 'Operations clear'}
            </span>
            <span className="hero-pill">{termLabel}</span>
          </div>

          <AttentionStrip items={stripItems} />
        </div>
      </div>

      <section className="space-y-4 pt-20 sm:pt-24">
        <div>
          <p className={ACADEMIC_UI.sectionLabel}>Today</p>
          <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">
            Your action queue
          </h2>
        </div>
        <AttentionTaskList
          tasks={tasks}
          emptyTitle="Operations are clear"
          emptyDescription="No admissions, refunds, or fee amendments waiting. Role changes with the owner will appear here when in flight."
        />
      </section>

      {principalInbox.length > 0 ? (
        <section className="space-y-4">
          <div>
            <p className={ACADEMIC_UI.sectionLabel}>Inline approvals</p>
            <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">
              Refunds & fee changes
            </h2>
          </div>
          <CorePendingApprovals tenantId={tenantId} items={principalInbox} />
        </section>
      ) : null}
    </div>
  );
}
