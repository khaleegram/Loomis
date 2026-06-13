import {
  DEFAULT_BELL_SCHEDULE_SLOTS,
  type BellScheduleSlot,
  type UpsertBellScheduleRequest,
} from '@loomis/contracts';
import { writeAudit } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import { academicRepository } from '../repository/academic.repository.js';
import { bellScheduleRepository } from '../repository/bell-schedule.repository.js';
import type { ActorContext } from '../types.js';
import { requireTenant } from './_shared.js';

const BELL_BUILDERS = new Set(['timetable_officer', 'principal', 'school_owner']);

function canManageBellSchedule(role: string): boolean {
  return BELL_BUILDERS.has(role);
}

function lessonCount(slots: BellScheduleSlot[]): number {
  return slots.filter((slot) => slot.type === 'lesson').length;
}

function validateSlots(slots: BellScheduleSlot[]): void {
  const sorted = [...slots].sort((a, b) => a.startMinute - b.startMinute);
  for (let i = 0; i < sorted.length; i += 1) {
    const slot = sorted[i]!;
    if (slot.endMinute <= slot.startMinute) {
      throw new LoomisError('ACADEMIC_BELL_SCHEDULE_INVALID', 422, 'Each slot must end after it starts');
    }
    if (i > 0) {
      const prev = sorted[i - 1]!;
      if (slot.startMinute < prev.endMinute) {
        throw new LoomisError(
          'ACADEMIC_BELL_SCHEDULE_OVERLAP',
          422,
          'Bell schedule slots cannot overlap',
        );
      }
    }
  }
  if (lessonCount(sorted) === 0) {
    throw new LoomisError(
      'ACADEMIC_BELL_SCHEDULE_INVALID',
      422,
      'At least one teaching period is required',
    );
  }
}

export const bellScheduleService = {
  async getForYear(tenantId: string, academicYearId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    const year = await academicRepository.findYearById(tenantId, academicYearId);
    if (!year) {
      throw new LoomisError('ACADEMIC_YEAR_NOT_FOUND', 404, 'Academic year not found');
    }

    const row = await bellScheduleRepository.findByYear(tenantId, academicYearId);
    const slots = (row?.slots as BellScheduleSlot[] | undefined) ?? DEFAULT_BELL_SCHEDULE_SLOTS;

    return {
      academicYearId,
      slots,
      isDefault: !row,
      lessonPeriodCount: lessonCount(slots),
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
  },

  async upsert(
    tenantId: string,
    input: UpsertBellScheduleRequest,
    actor: ActorContext,
    requestId: string,
  ) {
    requireTenant(actor, tenantId);
    if (!canManageBellSchedule(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'You cannot edit the bell schedule');
    }

    const year = await academicRepository.findYearById(tenantId, input.academicYearId);
    if (!year) {
      throw new LoomisError('ACADEMIC_YEAR_NOT_FOUND', 404, 'Academic year not found');
    }
    if (year.status === 'closed') {
      throw new LoomisError(
        'ACADEMIC_YEAR_CLOSED',
        409,
        'Bell schedule cannot be changed for a closed academic year',
      );
    }

    validateSlots(input.slots);
    const row = await bellScheduleRepository.upsert(
      tenantId,
      input.academicYearId,
      input.slots,
      actor.userId,
    );

    await writeAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'academic.bell_schedule.updated',
      resourceType: 'bell_schedule',
      resourceId: row.id,
      sensitivity: 'standard',
      result: 'success',
      requestId,
      metadata: { academicYearId: input.academicYearId, slotCount: input.slots.length },
    });

    return {
      academicYearId: input.academicYearId,
      slots: input.slots,
      isDefault: false,
      lessonPeriodCount: lessonCount(input.slots),
      updatedAt: row.updatedAt.toISOString(),
    };
  },

  async getLessonSlotsForYear(tenantId: string, academicYearId: string): Promise<BellScheduleSlot[]> {
    const row = await bellScheduleRepository.findByYear(tenantId, academicYearId);
    const slots = (row?.slots as BellScheduleSlot[] | undefined) ?? DEFAULT_BELL_SCHEDULE_SLOTS;
    return slots.filter((slot) => slot.type === 'lesson');
  },

  async getAllSlotsForYear(tenantId: string, academicYearId: string): Promise<BellScheduleSlot[]> {
    const row = await bellScheduleRepository.findByYear(tenantId, academicYearId);
    return (row?.slots as BellScheduleSlot[] | undefined) ?? DEFAULT_BELL_SCHEDULE_SLOTS;
  },
};
