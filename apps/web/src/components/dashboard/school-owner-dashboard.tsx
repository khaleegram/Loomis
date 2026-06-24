'use client';

import Link from 'next/link';
import { formatKobo } from '@loomis/core';
import { cn } from '@loomis/ui-web';
import {
  Banknote,
  ClipboardCheck,
  ClipboardList,
  FileSearch,
  Lock,
  Scale,
} from 'lucide-react';

import { AttentionStrip } from '@/components/dashboard/attention-strip';
import { AttentionTaskList } from '@/components/dashboard/attention-task-list';
import { UnverifiedPaymentsBanner } from '@/components/dashboard/unverified-payments-banner';
import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';
import { useLeadershipAttention } from '@/lib/leadership/use-leadership-attention';
import { useWorkflowInboxModule } from '@/lib/workflow/use-workflow-inbox-module';

interface SchoolOwnerDashboardProps {
  tenantId: string;
  displayName?: string | null;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Advanced school owner — Financial Command Dashboard (master plan §6.1). */
export function SchoolOwnerDashboard({ tenantId, displayName }: SchoolOwnerDashboardProps) {
  const workflowInboxModule = useWorkflowInboxModule();
  const { isLoading, stats, tasks, actionCount, psfSummary, census, focusTerm } =
    useLeadershipAttention(tenantId, 'school_owner', { workflowInboxModule });

  const firstName = displayName?.split(' ')[0];
  const termLabel = focusTerm?.name ?? 'No active term';

  const stripItems = [
    { ...stats[0]!, icon: Lock, gradient: SURFACES.kpi.g1 },
    { ...stats[1]!, icon: Banknote, gradient: SURFACES.kpi.g2 },
    { ...stats[2]!, icon: ClipboardList, gradient: SURFACES.kpi.g3 },
    { ...stats[3]!, icon: Scale, gradient: SURFACES.kpi.g4 },
  ];

  const quickActions = [
    {
      href: '/school/finance/balances',
      icon: Banknote,
      label: 'PSF obligations',
      description: 'Platform service fee status for this term.',
    },
    {
      href: '/school/finance/balances',
      icon: Scale,
      label: 'Balances',
      description: 'School fee balances and reconciliation.',
    },
    ...(workflowInboxModule
      ? [
          {
            href: '/school/workflows',
            icon: ClipboardList,
            label: 'Workflows',
            description: 'Owner approvals and refund sign-offs.',
          },
        ]
      : []),
    {
      href: census.href,
      icon: Lock,
      label: census.label === 'Platform fee pending' ? 'Platform fee' : 'Academic sessions',
      description:
        census.label === 'Platform fee pending'
          ? 'Platform fee records automatically on the billing date.'
          : 'Review term status and school fee balances.',
    },
    {
      href: '/school/settings/audit',
      icon: FileSearch,
      label: 'Audit log',
      description: 'Attestation history — full list pending API.',
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="hero-panel rounded-2xl">
        <div
          className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8"
          style={{ background: SURFACES.hero }}
        >
          <p className={ACADEMIC_UI.sectionLabel}>School Owner · Advanced</p>
          <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
            {firstName ? `${greeting()}, ${firstName}` : 'Financial command'}
          </h1>
          <p className={ACADEMIC_UI.pageDesc}>
            Platform fee and school balances for{' '}
            <span className="font-semibold text-foreground">{termLabel}</span>. Loomis bills your
            school automatically each term — separate from parent school fees.
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
                : 'Financial posture clear'}
            </span>
            <span className="hero-pill">{termLabel}</span>
          </div>

          <AttentionStrip items={stripItems} />
        </div>
      </div>

      <div className="space-y-4 pt-20 sm:pt-24">
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
            emptyDescription="Census, PSF, and owner approvals are clear. Check back when admissions or refunds arrive."
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

      <section className={ACADEMIC_UI.dataPanel}>
        <div className="border-b border-brand-100/40 px-4 py-4 sm:px-6">
          <p className={ACADEMIC_UI.sectionLabel}>Platform service fee</p>
          <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">PSF summary</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Settled vs outstanding obligations for the active term.
          </p>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-6">
          <div className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              Settled
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-neutral-900">
              {isLoading ? '—' : psfSummary.settled}
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
          <p className="flex items-center gap-2 text-[13px] text-neutral-500">
            <ClipboardCheck aria-hidden className="size-4 shrink-0 text-neutral-400" />
            {census.label === 'Platform fee pending'
              ? 'Platform fee records automatically on the billing date.'
              : 'Platform fee is recorded separately from school fee balances.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/school/finance/platform-fee" className={ACADEMIC_UI.btnSecondary}>
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
