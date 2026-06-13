import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoomisError } from '../../../shared/errors.js';

const {
  mockWriteAudit,
  mockPublishTimetablePublished,
  mockStaffRepository,
  mockStudentRepository,
  mockAcademicRepository,
  mockBellScheduleService,
  mockTimetableRepository,
} = vi.hoisted(() => ({
  mockWriteAudit: vi.fn(),
  mockPublishTimetablePublished: vi.fn(),
  mockStaffRepository: {
    listSubjectAssignmentsForClassArm: vi.fn(),
    findProfileByUserId: vi.fn(),
  },
  mockStudentRepository: {
    findStudentByUserId: vi.fn(),
    findEnrollmentForTerm: vi.fn(),
    hasActiveParentLink: vi.fn(),
  },
  mockAcademicRepository: {
    findTermById: vi.fn(),
    findClassArmById: vi.fn(),
    findClassLevelById: vi.fn(),
    listClassArms: vi.fn(),
    listClassLevels: vi.fn(),
  },
  mockBellScheduleService: {
    getLessonSlotsForYear: vi.fn(),
  },
  mockTimetableRepository: {
    findOverlapping: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
    listPendingForTerm: vi.fn(),
    publishTerm: vi.fn(),
    findById: vi.fn(),
    markForRemoval: vi.fn(),
    deleteById: vi.fn(),
    countByClassArmForTerm: vi.fn(),
    listByTeacherForTerm: vi.fn(),
  },
}));

vi.mock('../../../shared/audit.js', () => ({
  writeAudit: (...args: unknown[]) => mockWriteAudit(...args),
}));

vi.mock('../events/ops-events.js', () => ({
  academicOpsEvents: {
    publishTimetablePublished: (...args: unknown[]) => mockPublishTimetablePublished(...args),
  },
}));

vi.mock('../../hrm/repository/staff.repository.js', () => ({
  staffRepository: mockStaffRepository,
}));

vi.mock('../../student/repository/student.repository.js', () => ({
  studentRepository: mockStudentRepository,
}));

vi.mock('../repository/academic.repository.js', () => ({
  academicRepository: mockAcademicRepository,
}));

vi.mock('./bell-schedule.service.js', () => ({
  bellScheduleService: mockBellScheduleService,
}));

vi.mock('../repository/timetable.repository.js', () => ({
  timetableRepository: mockTimetableRepository,
}));

import { timetableService } from './timetable.service.js';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';
const TERM_ID = '00000000-0000-7000-8000-000000000010';
const CLASS_ARM_ID = '00000000-0000-7000-8000-000000000020';
const SUBJECT_ID = '00000000-0000-7000-8000-000000000030';
const TEACHER_ID = '00000000-0000-7000-8000-000000000040';
const OTHER_TEACHER_ID = '00000000-0000-7000-8000-000000000041';
const OTHER_CLASS_ARM_ID = '00000000-0000-7000-8000-000000000021';

const builderActor = {
  userId: '00000000-0000-7000-8000-000000000099',
  tenantId: TENANT_ID,
  role: 'timetable_officer',
};

const teacherActor = {
  userId: '00000000-0000-7000-8000-000000000098',
  tenantId: TENANT_ID,
  role: 'teacher',
};

const baseInput = {
  termId: TERM_ID,
  classArmId: CLASS_ARM_ID,
  subjectId: SUBJECT_ID,
  teacherStaffProfileId: TEACHER_ID,
  dayOfWeek: 1,
  startMinute: 480,
  endMinute: 525,
};

function openTerm() {
  mockAcademicRepository.findTermById.mockResolvedValue({
    id: TERM_ID,
    name: 'First Term',
    status: 'open',
    academicYearId: '00000000-0000-7000-8000-000000000005',
  });
}

function validAssignment() {
  mockStaffRepository.listSubjectAssignmentsForClassArm.mockResolvedValue([
    {
      subjectId: SUBJECT_ID,
      teacherStaffProfileId: TEACHER_ID,
      subjectLabel: 'Mathematics',
      teacherName: 'Mr Ade',
    },
  ]);
}

