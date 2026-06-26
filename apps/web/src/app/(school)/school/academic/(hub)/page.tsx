'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAcademicTerms, useAcademicYears, useClassLevels, usePromotions } from '@loomis/api-client';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  CalendarDays,
  GraduationCap,
  Layers,
  Settings2,
  Sparkles,
  Users,
} from 'lucide-react';
import { Skeleton, cn } from '@loomis/ui-web';

import { useCan, useCanAny } from '@/lib/auth/use-capability';
import { computeAcademicMetrics, pickOpenTerm } from '@/lib/academic/academic-metrics';
import {
  isAcademicSetupIncomplete,
  pickDraftYear,
  pickStrictActiveYear,
} from '@/lib/academic/academic-setup-utils';
import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

interface ActionCard {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  show: boolean;
  badge?: string;
}

export default function AcademicHubPage() {
  const tenantId = useTenantId();
  const canView = useCanAny([
    'academic_year.manage',
    'term.manage',
    'census.lock',
    'student.promote',
    'student.graduate',
  ]);
  const canManageYear = useCanAny(['academic_year.manage', 'term.manage']);
  const canStructure = useCan('class_structure.manage');
  const canSetupGuide = useCanAny(['academic_year.manage', 'class_structure.manage']);
  const canPromote = useCan('student.promote');
  const canGraduate = useCan('student.graduate');

  const yearsQuery = useAcademicYears(tenantId ?? '');
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYear = useMemo(() => pickStrictActiveYear(years), [years]);
  const draftYear = useMemo(() => pickDraftYear(years), [years]);

  const levelsQuery = useClassLevels(tenantId ?? '');
  const classLevelCount = levelsQuery.data?.levels.length ?? 0;

  const termsQuery = useAcademicTerms(tenantId ?? '', activeYear?.id ?? draftYear?.id ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const focusTerm = useMemo(() => pickOpenTerm(terms), [terms]);

  const promotionsQuery = usePromotions(tenantId ?? '', activeYear?.id ?? '');
  const promotions = promotionsQuery.data?.records ?? [];

  const metrics = useMemo(
    () => computeAcademicMetrics(years, terms, promotions),
    [years, terms, promotions],
  );

  const isLoading = yearsQuery.isLoading || termsQuery.isLoading || levelsQuery.isLoading;
  const setupIncomplete = isAcademicSetupIncomplete({
    years,
    terms,
    classLevelCount,
  });

  if (!tenantId) {
    return <p className="text-sm font-medium text-red-600">No tenant context. Sign in again.</p>;
  }

  if (!canView) {
    return (
      <p className="text-sm text-neutral-500">You do not have permission to view the academic area.</p>
    );
  }

  const cards: ActionCard[] = [
    {
      id: 'setup-guide',
      title: 'Setup guide',
      description: 'Whole year in one flow: terms, classes, arms, and calendar.',
      href: '/school/academic/setup',
      icon: Sparkles,
      show: canSetupGuide,
    },
    {
      id: 'sessions',
      title: 'School year',
      description: 'View terms, billing dates, and end-of-term actions.',
      href: '/school/academic/sessions',
      icon: Settings2,
      show: canManageYear,
    },
    {
      id: 'calendar',
      title: 'Calendar',
      description: 'Key dates staff, parents and students can see.',
      href: '/school/academic/calendar',
      icon: CalendarDays,
      show: true,
    },
    {
      id: 'structure',
      title: 'Classes',
      description: 'Edit class levels, arms, and progression after setup.',
      href: '/school/academic/structure',
      icon: Layers,
      show: canStructure,
    },
    {
      id: 'promotions',
      title: 'Promotions',
      description: 'Move students to the next class at year end.',
      href: '/school/academic/promotions',
      icon: Users,
      show: canPromote,
      badge: metrics.stagedPromotions > 0 ? `${metrics.stagedPromotions} to review` : undefined,
    },
    {
      id: 'graduation',
      title: 'Graduation',
      description: 'Graduate your final-year students.',
      href: '/school/academic/graduation',
      icon: GraduationCap,
      show: canGraduate,
    },
  ];

  const visibleCards = cards.filter((c) => c.show);

  return (
    <div className="space-y-6">
      <header>
        <p className={ACADEMIC_UI.sectionLabel}>Academic</p>
        <h1 className={ACADEMIC_UI.pageTitle} style={ACADEMIC_PAGE_TITLE_STYLE}>
          Academic
        </h1>
        <p className={ACADEMIC_UI.pageDesc}>
          Setup guide for your whole school year, then day-to-day tools here.
        </p>
      </header>

      {isLoading ? (
        <Skeleton className="h-28 w-full rounded-2xl" />
      ) : setupIncomplete && canSetupGuide ? (
        <div className="card flex flex-col items-start gap-3 rounded-2xl border border-brand-200/60 bg-brand-50/40 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[15px] font-bold text-neutral-900">Finish academic setup</p>
            <p className="mt-1 max-w-md text-[13px] text-neutral-500">
              {draftYear && !activeYear
                ? `${draftYear.label} needs its terms — then classes and calendar.`
                : !activeYear
                  ? 'Start your school year, pick classes, and add calendar events in one guided flow.'
                  : 'Pick your classes and finish calendar setup to go live.'}
            </p>
          </div>
          <Link
            href="/school/academic/setup"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#c9a96e] px-5 text-[14px] font-semibold text-neutral-900 shadow-sm transition hover:bg-[#b8956a]"
          >
            Open setup guide
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      ) : activeYear ? (
        <div className="card flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              Right now
            </p>
            <p className="mt-1 text-xl font-extrabold tracking-tight text-neutral-900">
              {metrics.activeYearLabel}
            </p>
            <p className="mt-0.5 text-[13px] text-neutral-500">
              {focusTerm
                ? `${focusTerm.name} is your working term`
                : 'No term running yet'}
            </p>
          </div>
          <Link
            href="/school/academic/sessions"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#c9a96e] px-5 text-[13px] font-semibold text-neutral-900 shadow-sm transition hover:bg-[#b8956a]"
          >
            Manage school year
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      ) : (
        <div className="card flex flex-col items-start gap-3 rounded-2xl p-6">
          <div>
            <p className="text-[15px] font-bold text-neutral-900">New school? Start here</p>
            <p className="mt-1 max-w-md text-[13px] text-neutral-500">
              The setup guide walks you through your school year, terms, classes, arms, and calendar
              in one flow — about five minutes.
            </p>
          </div>
          {canSetupGuide ? (
            <Link
              href="/school/academic/setup"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#c9a96e] px-5 text-[14px] font-semibold text-neutral-900 shadow-sm transition hover:bg-[#b8956a]"
            >
              Open setup guide
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          ) : null}
        </div>
      )}

      {metrics.stagedPromotions > 0 && canPromote ? (
        <Link
          href="/school/academic/promotions"
          className="flex items-center justify-between gap-3 rounded-2xl border border-gold-200 bg-gold-50/60 px-5 py-4 transition hover:bg-gold-50"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gold-100 text-gold-800">
              <Users aria-hidden className="size-4" />
            </span>
            <div>
              <p className="text-[13px] font-bold text-neutral-900">
                {metrics.stagedPromotions} promotion{metrics.stagedPromotions === 1 ? '' : 's'} need your sign-off
              </p>
              <p className="text-[12px] text-neutral-500">Review and confirm before the year ends.</p>
            </div>
          </div>
          <ArrowRight aria-hidden className="size-4 text-gold-700" />
        </Link>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.id}
              href={card.href}
              className={cn(
                'group card flex items-start gap-4 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
              )}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100/70 transition group-hover:bg-brand-100">
                <Icon aria-hidden className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[15px] font-bold text-neutral-900">{card.title}</p>
                  {card.badge ? (
                    <span className="shrink-0 rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold-800">
                      {card.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">{card.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
