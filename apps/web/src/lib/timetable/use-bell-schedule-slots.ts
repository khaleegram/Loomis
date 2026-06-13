import { useBellSchedule } from '@loomis/api-client';

import { DEFAULT_BELL_SCHEDULE_SLOTS } from '@/lib/timetable/timetable-utils';

/** Live bell schedule for a tenant year, falling back to the platform default grid. */
export function useBellScheduleSlots(tenantId: string | null, academicYearId: string | null) {
  const query = useBellSchedule(tenantId ?? '', academicYearId);
  return {
    scheduleSlots: query.data?.slots ?? DEFAULT_BELL_SCHEDULE_SLOTS,
    isLoading: query.isLoading,
  };
}
