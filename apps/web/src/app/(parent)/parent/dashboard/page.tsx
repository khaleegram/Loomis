'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParentDashboard } from '@loomis/api-client';
import type { ParentChildCardResponse } from '@loomis/contracts';
import {
  ArrowUpRight,
  BookOpen,
  Calendar,
  GraduationCap,
  Users,
  MessageSquare,
  Wallet,
} from 'lucide-react';
import { Skeleton } from '@loomis/ui-web';

import {
  BRONZE,
  DashboardBottomCard,
  DashboardFilterMenu,
  DashboardHeader,
  DashboardStatStrip,
  DashboardToolbar,
} from '@/components/dashboard/dashboard-primitives';
import { PageBody } from '@/components/parent/parent-shell';
import { useAuth } from '@/lib/auth/auth-context';

function attendancePercent(card: ParentChildCardResponse): number | null {
  const { presentCount, totalCount } = card.attendanceSummary;
  if (totalCount <= 0) return null;
  return Math.round((presentCount / totalCount) * 100);
}

function resultLabel(card: ParentChildCardResponse): string {
  const score = card.latestResultSummary?.averageScore;
  if (score == null) return '—';
  return `${score.toFixed(0)}% avg`;
}

const TERM_OPTIONS = [
  { value: 'this-term', label: 'This Term' },
  { value: 'last-term', label: 'Last Term' },
  { value: 'ytd', label: 'YTD' },
] as const;

