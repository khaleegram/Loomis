'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { can } from '@loomis/core';
import {
  useStudents,
  useStaffDirectory,
  useAdmissions,
  useWorkflowInbox,
  useAcademicYears,
  useAcademicTerms,
  useOutstandingBalances,
  useClassStructure,
} from '@loomis/api-client';
import {
  ArrowUpRight,
  Banknote,
  BookOpen,
  Calendar,
  Download,
  GraduationCap,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';

import {
  BRONZE,
  DashboardBottomCard,
  DashboardDarkPanel,
  DashboardFilterMenu,
  DashboardHeader,
  DashboardSpark,
  DashboardStatStrip,
  DashboardToolbar,
} from '@/components/dashboard/dashboard-primitives';
import { PageBody } from '@/components/school/school-shell';
import { useAuth } from '@/lib/auth/auth-context';

const ROLE_LABELS: Record<string, string> = {
  school_owner: 'School Owner',
  principal: 'Principal',
  admin_officer: 'Administrator',
  accountant: 'Accountant',
  cashier: 'Cashier',
  exam_officer: 'Exam Officer',
  teacher: 'Teacher',
  class_teacher: 'Class Teacher',
};

function fmtNaira(minor: number): string {
  const n = minor / 100;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toFixed(0)}`;
}

export default function SchoolDashboardPage() {
  const { session } = useAuth();
  const tenantId = session?.tenantId ?? '';
  const role = session?.role;
  const roleLabel =
    role != null
      ? (ROLE_LABELS[role] ?? role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      : 'User';

  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [selectedClassArmId, setSelectedClassArmId] = useState<string | null>(null);

  const { data: staffData, isLoading: staffLoading } = useStaffDirectory(tenantId);
  const { data: admissionsData, isLoading: admissionsLoading } = useAdmissions(tenantId);
  const { data: inboxData } = useWorkflowInbox(tenantId);

  const { data: yearsData } = useAcademicYears(tenantId);
  const activeYear = useMemo(
    () => yearsData?.academicYears?.find((y) => y.status === 'active'),
    [yearsData],
  );
  const { data: termsData } = useAcademicTerms(tenantId, activeYear?.id ?? '');
  const openTerm = useMemo(
    () => termsData?.terms?.find((t) => t.status === 'open'),
    [termsData],
  );
  const { data: classStructureData } = useClassStructure(tenantId, activeYear?.id ?? '');
  const classArms = classStructureData?.arms ?? [];

  const periodOptions = useMemo(() => {
    const terms = termsData?.terms ?? [];
    if (terms.length > 0) return terms.map((term) => term.name ?? 'Term');
    return ['This Term', 'Last Term', 'YTD'];
  }, [termsData?.terms]);

  const activePeriod = selectedPeriod ?? openTerm?.name ?? periodOptions[0] ?? 'This Term';
  const activeTerm = useMemo(() => {
    const terms = termsData?.terms ?? [];
    return terms.find((term) => term.name === activePeriod) ?? openTerm;
  }, [activePeriod, openTerm, termsData?.terms]);

  const { data: balancesData, isLoading: balancesLoading } = useOutstandingBalances(
    tenantId,
    activeTerm?.id ?? '',
    {},
  );

  const { data: studentsData, isLoading: studentsLoading } = useStudents(
    tenantId,
    selectedClassArmId ? { classArmId: selectedClassArmId } : {},
  );

  const studentCount = studentsData?.students.length ?? 0;
  const staffCount = staffData?.staff.length ?? 0;
  const pendingAdmissionCount =
    admissionsData?.admissions.filter((a) => a.status === 'pending').length ?? 0;
  const feeSummary = balancesData?.summary;
  const feeCollectionRate =
    feeSummary && feeSummary.totalChargedMinor > 0
      ? Math.round((feeSummary.totalPaidMinor / feeSummary.totalChargedMinor) * 100)
      : null;

  const isLoading = studentsLoading || staffLoading || admissionsLoading || balancesLoading;
  const inboxCount = inboxData?.items.length ?? 0;
  const canExport = role ? can(role, 'ledger.view') || can(role, 'admissions.manage') : false;
  const termLabel = activeTerm ? activeTerm.name ?? 'This Term' : 'No active term';
  const operationsClear = inboxCount === 0 && pendingAdmissionCount === 0;

  return (
    <PageBody className="max-w-[1200px] px-7 py-7">
      <DashboardHeader
        consoleLabel="School Console"
        roleLabel={roleLabel}
        userName={session?.displayName}
        description="Enrollment, academic standards, and ledger-backed financial posture — live."
      />

      <DashboardToolbar
        periods={periodOptions}
        selectedPeriod={activePeriod}
        onPeriodChange={setSelectedPeriod}
        actions={
          <>
            <DashboardFilterMenu
              value={selectedClassArmId}
              onValueChange={setSelectedClassArmId}
              options={classArms.map((arm) => ({ value: arm.id, label: arm.name }))}
              allLabel="All Classes"
              searchPlaceholder="Search classes…"
              disabled={classArms.length === 0}
            />
            {canExport ? (
              <Link
                href="/school/finance/balances"
                className="flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-neutral-800"
              >
                <Download aria-hidden className="size-3.5" />
                Export
              </Link>
            ) : null}
          </>
        }
      />

      <DashboardStatStrip
        items={[
          {
            label: 'Students',
            value: isLoading ? '—' : studentCount.toLocaleString(),
            sub: `${studentCount.toLocaleString()} enrolled`,
            subColor: '#16a34a',
            icon: GraduationCap,
            color: BRONZE.gradients.g1,
          },
          {
            label: 'Staff',
            value: isLoading ? '—' : staffCount.toLocaleString(),
            sub: 'Active members',
            icon: Users,
            color: BRONZE.gradients.g2,
          },
          {
            label: 'Fee Collection',
            value: feeCollectionRate != null ? `${feeCollectionRate}%` : isLoading ? '—' : '—',
            sub: 'Of term charges',
            subColor: feeCollectionRate != null && feeCollectionRate >= 80 ? '#16a34a' : '#9ca3af',
            icon: Banknote,
            color: BRONZE.gradients.g3,
          },
          {
            label: 'Admissions',
            value: isLoading ? '—' : pendingAdmissionCount.toLocaleString(),
            sub: 'Pending review',
            subColor: pendingAdmissionCount > 0 ? '#f59e0b' : '#16a34a',
            icon: UserPlus,
            color: BRONZE.gradients.g4,
          },
        ]}
      />

      <div className="mb-5 grid grid-cols-12 gap-5">
        <div className="card col-span-8 overflow-hidden rounded-2xl">
          <div className="flex items-start justify-between px-6 pt-6 pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">Enrollment Trend</p>
              <p
                className="mt-1 tabular-nums text-neutral-900"
                style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.025em' }}
              >
                {isLoading ? '—' : studentCount.toLocaleString()}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                  {activeTerm ? termLabel : 'No active term'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-500">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Live
            </div>
          </div>
          <div className="px-1 pb-1">
            <div className="flex h-[120px] items-center justify-center text-[12px] text-neutral-400">
              Enrollment trend requires historical snapshots
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-neutral-100 px-6 py-3.5">
            <div className="flex gap-5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-400">Active</p>
                <p className="mt-0.5 text-[14px] font-bold tabular-nums text-neutral-900">
                  {isLoading ? '—' : studentCount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-400">Pending</p>
                <p className="mt-0.5 text-[14px] font-bold tabular-nums text-orange-500">
                  {isLoading ? '—' : pendingAdmissionCount.toLocaleString()}
                </p>
              </div>
            </div>
            <Link href="/school/students" className="flex items-center gap-1 text-[11px] font-bold text-neutral-400 hover:text-neutral-700">
              View students <ArrowUpRight aria-hidden className="size-3" />
            </Link>
          </div>
        </div>

        <div className="col-span-4 flex flex-col gap-4">
          <div className="card flex-1 overflow-hidden rounded-2xl">
            <div className="px-5 pt-5 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="flex size-7 items-center justify-center rounded-lg text-white"
                    style={{ background: BRONZE.gradients.g3 }}
                  >
                    <Banknote aria-hidden className="size-3.5" />
                  </span>
                  <p className="text-[12px] font-bold text-neutral-700">Fee Collection</p>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  <ArrowUpRight aria-hidden className="size-2.5" />
                  {feeCollectionRate != null ? `${feeCollectionRate}%` : '—'}
                </span>
              </div>
              <p
                className="mt-2 tabular-nums text-neutral-900"
                style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.025em' }}
              >
                {isLoading ? '—' : feeSummary ? fmtNaira(feeSummary.totalPaidMinor) : '—'}
              </p>
              <p className="text-[11px] text-neutral-400">Collected this term</p>
            </div>
            <DashboardSpark
              data={
                feeSummary && feeSummary.totalPaidMinor > 0
                  ? [feeSummary.totalBalanceMinor, feeSummary.totalPaidMinor, feeSummary.totalChargedMinor]
                  : []
              }
              stroke={BRONZE.stroke.accent}
              height={52}
            />
          </div>

          <DashboardDarkPanel
            title="Operations"
            icon={ShieldCheck}
            rows={[
              {
                label: 'Pending Admissions',
                value: pendingAdmissionCount === 0 ? 'Clear' : `${pendingAdmissionCount} Pending`,
                color: pendingAdmissionCount === 0 ? '#34d399' : '#fbbf24',
                href: '/school/students/admissions',
              },
              {
                label: 'Workflow Inbox',
                value: inboxCount === 0 ? 'Clear' : `${inboxCount} Open`,
                color: inboxCount === 0 ? '#34d399' : '#fbbf24',
                href: '/school/workflows',
              },
              {
                label: 'Active Term',
                value: activeTerm ? 'Open' : 'None',
                color: activeTerm ? '#34d399' : '#f87171',
                href: '/school/academic/terms',
              },
              {
                label: 'Staff Directory',
                value: staffCount.toLocaleString(),
                color: '#34d399',
                href: '/school/staff',
              },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <DashboardBottomCard
          href="/school/students/admissions"
          icon={UserPlus}
          gradient={BRONZE.gradients.card}
          label="Pending Admissions"
          value={isLoading ? '—' : String(pendingAdmissionCount)}
          sub="Awaiting school review"
        />
        <DashboardBottomCard
          href="/school/workflows"
          icon={BookOpen}
          gradient="linear-gradient(135deg,#F43F5E,#BE123C)"
          label="Workflow Inbox"
          value={String(inboxCount)}
          sub={inboxCount === 0 ? 'All clear' : 'Requires action'}
        />
        <DashboardBottomCard
          icon={Calendar}
          gradient="linear-gradient(135deg,#14B8A6,#0F766E)"
          label="System Status"
          value={operationsClear ? 'Clear' : `${inboxCount + pendingAdmissionCount}`}
          sub={operationsClear ? 'No pending workflow items' : 'Open workflow or admission items'}
          badge={
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${operationsClear ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <span className={`size-1.5 rounded-full ${operationsClear ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {operationsClear ? 'Operational' : 'Action needed'}
            </span>
          }
        />
      </div>
    </PageBody>
  );
}
