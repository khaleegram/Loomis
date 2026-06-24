import type { AcademicTermStatus, AcademicYearStatus } from '@loomis/contracts';

export const TERM_SEQUENCE_NAMES = ['First Term', 'Second Term', 'Third Term', 'Fourth Term', 'Fifth Term', 'Sixth Term'];

export function defaultTermName(sequence: number): string {
  return TERM_SEQUENCE_NAMES[sequence - 1] ?? `Term ${sequence}`;
}

export function yearStatusLabel(status: AcademicYearStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'active':
      return 'Active';
    case 'closed':
      return 'Closed';
    default:
      return status;
  }
}

export function termStatusLabel(status: AcademicTermStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'open':
      return 'Open';
    case 'census_locked':
      return 'Snapshot taken';
    case 'closed':
      return 'Closed';
    default:
      return status;
  }
}

export function formatCalendarDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}
