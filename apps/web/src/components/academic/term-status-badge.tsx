import type { AcademicTermStatus, AcademicYearStatus } from '@loomis/contracts';

import { termStatusLabel, yearStatusLabel } from '@/lib/academic/term-labels';
import { cn } from '@loomis/ui-web';

const YEAR_STYLES: Record<AcademicYearStatus, string> = {
  active: 'bg-brand-100 text-brand-800 ring-1 ring-brand-200/60',
  draft: 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200/60',
  closed: 'bg-neutral-50 text-neutral-500 ring-1 ring-neutral-200/40',
};

const TERM_STYLES: Record<AcademicTermStatus, string> = {
  draft: 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200/60',
  open: 'bg-brand-100 text-brand-800 ring-1 ring-brand-200/60',
  census_locked: 'bg-gold-50 text-gold-800 ring-1 ring-gold-200/70',
  closed: 'bg-neutral-50 text-neutral-500 ring-1 ring-neutral-200/40',
};

function StatusPill({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        className,
      )}
    >
      {label}
    </span>
  );
}

export function YearStatusBadge({ status }: { status: AcademicYearStatus }) {
  return <StatusPill label={yearStatusLabel(status)} className={YEAR_STYLES[status]} />;
}

export function TermStatusBadge({
  status,
  userLabel,
}: {
  status: AcademicTermStatus;
  userLabel?: string;
}) {
  return (
    <StatusPill
      label={userLabel ?? termStatusLabel(status)}
      className={TERM_STYLES[status]}
    />
  );
}
