import type { AdmissionStatus } from '@loomis/contracts';
import { Badge } from '@loomis/ui-web';

import { admissionStatusLabel } from '@/lib/student/student-labels';

export function AdmissionStatusBadge({ status }: { status: AdmissionStatus }) {
  const variant =
    status === 'approved'
      ? 'default'
      : status === 'pending'
        ? 'gold'
        : status === 'declined'
          ? 'destructive'
          : 'outline';
  return <Badge variant={variant}>{admissionStatusLabel(status)}</Badge>;
}
