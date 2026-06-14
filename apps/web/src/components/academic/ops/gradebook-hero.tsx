'use client';

import { cn } from '@loomis/ui-web';
import {
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Lock,
  Sparkles,
  Users,
} from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import {
  computeGradebookProgress,
  gradebookCompletionPercent,
  isGradebookFullyLocked,
} from '@/lib/academic/gradebook-labels';
import type { GradebookEntryResponse } from '@loomis/contracts';
import { SURFACES } from '@/lib/design/surfaces';

interface GradebookHeroProps {
  variant: 'teacher' | 'classTeacher';
  classLabel: string | null;
  termLabel: string | null;
  subjectLabel?: string | null;
  rosterCount: number;
  entries: GradebookEntryResponse[];
  isLoading?: boolean;
  onLock?: () => void;
  isLocking?: boolean;
  canLock?: boolean;
}

export function GradebookHero({
  variant,
  classLabel,
  termLabel,
  subjectLabel,
  rosterCount,
  entries,
  isLoading,
  onLock,
  isLocking,
  canLock,
}: GradebookHeroProps) {
  const progress = computeGradebookProgress(entries, rosterCount);
  const percent = gradebookCompletionPercent(progress);
  const fullyLocked = isGradebookFullyLocked(progress);

  const stats =
    variant === 'classTeacher'
      ? [
          {
            label: 'Students',
            value: isLoading ? '—' : String(progress.total),
            hint: 'Enrolled this term',
            icon: Users,
            gradient: SURFACES.kpi.g3,
          },
          {
            label: 'Subjects tracked',
            value: isLoading ? '—' : String(new Set(entries.map((e) => e.subjectId)).size),
            hint: 'With gradebook data',
            icon: BookOpenCheck,
            gradient: SURFACES.kpi.g1,
          },
          {
            label: 'Incomplete cells',
            value: isLoading ? '—' : String(progress.incomplete),
            hint: 'Missing or draft scores',
            icon: ClipboardList,
            gradient: SURFACES.kpi.g4,
          },
          {
            label: 'Locked entries',
            value: isLoading ? '—' : String(progress.locked),
            hint: 'Submitted by teachers',
            icon: Lock,
            gradient: SURFACES.kpi.g2,
          },
        ]
      : [
          {
            label: 'Completion',
            value: isLoading ? '—' : `${percent}%`,
            hint: `${progress.complete}/${progress.total} students scored`,
            icon: Sparkles,
            gradient: SURFACES.kpi.g1,
          },
          {
            label: 'Scored',
            value: isLoading ? '—' : String(progress.complete),
            hint: 'CA + exam entered',
            icon: CheckCircle2,
            gradient: SURFACES.kpi.g2,
          },
          {
            label: 'Remaining',
            value: isLoading ? '—' : String(progress.incomplete),
            hint: 'Still need scores',
            icon: Users,
            gradient: SURFACES.kpi.g4,
          },
          {
            label: 'Status',
            value: isLoading ? '—' : fullyLocked ? 'Locked' : 'Open',
            hint: fullyLocked ? 'Ready for publish' : 'Entry in progress',
            icon: Lock,
            gradient: SURFACES.kpi.g3,
          },
        ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
      <div
        className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8 lg:pt-10"
        style={{ background: SURFACES.hero }}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-brand-400/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className={ACADEMIC_UI.sectionLabel}>
              {variant === 'classTeacher' ? 'Class teacher · consolidated view' : 'Teacher · score entry'}
            </p>
            <h1 className="text-neutral-900" style={ACADEMIC_PAGE_TITLE_STYLE}>
              {variant === 'classTeacher' ? 'Class gradebook' : 'Gradebook'}
            </h1>
            <p className={ACADEMIC_UI.pageDesc}>
              {variant === 'classTeacher'
                ? 'Read-only matrix of every subject for your class. Incomplete cells are highlighted for follow-up.'
                : 'Enter CA and exam scores for your assigned subject. Lock when every student is complete.'}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {classLabel ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200/60 bg-white/85 px-3 py-1 text-[11px] font-semibold text-brand-800 shadow-sm">
                  <ClipboardList aria-hidden className="size-3.5" />
                  {classLabel}
                </span>
              ) : null}
              {subjectLabel ? (
                <span className="rounded-full border border-neutral-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-neutral-700">
                  {subjectLabel}
                </span>
              ) : null}
              {termLabel ? (
                <span className="rounded-full border border-neutral-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold text-neutral-600">
                  {termLabel}
                </span>
              ) : null}
              {fullyLocked ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-accent-green-200 bg-accent-green-50 px-3 py-1 text-[11px] font-bold text-accent-green-700">
                  <Lock aria-hidden className="size-3.5" />
                  Locked
                </span>
              ) : progress.pendingCorrection > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800">
                  {progress.pendingCorrection} correction pending
                </span>
              ) : null}
            </div>
          </div>

          {variant === 'teacher' && canLock && onLock && !fullyLocked && progress.complete === progress.total && progress.total > 0 ? (
            <div className="flex w-full shrink-0 lg:w-auto">
              <button
                type="button"
                className={ACADEMIC_UI.btnPrimary}
                disabled={isLocking}
                onClick={onLock}
              >
                <Lock aria-hidden className="size-4" />
                {isLocking ? 'Locking…' : 'Lock gradebook'}
              </button>
            </div>
          ) : null}
        </div>

        <div className="relative z-10 -mb-24 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="card overflow-hidden rounded-xl p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
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
                    fontSize: 'clamp(1.375rem, 2vw, 1.75rem)',
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

      {variant === 'teacher' && progress.total > 0 ? (
        <div className="border-t border-brand-50 bg-white px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={ACADEMIC_UI.sectionLabel}>Entry progress</p>
            <div className="flex flex-1 items-center gap-3 sm:max-w-md">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    percent >= 100 ? 'bg-accent-green-500' : percent >= 50 ? 'bg-brand-500' : 'bg-amber-500',
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-[13px] font-bold tabular-nums text-neutral-800">{percent}%</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
