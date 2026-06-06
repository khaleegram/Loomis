import type { CreateTimetableEntryRequest } from '@loomis/contracts';
import { writeAudit } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import { academicOpsEvents } from '../events/ops-events.js';
import { academicRepository } from '../repository/academic.repository.js';
import { timetableRepository } from '../repository/timetable.repository.js';
import type { ActorContext } from '../types.js';
import { requireTenant, requireTerm } from './_shared.js';

/**
 * Timetable building (SRS §4.5 FR-ACA-001; US-ACA-006). Every new slot is checked
 * for conflicts against existing slots on the same weekday with an overlapping
 * time window: a teacher double-booked (the US-ACA-006 case), a class arm
 * double-booked, or a venue double-booked. A conflict refuses the save.
 */
export const timetableService = {
  async createEntry(
    tenantId: string,
    input: CreateTimetableEntryRequest,
    actor: ActorContext,
    requestId: string,
  ) {
    requireTenant(actor, tenantId);
    const term = await requireTerm(tenantId, input.termId);
    if (term.status === 'closed') {
      throw new LoomisError(
        'ACADEMIC_TERM_NOT_OPEN',
        409,
        'Timetables cannot be edited for a closed term',
      );
    }
    const arm = await academicRepository.findClassArmById(tenantId, input.classArmId);
    if (!arm) {
      throw new LoomisError('ACADEMIC_CLASS_ARM_NOT_FOUND', 404, 'Class arm not found');
    }

    const overlapping = await timetableRepository.findOverlapping(
      tenantId,
      input.termId,
      input.dayOfWeek,
      input.startMinute,
      input.endMinute,
    );
    for (const existing of overlapping) {
      const conflictType = detectConflict(existing, input);
      if (conflictType) {
        throw new LoomisError(
          'ACADEMIC_TIMETABLE_CONFLICT',
          409,
          `Timetable conflict: ${conflictType} is already booked in an overlapping period`,
          { conflictType, conflictingEntryId: existing.id, dayOfWeek: input.dayOfWeek },
        );
      }
    }

    const entry = await timetableRepository.create(
      tenantId,
      {
        termId: input.termId,
        classArmId: input.classArmId,
        subjectId: input.subjectId,
        teacherStaffProfileId: input.teacherStaffProfileId,
        dayOfWeek: input.dayOfWeek,
        startMinute: input.startMinute,
        endMinute: input.endMinute,
        venue: input.venue ?? null,
      },
      actor.userId,
    );

    await writeAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'academic.timetable.entry_created',
      resourceType: 'timetable',
      resourceId: entry.id,
      sensitivity: 'standard',
      result: 'success',
      requestId,
      metadata: { termId: input.termId, classArmId: input.classArmId, dayOfWeek: input.dayOfWeek },
    });

    return entry;
  },

  async listTimetable(
    tenantId: string,
    filter: { termId: string; classArmId: string },
    actor: ActorContext,
  ) {
    requireTenant(actor, tenantId);
    return timetableRepository.list(tenantId, filter.termId, filter.classArmId);
  },

  async publishTimetable(
    tenantId: string,
    input: { termId: string; classArmId: string },
    actor: ActorContext,
    requestId: string,
  ) {
    requireTenant(actor, tenantId);
    await requireTerm(tenantId, input.termId);
    const entries = await timetableRepository.publish(tenantId, input.termId, input.classArmId);

    await writeAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'academic.timetable.published',
      resourceType: 'timetable',
      resourceId: `${input.termId}:${input.classArmId}`,
      sensitivity: 'standard',
      result: 'success',
      requestId,
      metadata: { termId: input.termId, classArmId: input.classArmId, count: entries.length },
    });

    await academicOpsEvents.publishTimetablePublished({
      tenantId,
      termId: input.termId,
      classArmId: input.classArmId,
      count: entries.length,
      publishedById: actor.userId,
    });

    return entries;
  },

  async deleteEntry(tenantId: string, entryId: string, actor: ActorContext, requestId: string) {
    requireTenant(actor, tenantId);
    const removed = await timetableRepository.deleteById(tenantId, entryId);
    if (!removed) {
      throw new LoomisError('ACADEMIC_TIMETABLE_ENTRY_NOT_FOUND', 404, 'Timetable entry not found');
    }

    await writeAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'academic.timetable.entry_deleted',
      resourceType: 'timetable',
      resourceId: entryId,
      sensitivity: 'standard',
      result: 'success',
      requestId,
      metadata: { termId: removed.termId, classArmId: removed.classArmId },
    });

    return removed;
  },
};

type ConflictType = 'teacher' | 'class' | 'venue';

/** Returns the kind of clash between an existing slot and the candidate, if any. */
function detectConflict(
  existing: { classArmId: string; teacherStaffProfileId: string; venue: string | null },
  candidate: { classArmId: string; teacherStaffProfileId: string; venue?: string | undefined },
): ConflictType | null {
  if (existing.teacherStaffProfileId === candidate.teacherStaffProfileId) return 'teacher';
  if (existing.classArmId === candidate.classArmId) return 'class';
  if (candidate.venue !== undefined && existing.venue === candidate.venue) return 'venue';
  return null;
}
