'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Lock,
  Settings2,
  Users,
} from 'lucide-react';

import { BRONZE } from '@/components/dashboard/dashboard-primitives';
import type { AcademicHubMetrics } from '@/lib/academic/academic-metrics';

interface WorkflowCard {
  id: string;
  title: string;
  story: string;
  description: string;
  href: string;
  icon: LucideIcon;
  gradient: string;
  status: string;
}

interface AcademicWorkflowCardsProps {
  metrics: AcademicHubMetrics;
  censusLockHref?: string | null;
  yearId?: string | null;
  termId?: string | null;
}

export function AcademicWorkflowCards({
  metrics,
  censusLockHref,
  yearId,
  termId,
}: AcademicWorkflowCardsProps) {
  const cards: WorkflowCard[] = [
    {
      id: 'sessions',
      title: 'Session lifecycle',
      story: 'Years & terms',
      description: 'Create years, configure terms, open enrollment, close when gates pass.',
      href: '/school/academic/sessions',
      icon: Settings2,
      gradient: BRONZE.gradients.g1,
      status:
        metrics.termStatus === 'open'
          ? `${metrics.openTermName ?? 'Term'} is open`
          : metrics.termStatus === 'census_locked'
            ? 'Fee recorded'
            : metrics.termStatus === 'closed'
              ? 'Term closed'
              : 'Configure draft term',
    },
    {
      id: 'platform-fee',
      title: 'Platform fee',
      story: 'Loomis billing',
      description: 'See enrolled student count and platform fee for this term — billed automatically.',
      href: '/school/finance/platform-fee',
      icon: Lock,
      gradient: BRONZE.gradients.g2,
      status:
        metrics.termStatus === 'open'
          ? 'Auto on billing date'
          : metrics.termStatus === 'census_locked'
            ? 'Recorded'
            : metrics.termStatus === 'closed'
              ? 'Term closed'
              : 'Open a term first',
    },
    {
      id: 'calendar',
      title: 'Academic calendar',
      story: 'Key dates',
      description: 'Enrollment windows, exams, and billing dates for the current term.',
      href: '/school/academic/calendar',
      icon: CalendarDays,
      gradient: BRONZE.gradients.g3,
      status: metrics.openTermName ?? 'No term selected',
    },
    {
      id: 'promotions',
      title: 'Year-end promotions',
      story: 'Class progression',
      description: 'Review staged lists, held-back overrides, and confirm promotions.',
      href: '/school/academic/promotions',
      icon: Users,
      gradient: BRONZE.gradients.g4,
      status:
        metrics.stagedPromotions > 0
          ? `${metrics.stagedPromotions} awaiting review`
          : metrics.confirmedPromotions > 0
            ? `${metrics.confirmedPromotions} confirmed`
            : 'Not staged',
    },
    {
      id: 'graduation',
      title: 'Final-year graduation',
      story: 'Terminal cohort',
      description: 'Confirm graduates and generate leaving certificates.',
      href: '/school/academic/graduation',
      icon: GraduationCap,
      gradient: BRONZE.gradients.card,
      status:
        metrics.graduatedCount > 0
          ? `${metrics.graduatedCount} record${metrics.graduatedCount === 1 ? '' : 's'}`
          : 'Review cohort',
    },
    {
      id: 'timetable',
      title: 'Timetable builder',
      story: 'Schedules',
      description: 'Assign subjects and teachers to periods for the open term.',
      href: '/school/timetable',
      icon: CheckCircle2,
      gradient: BRONZE.gradients.g2,
      status: 'Build schedules',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.id}
            href={card.href}
            className="card group flex flex-col rounded-2xl p-5 transition hover:-translate-y-0.5"
          >
            <div className="mb-3 flex items-center justify-between">
              <span
                className="flex size-9 items-center justify-center rounded-xl text-white"
                style={{ background: card.gradient }}
              >
                <Icon aria-hidden className="size-4" />
              </span>
              <ArrowUpRight
                aria-hidden
                className="size-3.5 text-neutral-300 transition group-hover:text-neutral-600"
              />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              {card.story}
            </p>
            <p
              className="mt-1 text-neutral-900"
              style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              {card.title}
            </p>
            <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-neutral-500">
              {card.description}
            </p>
            <p className="mt-3 text-[11px] font-semibold text-neutral-400">{card.status}</p>
          </Link>
        );
      })}
    </div>
  );
}
