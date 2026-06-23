import type { CreateTimetableEntryRequest } from '@loomis/contracts';
import { writeAudit } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import { staffRepository } from '../../hrm/repository/staff.repository.js';
import { studentRepository } from '../../student/repository/student.repository.js';
import { academicOpsEvents } from '../events/ops-events.js';
import { academicRepository } from '../repository/academic.repository.js';
import { bellScheduleService } from './bell-schedule.service.js';
import { timetableRepository } from '../repository/timetable.repository.js';
import type { ActorContext } from '../types.js';
import { actorCanActAsClassTeacher, actorCanTeachSubjects } from './actor-roles.js';
import { requireTenant, requireTerm } from './_shared.js';

const TIMETABLE_BUILDERS = new Set(['timetable_officer', 'principal', 'school_owner']);

function canManageTimetable(role: string): boolean {
  return TIMETABLE_BUILDERS.has(role);
}

/**
 * Timetable building (SRS §4.5 FR-ACA-001; US-ACA-006). Every new slot is checked
 * for conflicts against existing slots on the same weekday with an overlapping
 * time window: a teacher double-booked (the US-ACA-006 case) or a class arm
 * double-booked. A conflict refuses the save.
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

    const assignmentOptions = await staffRepository.listSubjectAssignmentsForClassArm(
      tenantId,
      input.termId,
      input.classArmId,
    );
    const validAssignment = assignmentOptions.find(
      (option) =>
        option.subjectId === input.subjectId &&
        option.teacherStaffProfileId === input.teacherStaffProfileId,
    );
    if (!validAssignment) {
      throw new LoomisError(
        'ACADEMIC_TIMETABLE_ASSIGNMENT_INVALID',
        422,
        'Subject and teacher must match an active subject assignment for this class',
      );
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
    const publishedOnly = !canManageTimetable(actor.role);
    return timetableRepository.list(
      tenantId,
      filter.termId,
      filter.classArmId,
      publishedOnly,
    );
  },

  async listSubjectOptions(
    tenantId: string,
    filter: { termId: string; classArmId: string },
    actor: ActorContext,
  ) {
    requireTenant(actor, tenantId);
    if (!canManageTimetable(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Timetable builder access required');
    }
    await requireTerm(tenantId, filter.termId);
    return staffRepository.listSubjectAssignmentsForClassArm(
      tenantId,
      filter.termId,
      filter.classArmId,
    );
  },

  async listStudentTimetable(tenantId: string, termId: string, actor: ActorContext) {
    return this.listMyTimetable(tenantId, termId, actor);
  },

  async listMyTimetable(tenantId: string, termId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);

    if (actor.role === 'student') {
      const student = await studentRepository.findStudentByUserId(tenantId, actor.userId);
      if (!student) {
        throw new LoomisError('STUDENT_NOT_FOUND', 404, 'Student profile not found');
      }

      const enrollment = await studentRepository.findEnrollmentForTerm(tenantId, student.id, termId);
      if (
        !enrollment ||
        !['active', 'active_billable', 'suspended'].includes(enrollment.status)
      ) {
        throw new LoomisError('STUDENT_ENROLLMENT_NOT_FOUND', 404, 'No active enrollment for this term');
      }

      const entries = await timetableRepository.list(
        tenantId,
        termId,
        enrollment.classArmId,
        true,
      );

      const classArm = await academicRepository.findClassArmById(tenantId, enrollment.classArmId);
      const level = classArm
        ? await academicRepository.findClassLevelById(tenantId, classArm.classLevelId)
        : null;

      return {
        entries,
        classArmId: enrollment.classArmId,
        classArmLabel: classArm && level ? `${level.code} ${classArm.name}` : null,
      };
    }

    if (await actorCanTeachSubjects(actor)) {
      const profile = await staffRepository.findProfileByUserId(tenantId, actor.userId);
      if (!profile) {
        throw new LoomisError('HRM_STAFF_NOT_FOUND', 404, 'Staff profile not found');
      }

      const rows = await timetableRepository.listByTeacherForTerm(tenantId, termId, profile.id);
      const entries = rows.map((row) => ({
        ...row,
        classArmLabel: `${row.classLevelCode} ${row.classArmName}`,
      }));

      let classTeacherClassArmId: string | null = null;
      let classTeacherClassArmLabel: string | null = null;

      if (await actorCanActAsClassTeacher(actor)) {
        const classTeacherAssignment = await staffRepository.findActiveClassTeacherForStaffTerm(
          tenantId,
          profile.id,
          termId,
        );
        if (classTeacherAssignment) {
          classTeacherClassArmId = classTeacherAssignment.classArmId;
          const classArm = await academicRepository.findClassArmById(
            tenantId,
            classTeacherAssignment.classArmId,
          );
          const level = classArm
            ? await academicRepository.findClassLevelById(tenantId, classArm.classLevelId)
            : null;
          classTeacherClassArmLabel =
            classArm && level ? `${level.code} ${classArm.name}` : null;
        }
      }

      return {
        entries,
        classArmId: undefined,
        classArmLabel: null,
        classTeacherClassArmId,
        classTeacherClassArmLabel,
      };
    }

    throw new LoomisError('FORBIDDEN', 403, 'Personal timetable is for students and teaching staff');
  },

  async listParentChildTimetable(
    tenantId: string,
    studentId: string,
    termId: string,
    actor: ActorContext,
  ) {
    if (actor.role !== 'parent') {
      throw new LoomisError('FORBIDDEN', 403, 'Parent role required');
    }

    const linked = await studentRepository.hasActiveParentLink(tenantId, actor.userId, studentId);
    if (!linked) {
      throw new LoomisError('FORBIDDEN', 403, 'You are not linked to this student');
    }

    const enrollment = await studentRepository.findEnrollmentForTerm(tenantId, studentId, termId);
    if (
      !enrollment ||
      !['active', 'active_billable', 'suspended'].includes(enrollment.status)
    ) {
      throw new LoomisError('STUDENT_ENROLLMENT_NOT_FOUND', 404, 'No active enrollment for this term');
    }

    const entries = await timetableRepository.list(
      tenantId,
      termId,
      enrollment.classArmId,
      true,
    );

    const classArm = await academicRepository.findClassArmById(tenantId, enrollment.classArmId);
    const level = classArm
      ? await academicRepository.findClassLevelById(tenantId, classArm.classLevelId)
      : null;

    return {
      entries,
      classArmId: enrollment.classArmId,
      classArmLabel: classArm && level ? `${level.code} ${classArm.name}` : null,
    };
  },

  async publishTimetable(
    tenantId: string,
    input: { termId: string },
    actor: ActorContext,
    requestId: string,
  ) {
    requireTenant(actor, tenantId);
    const term = await requireTerm(tenantId, input.termId);
    if (term.status !== 'open') {
      throw new LoomisError(
        'ACADEMIC_TERM_NOT_OPEN',
        409,
        'Timetables can only be published while the term is open',
      );
    }

    const pendingBefore = await timetableRepository.listPendingForTerm(tenantId, input.termId);
    if (pendingBefore.length === 0) {
      throw new LoomisError(
        'ACADEMIC_TIMETABLE_NOTHING_TO_PUBLISH',
        422,
        'No pending timetable changes to publish for this term',
      );
    }

    const entries = await timetableRepository.publishTerm(tenantId, input.termId);

    const affectedClassArms = new Set(pendingBefore.map((row) => row.classArmId));
    const countByClassArm = new Map<string, number>();
    for (const entry of entries) {
      countByClassArm.set(entry.classArmId, (countByClassArm.get(entry.classArmId) ?? 0) + 1);
    }
    for (const classArmId of affectedClassArms) {
      if (!countByClassArm.has(classArmId)) {
        countByClassArm.set(classArmId, 0);
      }
    }

    await writeAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'academic.timetable.published',
      resourceType: 'timetable',
      resourceId: input.termId,
      sensitivity: 'standard',
      result: 'success',
      requestId,
      metadata: {
        termId: input.termId,
        publishedSlotCount: entries.length,
        pendingChangesApplied: pendingBefore.length,
        publishedClassArms: countByClassArm.size,
      },
    });

    for (const [classArmId, count] of countByClassArm) {
      await academicOpsEvents.publishTimetablePublished({
        tenantId,
        termId: input.termId,
        classArmId,
        count,
        publishedById: actor.userId,
      });
    }

    return {
      termId: input.termId,
      publishedSlotCount: entries.length,
      publishedClassArms: countByClassArm.size,
      classArms: [...countByClassArm.entries()].map(([classArmId, publishedCount]) => ({
        classArmId,
        publishedCount,
      })),
    };
  },

  async deleteEntry(tenantId: string, entryId: string, actor: ActorContext, requestId: string) {
    requireTenant(actor, tenantId);
    const existing = await timetableRepository.findById(tenantId, entryId);
    if (!existing) {
      throw new LoomisError('ACADEMIC_TIMETABLE_ENTRY_NOT_FOUND', 404, 'Timetable entry not found');
    }

    if (existing.status === 'published') {
      const marked = await timetableRepository.markForRemoval(tenantId, entryId);
      if (!marked) {
        throw new LoomisError('ACADEMIC_TIMETABLE_ENTRY_NOT_FOUND', 404, 'Timetable entry not found');
      }

      await writeAudit({
        tenantId,
        actorUserId: actor.userId,
        action: 'academic.timetable.entry_marked_for_removal',
        resourceType: 'timetable',
        resourceId: entryId,
        sensitivity: 'standard',
        result: 'success',
        requestId,
        metadata: { termId: marked.termId, classArmId: marked.classArmId },
      });

      return marked;
    }

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

  async getPublishPreview(tenantId: string, termId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    if (!canManageTimetable(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Timetable preview is for builders only');
    }
    const term = await requireTerm(tenantId, termId);

    const [pending, arms, levels] = await Promise.all([
      timetableRepository.listPendingForTerm(tenantId, termId),
      academicRepository.listClassArms(tenantId, term.academicYearId),
      academicRepository.listClassLevels(tenantId),
    ]);

    const levelById = new Map(levels.map((level) => [level.id, level]));
    const labelForArm = (classArmId: string): string => {
      const arm = arms.find((row) => row.id === classArmId);
      if (!arm) return 'Class';
      const level = levelById.get(arm.classLevelId);
      return `${level?.code ?? 'Class'} ${arm.name}`;
    };

    const toPreview = (entry: (typeof pending)[number]) => ({
      entryId: entry.id,
      classArmId: entry.classArmId,
      classArmLabel: labelForArm(entry.classArmId),
      subjectId: entry.subjectId,
      teacherName: entry.teacherName ?? null,
      dayOfWeek: entry.dayOfWeek,
      startMinute: entry.startMinute,
      endMinute: entry.endMinute,
    });

    const slotKey = (entry: { classArmId: string; dayOfWeek: number; startMinute: number; endMinute: number }) =>
      `${entry.classArmId}:${entry.dayOfWeek}:${entry.startMinute}:${entry.endMinute}`;

    const drafts = pending.filter((entry) => entry.status === 'draft');
    const marked = pending.filter((entry) => entry.status === 'marked_for_removal');
    const removalBySlot = new Map(marked.map((entry) => [slotKey(entry), entry]));

    const additions: ReturnType<typeof toPreview>[] = [];
    const changes: Array<{
      classArmLabel: string;
      dayOfWeek: number;
      startMinute: number;
      endMinute: number;
      removed: ReturnType<typeof toPreview>;
      added: ReturnType<typeof toPreview>;
    }> = [];

    for (const draft of drafts) {
      const key = slotKey(draft);
      const pairedRemoval = removalBySlot.get(key);
      if (pairedRemoval) {
        changes.push({
          classArmLabel: labelForArm(draft.classArmId),
          dayOfWeek: draft.dayOfWeek,
          startMinute: draft.startMinute,
          endMinute: draft.endMinute,
          removed: toPreview(pairedRemoval),
          added: toPreview(draft),
        });
        removalBySlot.delete(key);
      } else {
        additions.push(toPreview(draft));
      }
    }

    const removals = [...removalBySlot.values()].map(toPreview);

    return {
      termId,
      termName: term.name,
      additions,
      removals,
      changes,
      totalPending: pending.length,
    };
  },

  async summarizeTerm(tenantId: string, termId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    if (!canManageTimetable(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Timetable summary is for builders only');
    }
    const term = await requireTerm(tenantId, termId);

    const [arms, levels, counts] = await Promise.all([
      academicRepository.listClassArms(tenantId, term.academicYearId),
      academicRepository.listClassLevels(tenantId),
      timetableRepository.countByClassArmForTerm(tenantId, termId),
    ]);

    const countByArm = new Map(counts.map((row) => [row.classArmId, row]));
    const levelById = new Map(levels.map((level) => [level.id, level]));

    let totalDraftSlots = 0;
    let totalPublishedSlots = 0;
    let publishedClassArms = 0;
    let draftClassArms = 0;
    let emptyClassArms = 0;

    const classArms = arms.map((arm) => {
      const level = levelById.get(arm.classLevelId);
      const label = `${level?.code ?? 'Class'} ${arm.name}`;
      const stats = countByArm.get(arm.id);
      const lessonCount = stats?.lessonCount ?? 0;
      const draftCount = stats?.draftCount ?? 0;
      const pendingRemovalCount = stats?.pendingRemovalCount ?? 0;
      const publishedCount = stats?.publishedCount ?? 0;
      const hasPendingChanges = draftCount > 0 || pendingRemovalCount > 0;

      totalDraftSlots += draftCount + pendingRemovalCount;
      totalPublishedSlots += publishedCount;

      let status: 'empty' | 'draft' | 'published';
      if (lessonCount === 0) {
        status = 'empty';
        emptyClassArms += 1;
      } else if (hasPendingChanges) {
        status = 'draft';
        draftClassArms += 1;
      } else {
        status = 'published';
        publishedClassArms += 1;
      }

      return {
        classArmId: arm.id,
        classArmLabel: label,
        status,
        lessonCount,
        draftCount,
      };
    });

    classArms.sort((a, b) => a.classArmLabel.localeCompare(b.classArmLabel, undefined, { numeric: true }));

    const lessonPeriodCount = (
      await bellScheduleService.getLessonSlotsForYear(tenantId, term.academicYearId)
    ).length;

    return {
      termId,
      termName: term.name,
      totalClassArms: arms.length,
      publishedClassArms,
      draftClassArms,
      emptyClassArms,
      totalDraftSlots,
      totalPublishedSlots,
      bellPeriodsPerDay: lessonPeriodCount,
      classArms,
    };
  },
};

type ConflictType = 'teacher' | 'class';

/** Returns the kind of clash between an existing slot and the candidate, if any. */
function detectConflict(
  existing: { classArmId: string; teacherStaffProfileId: string },
  candidate: { classArmId: string; teacherStaffProfileId: string },
): ConflictType | null {
  if (existing.teacherStaffProfileId === candidate.teacherStaffProfileId) return 'teacher';
  if (existing.classArmId === candidate.classArmId) return 'class';
  return null;
}
