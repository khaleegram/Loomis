import type { StaffProfileStatus } from '@loomis/contracts';
import { Badge } from '@loomis/ui-web';

import { formatStaffStatus } from '@/components/school/school-nav-config';

export function StaffStatusBadge({ status }: { status: StaffProfileStatus }) {
  const variant =
    status === 'active' ? 'default' : status === 'pending' ? 'gold' : 'outline';
  return <Badge variant={variant}>{formatStaffStatus(status)}</Badge>;
}
