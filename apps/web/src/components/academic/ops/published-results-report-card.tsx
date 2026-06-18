'use client';

import type { ChildPublishedResultsResponse } from '@loomis/contracts';
import { Award } from 'lucide-react';

import { SchoolLogo } from '@/components/shared/school-logo';
import { GRADEBOOK_UI } from '@/lib/academic/gradebook-ui';
import { formatSubjectLabel } from '@/lib/academic/ops-labels';

interface PublishedResultsReportCardProps {
  studentName: string;
  schoolName: string | null;
  logoStorageObjectId?: string | null;
  sessionName?: string | null;
  data: ChildPublishedResultsResponse;
  className?: string;
}

function gradeTone(score: number): string {
  if (score >= 70) return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
  if (score >= 40) return 'bg-brand-50 text-brand-900 ring-brand-200';
  return 'bg-red-50 text-red-800 ring-red-200';
}

export function PublishedResultsReportCard({
  studentName,
  schoolName,
  logoStorageObjectId,
  sessionName,
  data,
  className = '',
}: PublishedResultsReportCardProps) {
  const subjects = data.subjects ?? [];
  const publishedDate = data.publishedAt
    ? new Date(data.publishedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <article
      className={`report-card-document overflow-hidden rounded-2xl border border-neutral-300 bg-[#fffdf8] shadow-sm ${className}`}
    >
      <header className="border-b border-neutral-300 bg-white px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <SchoolLogo
              schoolName={schoolName ?? 'School'}
              logoStorageObjectId={logoStorageObjectId}
              size="md"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-800/70">
                Student report card
              </p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-neutral-900">
                {schoolName ?? 'School'}
              </h2>
              <p className="mt-1 text-[12px] text-neutral-600">
                {[sessionName, data.termName].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-brand-200/60 bg-brand-50/50 px-4 py-3 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">Term average</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-neutral-900">
              {data.averageScore ?? '—'}%
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 border-b border-neutral-200 bg-[#faf8f4] px-6 py-4 sm:grid-cols-3 sm:px-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Student</p>
          <p className="mt-1 text-[14px] font-semibold text-neutral-900">{studentName}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Class</p>
          <p className="mt-1 text-[14px] font-semibold text-neutral-900">{data.classArmLabel ?? '—'}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Published</p>
          <p className="mt-1 text-[14px] font-semibold text-neutral-900">{publishedDate ?? '—'}</p>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6">
        <div className="overflow-hidden rounded-lg border border-neutral-300">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className={GRADEBOOK_UI.reportCardTableHead}>
                <th className="w-10 border-b border-r border-neutral-300 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider">
                  S/N
                </th>
                <th className="border-b border-r border-neutral-300 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider">
                  Subject
                </th>
                <th className="w-[4.5rem] border-b border-r border-neutral-300 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider">
                  CA
                </th>
                <th className="w-[4.5rem] border-b border-r border-neutral-300 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider">
                  Exam
                </th>
                <th className="w-[4.75rem] border-b border-r border-neutral-300 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider">
                  Total
                </th>
                <th className="w-14 border-b border-r border-neutral-300 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider">
                  Grade
                </th>
                <th className="border-b border-neutral-300 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider">
                  Remark
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-neutral-400">
                    No subject scores recorded for this term.
                  </td>
                </tr>
              ) : (
                subjects.map((subject, index) => (
                  <tr key={subject.subjectId} className={index % 2 === 1 ? 'bg-neutral-50/60' : 'bg-white'}>
                    <td className="border-b border-r border-neutral-200 px-2 py-2.5 text-center font-mono text-[11px] text-neutral-500">
                      {index + 1}
                    </td>
                    <td className="border-b border-r border-neutral-200 px-3 py-2.5 text-[13px] font-semibold text-neutral-900">
                      {formatSubjectLabel(subject.subjectId)}
                    </td>
                    <td className="border-b border-r border-neutral-200 px-2 py-2.5 text-center font-mono text-[13px] tabular-nums text-neutral-900">
                      {subject.continuousAssessmentScore}
                    </td>
                    <td className="border-b border-r border-neutral-200 px-2 py-2.5 text-center font-mono text-[13px] tabular-nums text-neutral-900">
                      {subject.examScore}
                    </td>
                    <td className="border-b border-r border-neutral-200 px-2 py-2.5 text-center font-mono text-[13px] font-bold tabular-nums text-neutral-900">
                      {subject.totalScore}%
                    </td>
                    <td className="border-b border-r border-neutral-200 px-2 py-2.5 text-center">
                      <span
                        className={`inline-flex min-w-[2rem] items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold ring-1 ${gradeTone(subject.totalScore)}`}
                      >
                        {subject.grade}
                      </span>
                    </td>
                    <td className="border-b border-neutral-200 px-3 py-2.5 text-[12px] text-neutral-700">
                      {subject.remark ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-white px-6 py-4 sm:px-8">
        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
          <Award aria-hidden className="size-4 text-brand-600" />
          Official published results · {subjects.length} subject{subjects.length === 1 ? '' : 's'}
        </div>
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-400">
          Generated from Loomis school portal
        </p>
      </footer>
    </article>
  );
}
