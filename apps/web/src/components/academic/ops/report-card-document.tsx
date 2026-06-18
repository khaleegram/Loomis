'use client';

import type { GradeBand, GradebookEntryResponse, StudentResponse } from '@loomis/contracts';
import { Skeleton } from '@loomis/ui-web';
import { Award, GraduationCap } from 'lucide-react';
import { useMemo } from 'react';

import { SchoolLogo } from '@/components/shared/school-logo';
import { GRADEBOOK_UI } from '@/lib/academic/gradebook-ui';
import { formatSubjectLabel } from '@/lib/academic/ops-labels';
import {
  buildReportCardSummary,
  formatGradeBandKey,
  gradeTone,
  type ReportCardSummary,
} from '@/lib/academic/report-card-summary';
import { overallPerformanceRemark } from '@/lib/academic/report-card-filters';
import { genderLabel, studentDisplayName } from '@/lib/student/student-labels';

interface ReportCardDocumentProps {
  student: StudentResponse | null;
  subjectIds: string[];
  entries: GradebookEntryResponse[];
  rosterStudents: StudentResponse[];
  termName?: string | null;
  sessionName?: string | null;
  classLabel?: string | null;
  schoolName?: string | null;
  logoStorageObjectId?: string | null;
  schemeName?: string | null;
  caWeight?: number;
  examWeight?: number;
  passMark?: number;
  gradeBands?: GradeBand[];
  isLoading?: boolean;
}

const REMARK_TONE: Record<
  ReturnType<typeof overallPerformanceRemark>['tone'],
  string
> = {
  excellent: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  good: 'border-brand-200 bg-brand-50 text-brand-900',
  pass: 'border-neutral-200 bg-neutral-50 text-neutral-800',
  fail: 'border-red-200 bg-red-50 text-red-900',
  pending: 'border-amber-200 bg-amber-50 text-amber-900',
};

