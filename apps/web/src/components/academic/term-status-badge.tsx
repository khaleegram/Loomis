import type { AcademicTermStatus, AcademicYearStatus } from '@loomis/contracts';
import { Badge } from '@loomis/ui-web';

import { termStatusLabel, yearStatusLabel } from '@/lib/academic/term-labels';

export function YearStatusBadge({ status }: { status: AcademicYearStatus }) {
  const variant =
    status === 'active' ? 'default' : status === 'draft' ? 'secondary' : 'outline';
  return <Badge variant={variant}>{yearStatusLabel(status)}</Badge>;
}

export function TermStatusBadge({ status }: { status: AcademicTermStatus }) {
  const variant =
    status === 'open'
      ? 'default'
      : status === 'census_locked'
        ? 'gold'
        : status === 'closed'
          ? 'outline'
          : 'secondary';
  return <Badge variant={variant}>{termStatusLabel(status)}</Badge>;
}