describe('timetableService.createEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    openTerm();
    mockAcademicRepository.findClassArmById.mockResolvedValue({ id: CLASS_ARM_ID, classLevelId: 'level-1' });
    validAssignment();
    mockTimetableRepository.findOverlapping.mockResolvedValue([]);
    mockTimetableRepository.create.mockResolvedValue({
      id: 'entry-1',
      ...baseInput,
      tenantId: TENANT_ID,
      status: 'draft',
    });
  });

  it('rejects edits when the term is closed', async () => {
    mockAcademicRepository.findTermById.mockResolvedValue({ id: TERM_ID, status: 'closed' });

    await expect(
      timetableService.createEntry(TENANT_ID, baseInput, builderActor, 'req-1'),
    ).rejects.toMatchObject({ code: 'ACADEMIC_TERM_NOT_OPEN', statusCode: 409 });
  });

  it('rejects subject/teacher pairs that are not assigned to the class', async () => {
    mockStaffRepository.listSubjectAssignmentsForClassArm.mockResolvedValue([]);

    await expect(
      timetableService.createEntry(TENANT_ID, baseInput, builderActor, 'req-1'),
    ).rejects.toMatchObject({ code: 'ACADEMIC_TIMETABLE_ASSIGNMENT_INVALID', statusCode: 422 });
  });

  it('rejects teacher double-booking (US-ACA-006)', async () => {
    mockTimetableRepository.findOverlapping.mockResolvedValue([
      {
        id: 'existing-1',
        classArmId: OTHER_CLASS_ARM_ID,
        teacherStaffProfileId: TEACHER_ID,
      },
    ]);

    await expect(
      timetableService.createEntry(TENANT_ID, baseInput, builderActor, 'req-1'),
    ).rejects.toMatchObject({
      code: 'ACADEMIC_TIMETABLE_CONFLICT',
      statusCode: 409,
      details: { conflictType: 'teacher' },
    });
  });

  it('rejects class double-booking', async () => {
    mockTimetableRepository.findOverlapping.mockResolvedValue([
      {
        id: 'existing-1',
        classArmId: CLASS_ARM_ID,
        teacherStaffProfileId: OTHER_TEACHER_ID,
      },
    ]);

    await expect(
      timetableService.createEntry(TENANT_ID, baseInput, builderActor, 'req-1'),
    ).rejects.toMatchObject({
      code: 'ACADEMIC_TIMETABLE_CONFLICT',
      statusCode: 409,
      details: { conflictType: 'class' },
    });
  });

  it('creates a draft entry and writes audit on success', async () => {
    const entry = await timetableService.createEntry(TENANT_ID, baseInput, builderActor, 'req-1');

    expect(entry.id).toBe('entry-1');
    expect(mockTimetableRepository.create).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ termId: TERM_ID, classArmId: CLASS_ARM_ID }),
      builderActor.userId,
    );
    expect(mockWriteAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'academic.timetable.entry_created' }),
    );
  });
});

describe('timetableService.deleteEntry', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks published entries for removal instead of deleting immediately', async () => {
    mockTimetableRepository.findById.mockResolvedValue({
      id: 'entry-1',
      status: 'published',
      termId: TERM_ID,
      classArmId: CLASS_ARM_ID,
    });
    mockTimetableRepository.markForRemoval.mockResolvedValue({
      id: 'entry-1',
      status: 'marked_for_removal',
      termId: TERM_ID,
      classArmId: CLASS_ARM_ID,
    });

    const result = await timetableService.deleteEntry(TENANT_ID, 'entry-1', builderActor, 'req-1');

    expect(result.status).toBe('marked_for_removal');
    expect(mockTimetableRepository.deleteById).not.toHaveBeenCalled();
    expect(mockWriteAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'academic.timetable.entry_marked_for_removal' }),
    );
  });

  it('hard-deletes draft entries', async () => {
    mockTimetableRepository.findById.mockResolvedValue({
      id: 'entry-2',
      status: 'draft',
      termId: TERM_ID,
      classArmId: CLASS_ARM_ID,
    });
    mockTimetableRepository.deleteById.mockResolvedValue({
      id: 'entry-2',
      status: 'draft',
      termId: TERM_ID,
      classArmId: CLASS_ARM_ID,
    });

    await timetableService.deleteEntry(TENANT_ID, 'entry-2', builderActor, 'req-1');

    expect(mockTimetableRepository.markForRemoval).not.toHaveBeenCalled();
    expect(mockTimetableRepository.deleteById).toHaveBeenCalledWith(TENANT_ID, 'entry-2');
  });
});

describe('timetableService.publishTimetable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects publish when there is nothing pending', async () => {
    openTerm();
    mockTimetableRepository.listPendingForTerm.mockResolvedValue([]);

    await expect(
      timetableService.publishTimetable(TENANT_ID, { termId: TERM_ID }, builderActor, 'req-1'),
    ).rejects.toMatchObject({ code: 'ACADEMIC_TIMETABLE_NOTHING_TO_PUBLISH', statusCode: 422 });
  });

  it('publishes all pending drafts and emits per-class events', async () => {
    openTerm();
    mockTimetableRepository.listPendingForTerm.mockResolvedValue([
      { classArmId: CLASS_ARM_ID, status: 'draft' },
      { classArmId: OTHER_CLASS_ARM_ID, status: 'marked_for_removal' },
    ]);
    mockTimetableRepository.publishTerm.mockResolvedValue([
      { classArmId: CLASS_ARM_ID, status: 'published' },
      { classArmId: CLASS_ARM_ID, status: 'published' },
    ]);

    const result = await timetableService.publishTimetable(
      TENANT_ID,
      { termId: TERM_ID },
      builderActor,
      'req-1',
    );

    expect(result.publishedSlotCount).toBe(2);
    expect(result.publishedClassArms).toBe(2);
    expect(mockPublishTimetablePublished).toHaveBeenCalledTimes(2);
    expect(mockWriteAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'academic.timetable.published' }),
    );
  });
});

