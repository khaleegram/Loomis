'use client';

import { useAdmissions, useStaffDirectory } from '@loomis/api-client';
import { cn } from '@loomis/ui-web';
import {
  BookOpen,
  ClipboardList,
  Megaphone,
  RefreshCw,
  UserPlus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { AttentionStrip } from '@/components/dashboard/attention-strip';
import { AttentionTaskList } from '@/components/dashboard/attention-task-list';
import { UnverifiedPaymentsBanner } from '@/components/dashboard/unverified-payments-banner';
import { StaffVacantRolesBanner } from '@/components/staff/staff-vacant-roles-banner';
import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SEMANTIC, SURFACES } from '@/lib/design/surfaces';
import { useLeadershipAttention } from '@/lib/leadership/use-leadership-attention';
import { computeVacantSingletonRoles } from '@/lib/staff/staff-labels';

interface PrincipalOperationsDashboardProps {
  tenantId: string;
  displayName?: string | null;
}

const QUICK_ACTIONS = [
  {
    href: '/school/workflows',
    icon: ClipboardList,
    label: 'Workflows',
    description: 'Refunds, grade fixes, fee amendments, and transfers.',
  },
  {
    href: '/school/students/admissions',
    icon: UserPlus,
    label: 'Admissions',
    description: 'Review pending applications.',
  },
  {
    href: '/school/academic',
    icon: BookOpen,
    label: 'Academic',
    description: 'Sessions, census, and academic hub.',
  },
  {
    href: '/school/staff',
    icon: Users,
    label: 'Staff assignments',
    description: 'Roles, invitations, and coverage.',
  },
  {
    href: '/school/comms',
    icon: Megaphone,
    label: 'Broadcast',
    description: 'Announcements to staff and parents.',
  },
] as const;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Advanced principal — Operations Dashboard (master plan §6.2). */
export function PrincipalOperationsDashboard({
  tenantId,
  displayName,
}: PrincipalOperationsDashboardProps) {
  const live = { live: true as const };
  const admissionsQuery = useAdmissions(tenantId, {}, live);
  const staffQuery = useStaffDirectory(tenantId, live);

  const { stats, tasks, actionCount, focusTerm, census, inboxBreakdown, isLoading } =
    useLeadershipAttention(tenantId, 'principal', { workflowInboxModule: true });

  const pendingAdmissionCount = useMemo(
    () =>
      (admissionsQuery.data?.admissions ?? []).filter((row) => row.status === 'pending').length,
    [admissionsQuery.data],
  );

  const vacantCriticalRoles = useMemo(() => {
    const vacant = computeVacantSingletonRoles(staffQuery.data?.staff ?? []);
    return vacant.filter((role) => role === 'exam_officer' || role === 'accountant');
  }, [staffQuery.data]);

  const firstName = displayName?.split(' ')[0];
  const termLabel = focusTerm?.name ?? 'No active term';

  const stripItems = [
    { ...stats[0]!, icon: ClipboardList, gradient: SURFACES.kpi.g1 },
    { ...stats[1]!, icon: RefreshCw, gradient: SURFACES.kpi.g2 },
    { ...stats[2]!, icon: BookOpen, gradient: SURFACES.kpi.g3 },
    { ...stats[3]!, icon: UserPlus, gradient: SURFACES.kpi.g4 },
  ];

  const inboxBreakdownRows = [
    { label: 'Admissions', count: pendingAdmissionCount, href: '/school/students/admissions' },
    { label: 'Refunds', count: inboxBreakdown.refunds, href: '/school/workflows' },
    { label: 'Grade fixes', count: inboxBreakdown.gradeCorrections, href: '/school/workflows' },
    { label: 'Fee amendments', count: inboxBreakdown.feeAmendments, href: '/school/workflows' },
    { label: 'Transfers', count: inboxBreakdown.transfers, href: '/school/workflows' },
    {
      label: 'Role changes (owner)',
      count: inboxBreakdown.ownerRoleChanges,
      href: '/school/staff',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="hero-panel rounded-2xl">
        <div
          className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8"
          style={{ background: SURFACES.hero }}
        >
          <p className={ACADEMIC_UI.sectionLabel}>Principal · Advanced</p>
          <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
            {firstName ? `${greeting()}, ${firstName}` : 'Operations desk'}
          </h1>
          <p className={ACADEMIC_UI.pageDesc}>
            Admissions, workflow inbox, and census readiness for{' '}
            <span className="font-semibold text-foreground">{termLabel}</span>.
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
              {actionCount > 0
                ? `${actionCount} item${actionCount === 1 ? '' : 's'} in queue`
                : 'Operations clear'}
            </span>
            <Link
              href="/school/workflows"
              className={`inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-medium ${SEMANTIC.cta.primary}`}
            >
              Open workflow inbox
            </Link>
          </div>

          <AttentionStrip items={stripItems} />
        </div>
      </div>

      <div className="space-y-4 pt-20 sm:pt-24">
        <UnverifiedPaymentsBanner tenantId={tenantId} termId={focusTerm?.id} />
        <StaffVacantRolesBanner vacantRoles={vacantCriticalRoles} />

        <section className={ACADEMIC_UI.dataPanel}>
          <div className="border-b border-brand-100/40 px-4 py-4 sm:px-6">
            <p className={ACADEMIC_UI.sectionLabel}>Workflow inbox</p>
            <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">
              Count by type
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {census.label} — {census.hint}
            </p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
            {inboxBreakdownRows.map((row) => (
              <Link
                key={row.label}
                href={row.href}
                className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50/80 px-4 py-3 transition-colors hover:border-brand-200 hover:bg-brand-50/30"
              >
                <span className="text-[13px] font-semibold text-neutral-700">{row.label}</span>
                <span
                  className={cn(
                    'min-w-8 rounded-full px-2 py-0.5 text-center text-[12px] font-bold tabular-nums',
                    row.count > 0 ? SEMANTIC.warning.pill : 'bg-emerald-50 text-emerald-700',
                  )}
                >
                  {isLoading || admissionsQuery.isLoading ? '—' : row.count}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className={ACADEMIC_UI.sectionLabel}>Today</p>
            <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">
              Your action queue
            </h2>
          </div>
          <AttentionTaskList
            tasks={tasks}
            emptyTitle="Operations are clear"
            emptyDescription="No admissions or workflow items waiting. Grade corrections and fee amendments appear here when assigned to you."
          />
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
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
    </div>
  );
}
