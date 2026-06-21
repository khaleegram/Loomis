'use client';

import {
  useAcademicTerms,
  useAcademicYears,
  useAdmissions,
  useStaffDirectory,
  useStudents,
} from '@loomis/api-client';
import type { AdmissionResponse } from '@loomis/contracts';
import { cn } from '@loomis/ui-web';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowUpRight,
  BookOpen,
  GraduationCap,
  Link2,
  Megaphone,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';

interface AdminOfficerDashboardProps {
  tenantId: string;
  displayName?: string | null;
}

const QUICK_ACTIONS = [
  {
    href: '/school/students/admissions?new=1',
    icon: UserPlus,
    label: 'New application',
    description: 'Register a new applicant.',
  },
  {
    href: '/school/staff/invite',
    icon: Users,
    label: 'Invite staff',
    description: 'Send a 48-hour setup link.',
  },
  {
    href: '/school/students',
    icon: GraduationCap,
    label: 'Student registry',
    description: 'Profiles, enrollment, parent links.',
  },
  {
    href: '/school/comms',
    icon: Megaphone,
    label: 'Communications',
    description: 'Announcements to staff and parents.',
  },
  {
    href: '/school/academic/promotions',
    icon: BookOpen,
    label: 'Promotions',
    description: 'Stage year-end class moves.',
  },
  {
    href: '/school/attendance',
    icon: UserCheck,
    label: 'Attendance',
    description: 'School-wide attendance overview.',
  },
] as const;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function applicantName(admission: AdmissionResponse): string {
  return `${admission.firstName} ${admission.lastName}`.trim();
}

