import type { StudentStatus } from '@loomis/contracts';
import { Badge } from '@loomis/ui-web';

import { studentStatusLabel } from '@/lib/student/student-labels';

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const variant =
    status === 'enrolled'
      ? 'default'
      : status === 'admitted'
        ? 'gold'
        : status === 'graduated'
          ? 'secondary'
          : 'outline';
  return <Badge variant={variant}>{studentStatusLabel(status)}</Badge>;
}
