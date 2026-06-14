'use client';

import type { ChildPublishedResultsResponse } from '@loomis/contracts';
import { Badge, Skeleton } from '@loomis/ui-web';
import { BookOpen } from 'lucide-react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatSubjectLabel } from '@/lib/academic/ops-labels';
import { SEMANTIC } from '@/lib/design/surfaces';

interface ChildResultsViewProps {
  title: string;
  subtitle: string;
  data: ChildPublishedResultsResponse | undefined;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

function gradeBadgeVariant(score: number): 'success' | 'warning' | 'destructive' {
  if (score >= 70) return 'success';
  if (score >= 50) return 'warning';
  return 'destructive';
}

export function ChildResultsView({
  title,
  subtitle,
  data,
  isLoading,
  isError,
  errorMessage,
}: ChildResultsViewProps) {
  if (isLoading) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  if (isError) {
    return (
      <div className={`${ACADEMIC_UI.dataPanel} p-6`}>
        <p className={`text-[13px] ${SEMANTIC.danger.error}`}>{errorMessage ?? 'Could not load results.'}</p>
      </div>
    );
  }

  if (!data?.published) {
    return (
      <div className={`${ACADEMIC_UI.dataPanel} p-8 text-center`}>
        <BookOpen aria-hidden className="mx-auto mb-3 size-8 text-neutral-300" />
        <p className="text-[15px] font-semibold text-neutral-800">Results not published yet</p>
        <p className="mt-2 text-[13px] text-neutral-500">
          {data?.termName ? `${data.termName} results` : 'Term results'} will appear here once the exam
          officer publishes them.
        </p>
      </div>
    );
  }

  const subjects = data.subjects ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {data.termName ? (
          <Badge variant="gold">{data.termName}</Badge>
        ) : null}
        {data.classArmLabel ? <Badge variant="outline">{data.classArmLabel}</Badge> : null}
        <Badge variant="success">Published</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={ACADEMIC_UI.dataPanel}>
          <div className={`border-b px-5 py-4 ${ACADEMIC_UI.tableHeader}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-800/70">
              {title}
            </p>
            <p className="mt-1 text-[12px] text-neutral-500">{subtitle}</p>
          </div>
          <div className="divide-y divide-brand-50">
            {subjects.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-neutral-400">
                Published summary only — no subject breakdown available.
              </p>
            ) : (
              subjects.map((subject) => (
                <div key={subject.subjectId} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-neutral-900">
                      {formatSubjectLabel(subject.subjectId)}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      CA {subject.continuousAssessmentScore} · Exam {subject.examScore}
                      {subject.remark ? ` · ${subject.remark}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[14px] font-bold tabular-nums text-neutral-900">
                      {subject.totalScore}%
                    </p>
                    <Badge variant={gradeBadgeVariant(subject.totalScore)}>{subject.grade}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`${ACADEMIC_UI.dataPanel} p-5`}>
          <p className={ACADEMIC_UI.sectionLabel}>Term summary</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-brand-50/40 p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Average</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-neutral-900">
                {data.averageScore ?? '—'}%
              </p>
            </div>
            <div className="rounded-xl bg-brand-50/40 p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Subjects</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-neutral-900">{subjects.length}</p>
            </div>
          </div>
          {data.publishedAt ? (
            <p className="mt-4 text-[11px] text-neutral-500">
              Published {new Date(data.publishedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
