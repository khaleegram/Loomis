'use client';

import Link from 'next/link';
import { formatKobo } from '@loomis/core';
import { cn } from '@loomis/ui-web';
import { useWorkflowInbox } from '@loomis/api-client';
import { Banknote, ClipboardCheck, Lock, ShieldCheck } from 'lucide-react';

import { AttentionStrip } from '@/components/dashboard/attention-strip';
import { AttentionTaskList } from '@/components/dashboard/attention-task-list';
import { CorePendingApprovals } from '@/components/workflow/core-inline-workflow-decision';
import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';
import {
  filterInboxByTypes,
} from '@/lib/leadership/leadership-attention';
import { useLeadershipAttention } from '@/lib/leadership/use-leadership-attention';

interface CoreOwnerHomeProps {
  tenantId: string;
  displayName?: string | null;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Core school owner home — attention cards, not full §6.1 financial command dashboard (Sprint 4). */
export function CoreOwnerHome({ tenantId, displayName }: CoreOwnerHomeProps) {
  const { isLoading, stats, tasks, actionCount, psfSummary, census, focusTerm } =
    useLeadershipAttention(tenantId, 'school_owner');
  const inboxQuery = useWorkflowInbox(tenantId);
  const ownerInbox = filterInboxByTypes(inboxQuery.data?.items ?? [], [
    'staff_role_change',
    'refund_request',
    'fee_structure_change',
  ]).filter((item) => item.activeStep.approverRole === 'school_owner');

  const firstName = displayName?.split(' ')[0];
  const termLabel = focusTerm?.name ?? 'No active term';

  const stripItems = [
    { ...stats[0]!, icon: Lock, gradient: SURFACES.kpi.g1 },
    { ...stats[1]!, icon: Banknote, gradient: SURFACES.kpi.g2 },
    { ...stats[2]!, icon: ShieldCheck, gradient: SURFACES.kpi.g3 },
    { ...stats[3]!, icon: ClipboardCheck, gradient: SURFACES.kpi.g4 },
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
          <p className={ACADEMIC_UI.sectionLabel}>School Owner · Core</p>
          <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
            {firstName ? `${greeting()}, ${firstName}` : 'Financial oversight'}
          </h1>
          <p className={ACADEMIC_UI.pageDesc}>
            School fee balances, platform fee, and owner approvals for{' '}
            <span className="font-semibold text-foreground">{termLabel}</span>. Approve from here
            — no workflow inbox module in Core.
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
                : 'All clear for today'}
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
            Items needing your action
          </h2>
        </div>
        <AttentionTaskList
          tasks={tasks}
          emptyTitle="School is up to date"
          emptyDescription="Platform fee, school balances, and owner approvals are clear. Check back when admissions or refunds arrive."
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

      <section className={ACADEMIC_UI.dataPanel}>
        <div className="border-b border-brand-100/40 px-4 py-4 sm:px-6">
          <p className={ACADEMIC_UI.sectionLabel}>Platform fee</p>
          <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">What you owe Loomis</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Recorded automatically from enrolled students each term — separate from parent school-fee
            payments.
          </p>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-6">
          <div className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              Total obligations
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-neutral-900">
              {isLoading ? '—' : psfSummary.total}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              Pending settlement
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-neutral-900">
              {isLoading ? '—' : psfSummary.pending}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              Outstanding amount
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-neutral-900">
              {isLoading ? '—' : formatKobo(psfSummary.outstandingMinor)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-100/40 px-4 py-3 sm:px-6">
          <p className="text-[13px] text-neutral-500">
            {census.label === 'Platform fee pending'
              ? 'Platform fee is calculated automatically on the billing date.'
              : 'View full detail on the platform fee page.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/school/finance/platform-fee" className={ACADEMIC_UI.btnPrimary}>
              Platform fee
            </Link>
            <Link href="/school/finance/balances" className={ACADEMIC_UI.btnSecondary}>
              School balances
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
