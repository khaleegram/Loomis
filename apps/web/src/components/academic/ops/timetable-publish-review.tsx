'use client';

import type {
  TimetablePublishPreviewEntry,
  TimetablePublishPreviewResponse,
} from '@loomis/contracts';
import { cn } from '@loomis/ui-web';
import { ArrowLeft, ArrowRight, CheckCircle2, Minus, Plus, Send, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatSubjectLabel } from '@/lib/academic/ops-labels';
import { SURFACES } from '@/lib/design/surfaces';
import { formatTimeRange, weekdayLabel } from '@/lib/timetable/timetable-utils';

function PreviewRow({
  entry,
  tone,
}: {
  entry: TimetablePublishPreviewEntry;
  tone: 'add' | 'remove';
}) {
  const isAdd = tone === 'add';
  return (
    <div
      className={cn(
        'rounded-xl border px-3.5 py-3',
        isAdd ? 'border-emerald-200/80 bg-emerald-50/40' : 'border-red-200/70 bg-red-50/40',
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
            isAdd ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white',
          )}
        >
          {isAdd ? <Plus aria-hidden className="size-3.5" /> : <Minus aria-hidden className="size-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
            {entry.classArmLabel}
          </p>
          <p className="mt-0.5 text-[14px] font-bold text-neutral-900">
            {formatSubjectLabel(entry.subjectId)}
          </p>
          <p className="mt-1 text-[12px] font-medium text-neutral-600">
            {weekdayLabel(entry.dayOfWeek)} · {formatTimeRange(entry.startMinute, entry.endMinute)}
            {entry.teacherName ? ` · ${entry.teacherName}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

interface TimetablePublishReviewProps {
  preview: TimetablePublishPreviewResponse;
  yearLabel: string | null;
  canPublish: boolean;
  isPublishing: boolean;
  onPublish: () => void;
  error: string | null;
  published: boolean;
}

export function TimetablePublishReview({
  preview,
  yearLabel,
  canPublish,
  isPublishing,
  onPublish,
  error,
  published,
}: TimetablePublishReviewProps) {
  const additionCount = preview.additions.length;
  const removalCount = preview.removals.length;
  const changeCount = preview.changes.length;
  const publishDisabled = !canPublish || isPublishing || preview.totalPending === 0 || published;

  return (
    <div className="space-y-6">
      <Link
        href="/school/timetable"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to timetable
      </Link>

      <section className="overflow-hidden hero-panel rounded-2xl">
        <div className="px-5 py-6 sm:px-8" style={{ background: SURFACES.hero }}>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Sparkles aria-hidden className="size-4" />
            </span>
            <div>
              <p className={ACADEMIC_UI.sectionLabel}>Pending changes</p>
              <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
                Review before publish
              </h1>
            </div>
          </div>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-neutral-500">
            Only draft edits for {preview.termName}
            {yearLabel ? ` · ${yearLabel}` : ''}. Nothing already live is listed unless it will be
            removed or replaced.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-200/60 bg-white/85 p-4 shadow-sm">
              <p className={ACADEMIC_UI.sectionLabel}>Adding</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-emerald-800">
                {additionCount + changeCount}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-neutral-500">new lessons going live</p>
            </div>
            <div className="rounded-xl border border-red-200/60 bg-white/85 p-4 shadow-sm">
              <p className={ACADEMIC_UI.sectionLabel}>Removing</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-red-700">
                {removalCount + changeCount}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-neutral-500">lessons coming off</p>
            </div>
            <div className="rounded-xl border border-brand-200/60 bg-white/85 p-4 shadow-sm">
              <p className={ACADEMIC_UI.sectionLabel}>Replacing</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-brand-800">{changeCount}</p>
              <p className="mt-0.5 text-[11px] font-medium text-neutral-500">slot swaps</p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-8">
          {preview.totalPending === 0 && !published ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 px-6 py-12 text-center">
              <p className="text-[15px] font-bold text-neutral-800">No pending changes</p>
              <p className="mt-1 text-[13px] text-neutral-500">
                Add or edit lessons in the builder — they will show up here before you publish.
              </p>
              <Link
                href="/school/timetable"
                className="mt-4 inline-flex text-[13px] font-semibold text-brand-700 hover:underline"
              >
                Back to timetable builder
              </Link>
            </div>
          ) : null}

          {preview.changes.length > 0 ? (
            <section className="mb-6">
              <h2 className="mb-3 text-[13px] font-extrabold text-neutral-900">Replacements</h2>
              <div className="space-y-3">
                {preview.changes.map((change) => (
                  <div
                    key={`${change.removed.entryId}-${change.added.entryId}`}
                    className="rounded-2xl border border-brand-100/60 bg-white p-3 shadow-sm"
                  >
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
                      {change.classArmLabel} · {weekdayLabel(change.dayOfWeek)} ·{' '}
                      {formatTimeRange(change.startMinute, change.endMinute)}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                      <PreviewRow entry={change.removed} tone="remove" />
                      <ArrowRight aria-hidden className="mx-auto hidden size-4 text-neutral-300 sm:block" />
                      <PreviewRow entry={change.added} tone="add" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {preview.additions.length > 0 ? (
            <section className="mb-6">
              <h2 className="mb-3 text-[13px] font-extrabold text-neutral-900">New lessons</h2>
              <div className="space-y-2">
                {preview.additions.map((entry) => (
                  <PreviewRow key={entry.entryId} entry={entry} tone="add" />
                ))}
              </div>
            </section>
          ) : null}

          {preview.removals.length > 0 ? (
            <section className="mb-6">
              <h2 className="mb-3 text-[13px] font-extrabold text-neutral-900">Removals</h2>
              <div className="space-y-2">
                {preview.removals.map((entry) => (
                  <PreviewRow key={entry.entryId} entry={entry} tone="remove" />
                ))}
              </div>
            </section>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-800">
              {error}
            </p>
          ) : null}

          {published ? (
            <div className="mt-4 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
              <CheckCircle2 aria-hidden className="size-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-[13px] font-bold text-emerald-900">Changes published</p>
                <p className="mt-1 text-[12px] text-emerald-800">
                  Pending additions, removals, and replacements are now live.
                </p>
                <Link
                  href="/school/timetable"
                  className="mt-2 inline-flex text-[12px] font-semibold text-brand-700 hover:underline"
                >
                  Return to timetable builder
                </Link>
              </div>
            </div>
          ) : null}

          {preview.totalPending > 0 ? (
            <div className="mt-6 flex flex-col gap-3 border-t border-neutral-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-md text-[12px] leading-relaxed text-neutral-500">
                Confirming applies {preview.totalPending} pending change
                {preview.totalPending === 1 ? '' : 's'} across the term. Live timetables update
                immediately for the whole school.
              </p>
              <button
                type="button"
                className={cn(ACADEMIC_UI.btnPrimary, 'min-h-[44px] shrink-0 sm:px-6')}
                disabled={publishDisabled}
                onClick={onPublish}
              >
                <Send aria-hidden className="size-4" />
                {isPublishing ? 'Publishing…' : 'Confirm & publish'}
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