export default function ParentDashboardPage() {
  const { session } = useAuth();
  const isStudent = session?.role === 'student';
  const { data, isLoading } = useParentDashboard();
  const [selectedTerm, setSelectedTerm] = useState<string>('this-term');
  const [selectedPeriod, setSelectedPeriod] = useState('This Term');

  const cards = data?.cards ?? [];
  const roleLabel = isStudent ? 'Student' : 'Parent';
  const consoleLabel = isStudent ? 'Student Portal' : 'Family Portal';

  const avgAttendance = useMemo(() => {
    const rates = cards.map(attendancePercent).filter((value): value is number => value != null);
    if (rates.length === 0) return null;
    return Math.round(rates.reduce((sum, value) => sum + value, 0) / rates.length);
  }, [cards]);

  const totalOutstanding = useMemo(
    () => cards.reduce((sum, card) => sum + card.outstandingBalanceMinor, 0),
    [cards],
  );

  const publishedResults = cards.filter((card) => card.latestResultSummary?.averageScore != null).length;

  const totalUnreadMessages = useMemo(
    () => cards.reduce((sum, card) => sum + (card.unreadMessageCount ?? 0), 0),
    [cards],
  );

  const fmtNaira = (minor: number) => `₦${(minor / 100).toLocaleString()}`;

  return (
    <PageBody className="max-w-[1200px] px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
      <DashboardHeader
        consoleLabel={consoleLabel}
        roleLabel={roleLabel}
        userName={session?.displayName}
        description={
          isStudent
            ? 'Your academic overview, attendance, and results — live.'
            : 'All your linked children across schools — live.'
        }
      />

      <DashboardToolbar
        selectedPeriod={selectedPeriod}
        onPeriodChange={(period) => {
          setSelectedPeriod(period);
          const match = TERM_OPTIONS.find((option) => option.label === period);
          if (match) setSelectedTerm(match.value);
        }}
        actions={
          <DashboardFilterMenu
            value={selectedTerm}
            onValueChange={(value) => {
              if (!value) return;
              setSelectedTerm(value);
              const match = TERM_OPTIONS.find((option) => option.value === value);
              if (match) setSelectedPeriod(match.label);
            }}
            options={TERM_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            placeholder="This Term"
            searchPlaceholder="Search terms…"
          />
        }
      />

      <DashboardStatStrip
        items={[
          {
            label: isStudent ? 'Profile' : 'Children',
            value: isLoading ? '—' : cards.length.toLocaleString(),
            sub: isStudent ? 'Your account' : 'Linked accounts',
            icon: Users,
            color: BRONZE.gradients.g1,
          },
          {
            label: 'Attendance',
            value: avgAttendance != null ? `${avgAttendance}%` : isLoading ? '—' : '—',
            sub: 'Average this term',
            subColor: avgAttendance != null && avgAttendance >= 75 ? '#16a34a' : '#9ca3af',
            icon: Calendar,
            color: BRONZE.gradients.g2,
          },
          {
            label: 'Outstanding',
            value: isLoading ? '—' : totalOutstanding > 0 ? fmtNaira(totalOutstanding) : 'None',
            sub: 'Fees due',
            subColor: totalOutstanding > 0 ? '#f59e0b' : '#16a34a',
            icon: Wallet,
            color: BRONZE.gradients.g3,
          },
          {
            label: 'Results',
            value: isLoading ? '—' : String(publishedResults),
            sub: 'Published summaries',
            icon: BookOpen,
            color: BRONZE.gradients.g4,
          },
          ...(!isStudent
            ? [
                {
                  label: 'Inbox',
                  value: isLoading ? '—' : String(totalUnreadMessages),
                  sub: totalUnreadMessages > 0 ? 'Unread messages' : 'All read',
                  subColor: totalUnreadMessages > 0 ? '#f59e0b' : '#16a34a',
                  icon: MessageSquare,
                  color: 'linear-gradient(135deg,#6366F1,#4338CA)',
                },
              ]
            : []),
        ]}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="card flex flex-col items-center justify-center rounded-2xl py-16">
          <GraduationCap aria-hidden className="mb-3 size-10 text-neutral-300" />
          <p className="text-sm font-semibold text-neutral-700">No linked children yet</p>
          <p className="mt-1 text-xs text-neutral-400">Ask your school administrator to link your account.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const attendance = attendancePercent(card);
            return (
              <div key={card.id} className="card group flex flex-col rounded-2xl p-5 transition">
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className="flex size-9 items-center justify-center rounded-xl text-white"
                    style={{ background: BRONZE.gradients.card }}
                  >
                    <GraduationCap aria-hidden className="size-4" />
                  </span>
                  <ArrowUpRight aria-hidden className="size-3.5 text-neutral-300 transition group-hover:text-neutral-600" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">{card.schoolName}</p>
                <p
                  className="mt-1 text-neutral-900"
                  style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.025em' }}
                >
                  {card.studentFirstName}
                </p>
                <p className="mt-0.5 text-[11px] text-neutral-400">{card.classArmLabel ?? 'Class not set'}</p>

                <div className="mt-4 space-y-2 border-t border-neutral-100 pt-4 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Attendance</span>
                    <span className="font-semibold text-neutral-800">
                      {attendance != null ? `${attendance}%` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Latest Result</span>
                    <span className="font-semibold text-neutral-800">{resultLabel(card)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Outstanding</span>
                    <span className={`font-semibold ${card.outstandingBalanceMinor ? 'text-orange-500' : 'text-emerald-600'}`}>
                      {card.outstandingBalanceMinor ? fmtNaira(card.outstandingBalanceMinor) : 'None'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link
                    href="/parent/attendance"
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[11px] font-semibold text-neutral-600 hover:border-neutral-300"
                  >
                    <Calendar aria-hidden className="size-3" />
                    Attendance
                  </Link>
                  <Link
                    href="/parent/results"
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[11px] font-semibold text-neutral-600 hover:border-neutral-300"
                  >
                    <BookOpen aria-hidden className="size-3" />
                    Results
                  </Link>
                  {!isStudent ? (
                    <Link
                      href="/parent/messages"
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[11px] font-semibold text-neutral-600 hover:border-neutral-300"
                    >
                      <MessageSquare aria-hidden className="size-3" />
                      Inbox
                    </Link>
                  ) : null}
                  {!isStudent ? (
                    <Link
                      href="/parent/fees"
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[11px] font-semibold text-neutral-600 hover:border-neutral-300"
                    >
                      <Wallet aria-hidden className="size-3" />
                      Fees
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && cards.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardBottomCard
            href="/parent/attendance"
            icon={Calendar}
            gradient={BRONZE.gradients.card}
            label="Attendance"
            value={avgAttendance != null ? `${avgAttendance}%` : '—'}
            sub="Average across linked children"
          />
          <DashboardBottomCard
            href="/parent/results"
            icon={BookOpen}
            gradient="linear-gradient(135deg,#F43F5E,#BE123C)"
            label="Results"
            value={String(publishedResults)}
            sub="Published this term"
          />
          {!isStudent ? (
            <DashboardBottomCard
              href="/parent/messages"
              icon={MessageSquare}
              gradient="linear-gradient(135deg,#6366F1,#4338CA)"
              label="Inbox"
              value={String(totalUnreadMessages)}
              sub={totalUnreadMessages > 0 ? 'Unread school messages' : 'All caught up'}
            />
          ) : null}
          {!isStudent ? (
            <DashboardBottomCard
              href="/parent/fees"
              icon={Wallet}
              gradient="linear-gradient(135deg,#14B8A6,#0F766E)"
              label="Outstanding Fees"
              value={totalOutstanding > 0 ? fmtNaira(totalOutstanding) : 'None'}
              sub={totalOutstanding > 0 ? 'Requires payment' : 'All settled'}
            />
          ) : (
            <DashboardBottomCard
              href="/parent/results"
              icon={GraduationCap}
              gradient="linear-gradient(135deg,#14B8A6,#0F766E)"
              label="Your Profile"
              value={cards[0]?.classArmLabel ?? '—'}
              sub="Current class"
            />
          )}
        </div>
      ) : null}
    </PageBody>
  );
}
