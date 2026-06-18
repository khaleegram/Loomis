'use client';

import { Award, BookOpen, CheckCircle2, Clock } from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';

interface ParentResultsHeroProps {
  title: string;
  description: string;
  studentName: string | null;
  schoolName: string | null;
  classLabel: string | null;
  termLabel: string | null;
  averageScore: number | null;
  subjectCount: number;
  published: boolean;
  isLoading?: boolean;
}

export function ParentResultsHero({
  title,
  description,
  studentName,
  schoolName,
  classLabel,
  termLabel,
  averageScore,
  subjectCount,
  published,
  isLoading,
}: ParentResultsHeroProps) {
  const stats = [
    {
      label: 'Term average',
      value: isLoading ? '—' : averageScore != null ? `${averageScore}%` : '—',
      hint: published ? 'Published average' : 'Awaiting publish',
      icon: Award,
      gradient: SURFACES.kpi.g1,
    },
    {
      label: 'Subjects',
      value: isLoading ? '—' : String(subjectCount),
      hint: subjectCount === 1 ? 'Scored subject' : 'Scored subjects',
      icon: BookOpen,
      gradient: SURFACES.kpi.g3,
    },
    {
      label: 'Status',
      value: isLoading ? '—' : published ? 'Published' : 'Pending',
      hint: published ? 'Visible on portal' : 'Exam officer has not published',
      icon: published ? CheckCircle2 : Clock,
      gradient: published ? SURFACES.kpi.g2 : SURFACES.kpi.g4,
    },
    {
      label: 'Portal',
      value: 'Results',
      hint: 'Term report card',
      icon: Award,
      gradient: SURFACES.kpi.g1,
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
      <div
        className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8 lg:pt-10"
        style={{ background: SURFACES.hero }}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-400/10 blur-3xl" aria-hidden />

        <div className="relative min-w-0">
          <p className={ACADEMIC_UI.sectionLabel}>Family portal · report cards</p>
          <h1 className="text-neutral-900" style={ACADEMIC_PAGE_TITLE_STYLE}>
            {title}
          </h1>
          <p className={ACADEMIC_UI.pageDesc}>{description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {studentName ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200/60 bg-white/85 px-3 py-1 text-[11px] font-semibold text-brand-800 shadow-sm">
                {studentName}
              </span>
            ) : null}
            {schoolName ? (
              <span className="rounded-full border border-neutral-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-neutral-600">
                {schoolName}
              </span>
            ) : null}
            {classLabel ? (
              <span className="rounded-full border border-neutral-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-neutral-600">
                {classLabel}
              </span>
            ) : null}
            {termLabel ? (
              <span className="rounded-full border border-neutral-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-neutral-600">
                {termLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="relative z-10 -mb-24 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="card overflow-hidden rounded-xl p-4 sm:p-5">
                <div className="mb-3">
                  <span
                    className="flex size-8 items-center justify-center rounded-xl text-white shadow-sm sm:size-9"
                    style={{ background: stat.gradient }}
                  >
                    <Icon aria-hidden className="size-3.5 sm:size-4" />
                  </span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">{stat.label}</p>
                <p
                  className="mt-1 tabular-nums leading-none text-neutral-900"
                  style={{
                    fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] font-medium text-neutral-500">{stat.hint}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