describe('timetableService.getPublishPreview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pairs draft and removal at the same slot as a replacement change', async () => {
    openTerm();
    mockAcademicRepository.listClassArms.mockResolvedValue([
      { id: CLASS_ARM_ID, classLevelId: 'level-1', name: 'A' },
    ]);
    mockAcademicRepository.listClassLevels.mockResolvedValue([{ id: 'level-1', code: 'JSS1' }]);
    mockTimetableRepository.listPendingForTerm.mockResolvedValue([
      {
        id: 'draft-1',
        classArmId: CLASS_ARM_ID,
        subjectId: SUBJECT_ID,
        teacherName: 'Mr Ade',
        dayOfWeek: 1,
        startMinute: 480,
        endMinute: 525,
        status: 'draft',
      },
      {
        id: 'remove-1',
        classArmId: CLASS_ARM_ID,
        subjectId: 'old-subject',
        teacherName: 'Mrs B',
        dayOfWeek: 1,
        startMinute: 480,
        endMinute: 525,
        status: 'marked_for_removal',
      },
      {
        id: 'remove-2',
        classArmId: CLASS_ARM_ID,
        subjectId: 'gone-subject',
        teacherName: 'Mr C',
        dayOfWeek: 2,
        startMinute: 525,
        endMinute: 570,
        status: 'marked_for_removal',
      },
    ]);

    const preview = await timetableService.getPublishPreview(TENANT_ID, TERM_ID, builderActor);

    expect(preview.changes).toHaveLength(1);
    expect(preview.changes[0]?.added.entryId).toBe('draft-1');
    expect(preview.changes[0]?.removed.entryId).toBe('remove-1');
    expect(preview.removals).toHaveLength(1);
    expect(preview.removals[0]?.entryId).toBe('remove-2');
    expect(preview.additions).toHaveLength(0);
  });
});

describe('timetableService.listTimetable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns published-only rows for read-only roles', async () => {
    mockTimetableRepository.list.mockResolvedValue([]);

    await timetableService.listTimetable(
      TENANT_ID,
      { termId: TERM_ID, classArmId: CLASS_ARM_ID },
      teacherActor,
    );

    expect(mockTimetableRepository.list).toHaveBeenCalledWith(
      TENANT_ID,
      TERM_ID,
      CLASS_ARM_ID,
      true,
    );
  });

  it('includes drafts for timetable builders', async () => {
    mockTimetableRepository.list.mockResolvedValue([]);

    await timetableService.listTimetable(
      TENANT_ID,
      { termId: TERM_ID, classArmId: CLASS_ARM_ID },
      builderActor,
    );

    expect(mockTimetableRepository.list).toHaveBeenCalledWith(
      TENANT_ID,
      TERM_ID,
      CLASS_ARM_ID,
      false,
    );
  });
});

describe('timetableService.listMyTimetable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns published periods for the logged-in teacher', async () => {
    mockStaffRepository.findProfileByUserId.mockResolvedValue({ id: TEACHER_ID });
    mockTimetableRepository.listByTeacherForTerm.mockResolvedValue([
      {
        id: 'entry-1',
        tenantId: TENANT_ID,
        termId: TERM_ID,
        classArmId: CLASS_ARM_ID,
        subjectId: SUBJECT_ID,
        teacherStaffProfileId: TEACHER_ID,
        teacherName: 'Mr Ade',
        classLevelCode: 'JSS1',
        classArmName: 'A',
        dayOfWeek: 1,
        startMinute: 480,
        endMinute: 525,
        status: 'published',
        createdById: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await timetableService.listMyTimetable(TENANT_ID, TERM_ID, teacherActor);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.classArmLabel).toBe('JSS1 A');
    expect(mockTimetableRepository.listByTeacherForTerm).toHaveBeenCalledWith(
      TENANT_ID,
      TERM_ID,
      TEACHER_ID,
    );
  });
});

describe('timetableService.listSubjectOptions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires builder role', async () => {
    await expect(
      timetableService.listSubjectOptions(
        TENANT_ID,
        { termId: TERM_ID, classArmId: CLASS_ARM_ID },
        teacherActor,
      ),
    ).rejects.toBeInstanceOf(LoomisError);
  });
});