export function AdminOfficerDashboard({ tenantId, displayName }: AdminOfficerDashboardProps) {
  const admissionsQuery = useAdmissions(tenantId);
  const staffQuery = useStaffDirectory(tenantId);
  const studentsQuery = useStudents(tenantId);
  const yearsQuery = useAcademicYears(tenantId);

  const activeYear = useMemo(
    () => yearsQuery.data?.academicYears?.find((year) => year.status === 'active'),
    [yearsQuery.data],
  );
  const termsQuery = useAcademicTerms(tenantId, activeYear?.id ?? '');
  const openTerm = useMemo(
    () => termsQuery.data?.terms?.find((term) => term.status === 'open'),
    [termsQuery.data],
  );

  const admissions = admissionsQuery.data?.admissions ?? [];
  const staff = staffQuery.data?.staff ?? [];
  const students = studentsQuery.data?.students ?? [];

  const pendingAdmissions = useMemo(
    () =>
      [...admissions]
        .filter((admission) => admission.status === 'pending')
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [admissions],
  );

  const pendingStaff = useMemo(
    () =>
      staff
        .filter((member) => member.status === 'pending')
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [staff],
  );

  const expiredInvites = pendingStaff.filter((member) => member.pendingInvitation?.isExpired).length;

  const isLoading =
    admissionsQuery.isLoading ||
    staffQuery.isLoading ||
    studentsQuery.isLoading ||
    yearsQuery.isLoading ||
    termsQuery.isLoading;

  const activeStaffCount = staff.filter((member) => member.status === 'active').length;
  const termLabel = openTerm?.name ?? 'No open term';
  const firstName = displayName?.split(' ')[0];
  const actionCount = pendingAdmissions.length + pendingStaff.length;

  const stats = [
    {
      label: 'Pending admissions',
      value: isLoading ? '—' : String(pendingAdmissions.length),
      hint: pendingAdmissions.length > 0 ? 'Awaiting principal review' : 'Pipeline clear',
      icon: UserPlus,
      gradient: SURFACES.kpi.g1,
      tone: pendingAdmissions.length > 0 ? 'warn' : 'ok',
    },
    {
      label: 'Staff invitations',
      value: isLoading ? '—' : String(pendingStaff.length),
      hint:
        expiredInvites > 0
          ? `${expiredInvites} expired — resend needed`
          : pendingStaff.length > 0
            ? 'Setup not completed'
            : 'All staff active',
      icon: Users,
      gradient: SURFACES.kpi.g2,
      tone: expiredInvites > 0 ? 'warn' : pendingStaff.length > 0 ? 'neutral' : 'ok',
    },
    {
      label: 'Enrolled students',
      value: isLoading ? '—' : students.length.toLocaleString(),
      hint: 'Active registry',
      icon: GraduationCap,
      gradient: SURFACES.kpi.g3,
      tone: 'ok',
    },
    {
      label: 'Active staff',
      value: isLoading ? '—' : activeStaffCount.toLocaleString(),
      hint: 'On payroll & roster',
      icon: Link2,
      gradient: SURFACES.kpi.g4,
      tone: 'ok',
    },
  ] as const;

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
          <p className={ACADEMIC_UI.sectionLabel}>Admin Officer</p>
          <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
            {firstName ? `${greeting()}, ${firstName}` : 'Registry desk'}
          </h1>
          <p className={ACADEMIC_UI.pageDesc}>
            Admissions, student registry, and staff onboarding for{' '}
            <span className="font-semibold text-foreground">{termLabel}</span>. You register
            applicants and invite staff — principals approve admissions and confirm promotions.
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
              {actionCount > 0 ? `${actionCount} item(s) need attention` : 'Registry up to date'}
            </span>
            <span className="hero-pill">{termLabel}</span>
          </div>

          <div className="relative z-10 -mb-24 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="card rounded-xl p-4 sm:p-5">
                  <span
                    className="mb-3 flex size-8 items-center justify-center rounded-xl text-white shadow-sm sm:size-9"
                    style={{ background: stat.gradient }}
                  >
                    <Icon aria-hidden className="size-3.5 sm:size-4" />
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {stat.label}
                  </p>
                  <p
                    className="mt-1 tabular-nums leading-none text-foreground"
                    style={{
                      fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-muted-foreground">{stat.hint}</p>
                </div>
              );
            })}
          </div>
        </div>
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
                <p className="mt-0.5 text-[12px] leading-snug text-neutral-500">{action.description}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                Admissions queue
              </p>
              <p className="mt-0.5 text-[15px] font-bold text-neutral-900">Pending principal review</p>
            </div>
            <Link
              href="/school/students/admissions"
              className="flex items-center gap-1 text-[12px] font-bold text-brand-700 hover:underline"
            >
              Pipeline
              <ArrowUpRight aria-hidden className="size-3.5" />
            </Link>
          </div>
          {pendingAdmissions.length === 0 ? (
            <p className="px-5 py-8 text-[13px] text-neutral-500">
              No applications waiting. Register a new applicant when a family enquires.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {pendingAdmissions.slice(0, 6).map((admission) => (
                <li key={admission.id}>
                  <Link
                    href="/school/students/admissions"
                    className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-neutral-50/80"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-neutral-900">
                        {applicantName(admission)}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        Ref {admission.referenceNumber} · submitted{' '}
                        {formatDistanceToNow(new Date(admission.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold-800">
                      Pending
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                Staff onboarding
              </p>
              <p className="mt-0.5 text-[15px] font-bold text-neutral-900">Pending invitations</p>
            </div>
            <Link
              href="/school/staff"
              className="flex items-center gap-1 text-[12px] font-bold text-brand-700 hover:underline"
            >
              Directory
              <ArrowUpRight aria-hidden className="size-3.5" />
            </Link>
          </div>
          {pendingStaff.length === 0 ? (
            <p className="px-5 py-8 text-[13px] text-neutral-500">
              Every staff account is active. Invite teachers and admin staff from the directory.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {pendingStaff.slice(0, 6).map((member) => {
                const expired = member.pendingInvitation?.isExpired;
                return (
                  <li key={member.id}>
                    <Link
                      href={`/school/staff/${member.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-neutral-50/80"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-neutral-900">
                          {member.fullName}
                        </p>
                        <p className="truncate text-[11px] text-neutral-500">{member.email}</p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          expired
                            ? 'bg-red-50 text-red-700'
                            : 'bg-neutral-100 text-neutral-600',
                        )}
                      >
                        {expired ? 'Expired' : 'Pending'}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