function GradingScaleTable({ bands, passMark }: { bands: GradeBand[]; passMark: number }) {
  const sorted = [...bands].sort((a, b) => b.minScore - a.minScore);
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200">
      <table className="w-full border-collapse text-left text-[11px]">
        <thead>
          <tr className="bg-neutral-100">
            <th className="border-b border-r border-neutral-200 px-3 py-2 font-bold uppercase tracking-wide text-neutral-600">
              Grade
            </th>
            <th className="border-b border-r border-neutral-200 px-3 py-2 font-bold uppercase tracking-wide text-neutral-600">
              Range
            </th>
            <th className="border-b border-neutral-200 px-3 py-2 font-bold uppercase tracking-wide text-neutral-600">
              Remark
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((band) => (
            <tr key={band.grade} className="bg-white even:bg-neutral-50/70">
              <td className="border-b border-r border-neutral-200 px-3 py-2 font-mono font-bold text-neutral-900">
                {band.grade}
              </td>
              <td className="border-b border-r border-neutral-200 px-3 py-2 font-mono tabular-nums text-neutral-700">
                {band.minScore} – {band.maxScore}
              </td>
              <td className="border-b border-neutral-200 px-3 py-2 text-neutral-700">
                {band.remark ?? '—'}
              </td>
            </tr>
          ))}
          <tr className="bg-[#faf8f4]">
            <td colSpan={3} className="px-3 py-2 text-[10px] font-semibold text-neutral-600">
              Pass mark: {passMark}% · {formatGradeBandKey(sorted)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const GRADE_CELL: Record<ReturnType<typeof gradeTone>, string> = {
  excellent: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  pass: 'bg-brand-50 text-brand-900 ring-brand-200',
  fail: 'bg-red-50 text-red-800 ring-red-200',
  neutral: 'bg-neutral-50 text-neutral-400 ring-neutral-200',
};

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function ScoreCell({ value }: { value: number | null | undefined }) {
  return (
    <span className="font-mono text-[13px] tabular-nums text-neutral-900">
      {value != null ? value : '—'}
    </span>
  );
}

function ReportCardTable({
  summary,
  caWeight,
  examWeight,
  passMark,
}: {
  summary: ReportCardSummary;
  caWeight: number;
  examWeight: number;
  passMark: number;
}) {
  return (
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
              <span className="mt-0.5 block font-mono text-[9px] font-semibold normal-case text-neutral-500">
                /{caWeight}
              </span>
            </th>
            <th className="w-[4.5rem] border-b border-r border-neutral-300 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider">
              Exam
              <span className="mt-0.5 block font-mono text-[9px] font-semibold normal-case text-neutral-500">
                /{examWeight}
              </span>
            </th>
            <th className="w-[4.75rem] border-b border-r border-neutral-300 px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider">
              Total
              <span className="mt-0.5 block font-mono text-[9px] font-semibold normal-case text-neutral-500">
                /100
              </span>
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
          {summary.rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-neutral-400">
                No exam sheets configured for this class yet.
              </td>
            </tr>
          ) : (
            summary.rows.map((row, index) => {
              const entry = row.entry;
              const tone = entry ? gradeTone(entry.totalScore, passMark) : 'neutral';
              return (
                <tr
                  key={row.subjectId}
                  className={!entry ? 'bg-amber-50/35' : index % 2 === 1 ? 'bg-neutral-50/60' : 'bg-white'}
                >
                  <td className="border-b border-r border-neutral-200 px-2 py-2.5 text-center font-mono text-[11px] text-neutral-500">
                    {index + 1}
                  </td>
                  <td className="border-b border-r border-neutral-200 px-3 py-2.5">
                    <p className="text-[13px] font-semibold text-neutral-900">
                      {formatSubjectLabel(row.subjectId)}
                    </p>
                    {!entry ? (
                      <p className="text-[10px] font-medium text-amber-700/90">Awaiting scores</p>
                    ) : null}
                  </td>
                  <td className="border-b border-r border-neutral-200 px-2 py-2.5 text-center">
                    <ScoreCell value={entry?.continuousAssessmentScore} />
                  </td>
                  <td className="border-b border-r border-neutral-200 px-2 py-2.5 text-center">
                    <ScoreCell value={entry?.examScore} />
                  </td>
                  <td className="border-b border-r border-neutral-200 px-2 py-2.5 text-center">
                    <span className="font-mono text-[14px] font-bold tabular-nums text-neutral-900">
                      {entry?.totalScore ?? '—'}
                    </span>
                  </td>
                  <td className="border-b border-r border-neutral-200 px-2 py-2.5 text-center">
                    {entry?.grade ? (
                      <span
                        className={`inline-flex min-w-[2rem] items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-[12px] font-bold ring-1 ring-inset ${GRADE_CELL[tone]}`}
                      >
                        {entry.grade}
                      </span>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="border-b border-neutral-200 px-3 py-2.5 text-[12px] text-neutral-700">
                    {entry?.remark ?? (entry ? '—' : 'Not entered')}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function SummaryBand({ summary }: { summary: ReportCardSummary }) {
  const stats = [
    {
      label: 'Total obtained',
      value: summary.totalObtained != null ? `${summary.totalObtained}` : '—',
      hint: `/ ${summary.totalObtainable}`,
    },
    {
      label: 'Average',
      value: summary.average != null ? `${summary.average}%` : '—',
      hint: summary.isComplete ? 'All subjects' : `${summary.scoredCount}/${summary.totalSubjects} scored`,
    },
    {
      label: 'Class position',
      value:
        summary.classPosition != null
          ? `${ordinal(summary.classPosition)} of ${summary.classSize}`
          : '—',
      hint: summary.classPosition != null ? 'By class average' : 'Needs full class scores',
    },
    {
      label: 'Pass / Fail',
      value: `${summary.passedCount} / ${summary.failedCount}`,
      hint: `${summary.lockedCount} locked`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-300 bg-neutral-300 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-[#faf8f4] px-3 py-3 sm:px-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-500">{stat.label}</p>
          <p className="mt-1 font-mono text-[20px] font-extrabold leading-none tabular-nums text-neutral-900">
            {stat.value}
          </p>
          <p className="mt-1 text-[10px] text-neutral-500">{stat.hint}</p>
        </div>
      ))}
    </div>
  );
}

export function ReportCardDocumentSkeleton() {
  return <Skeleton className="h-full min-h-[640px] w-full rounded-none" />;
}

/** Formal printable term report — Nigerian private-school layout. */
export function ReportCardDocument({
  student,
  subjectIds,
  entries,
  rosterStudents,
  termName,
  sessionName,
  classLabel,
  schoolName,
  logoStorageObjectId,
  schemeName: _schemeName,
  caWeight = 40,
  examWeight = 60,
  passMark = 40,
  gradeBands = [],
  isLoading,
}: ReportCardDocumentProps) {
  const summary = useMemo(() => {
    if (!student) return null;
    return buildReportCardSummary({
      student,
      subjectIds,
      entries,
      rosterStudents,
      passMark,
    });
  }, [student, subjectIds, entries, rosterStudents, passMark]);

  if (isLoading) return <ReportCardDocumentSkeleton />;

  if (!student || !summary) {
    return (
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
          <GraduationCap aria-hidden className="size-7" />
        </div>
        <p className="text-[15px] font-semibold text-neutral-800">Select a student</p>
        <p className="max-w-sm text-[12px] leading-relaxed text-neutral-500">
          Choose a student from the list to preview their official term report card.
        </p>
      </div>
    );
  }

  const displayName = studentDisplayName(student.firstName, student.lastName);
  const showDraftWatermark = !summary.isFullyLocked;
  const performance = overallPerformanceRemark(summary.average, passMark);
  const generatedOn = new Date().toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <article
      className={`report-card-document relative mx-auto w-full max-w-[820px] ${GRADEBOOK_UI.reportCardDocument}`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-3 rounded-lg border border-brand-900/5" />

      {showDraftWatermark ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
        >
          <span className="-rotate-[18deg] select-none text-[72px] font-black uppercase tracking-[0.2em] text-neutral-900/[0.04] sm:text-[96px]">
            Draft
          </span>
        </div>
      ) : null}

      {/* Letterhead */}
      <header className="relative border-b-2 border-brand-800/25 bg-[linear-gradient(180deg,#fbf7ef_0%,#ffffff_100%)] px-6 pb-5 pt-6 sm:px-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#8b6914_0%,#c9a227_35%,#8b6914_100%)]" />
        <div className="flex flex-wrap items-start justify-between gap-4 pt-1">
          <div className="flex min-w-0 items-start gap-4">
            <SchoolLogo
              schoolName={schoolName ?? 'School'}
              logoStorageObjectId={logoStorageObjectId}
              size="md"
            />
            <div className="min-w-0">
              <h2 className="text-[18px] font-extrabold leading-tight tracking-tight text-neutral-900 sm:text-[22px]">
                {schoolName ?? 'School'}
              </h2>
              <p className="mt-1 text-[15px] font-bold text-neutral-800">Terminal Progress Report</p>
              <p className="mt-1 text-[12px] text-neutral-600">
                {[sessionName ? `${sessionName} session` : null, termName, classLabel]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            {summary.classPosition != null ? (
              <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-right shadow-sm">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-brand-800/70">
                  Class position
                </p>
                <p className="font-mono text-[22px] font-extrabold leading-none tabular-nums text-brand-900">
                  {ordinal(summary.classPosition)}
                </p>
                <p className="text-[10px] text-brand-800/70">of {summary.classSize} students</p>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Student biodata */}
      <section className="border-b border-neutral-200 bg-white px-6 py-4 sm:px-8">
        <div className="overflow-hidden rounded-lg border border-neutral-300">
          <table className="w-full border-collapse text-left text-[12px]">
            <tbody>
              <tr>
                {[
                  { label: 'Student', value: displayName },
                  { label: 'Adm no.', value: student.admissionNo, mono: true },
                  { label: 'Class', value: classLabel ?? '—' },
                  { label: 'Gender', value: genderLabel(student.gender) },
                ].map((field) => (
                  <td
                    key={field.label}
                    className="border-r border-neutral-200 px-3 py-2.5 last:border-r-0 sm:w-1/4"
                  >
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                      {field.label}
                    </p>
                    <p
                      className={`mt-0.5 font-semibold text-neutral-900 ${
                        'mono' in field && field.mono ? 'font-mono text-[12px]' : 'text-[13px]'
                      }`}
                    >
                      {field.value}
                    </p>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div
          className={`mt-3 rounded-lg border px-3 py-2.5 ${REMARK_TONE[performance.tone]}`}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] opacity-70">
            Overall remark
          </p>
          <p className="mt-0.5 text-[13px] font-semibold">{performance.label}</p>
        </div>
      </section>

      {/* Results */}
      <section className="space-y-4 bg-white px-6 py-5 sm:px-8">
        <div className="flex items-center gap-2">
          <Award aria-hidden className="size-4 text-brand-700" />
          <h3 className="text-[12px] font-bold uppercase tracking-[0.16em] text-neutral-700">
            Academic performance
          </h3>
        </div>

        <ReportCardTable
          summary={summary}
          caWeight={caWeight}
          examWeight={examWeight}
          passMark={passMark}
        />

        <SummaryBand summary={summary} />
      </section>

      {/* Grading key + signatures */}
      <footer className="border-t border-neutral-200 bg-[#faf8f4] px-6 py-5 sm:px-8">
        {gradeBands.length > 0 ? (
          <div className="mb-5">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              Grading scale
            </p>
            <GradingScaleTable bands={gradeBands} passMark={passMark} />
          </div>
        ) : null}

        <div className="grid gap-8 sm:grid-cols-2">
          {['Class teacher', 'Principal'].map((role) => (
            <div key={role} className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
              <div className="mb-8 border-b border-neutral-400" />
              <p className="text-[11px] font-semibold text-neutral-800">{role}</p>
              <p className="text-[10px] text-neutral-500">Signature & official stamp · Date</p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-center text-[10px] text-neutral-400">
          Generated {generatedOn} from the Loomis gradebook · Official PDF export after results are published
        </p>
      </footer>
    </article>
  );
}
