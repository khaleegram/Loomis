'use client';

import type { ClassReportCardStats } from '@/lib/academic/report-card-filters';

interface ReportCardClassStatsProps {
  stats: ClassReportCardStats;
  classLabel?: string | null;
  termName?: string | null;
}

export function ReportCardClassStats({ stats, classLabel, termName }: ReportCardClassStatsProps) {
  const items = [
    { label: 'Students', value: String(stats.totalStudents) },
    { label: 'Complete', value: String(stats.completeCount) },
    { label: 'Avg', value: stats.classAverage != null ? `${stats.classAverage}%` : '—' },
    {
      label: 'At risk',
      value: String(stats.failingCount),
      warn: stats.failingCount > 0,
    },
    { label: 'Locked', value: String(stats.lockedCount) },
  ];

  return (
    <div className="print:hidden flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-neutral-200 bg-[#faf8f4] px-3 py-2 sm:px-4">
      <p className="text-[10px] font-semibold text-neutral-700">
        {classLabel ?? 'Class'}
        {termName ? <span className="font-normal text-neutral-400"> · {termName}</span> : null}
      </p>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {items.map((item) => (
          <span
            key={item.label}
            className="inline-flex items-baseline gap-1 rounded-md border border-neutral-200/80 bg-white px-2 py-0.5 text-[10px]"
          >
            <span className="font-medium text-neutral-400">{item.label}</span>
            <span
              className={`font-mono text-[11px] font-bold tabular-nums ${
                item.warn ? 'text-amber-800' : 'text-neutral-900'
              }`}
            >
              {item.value}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
