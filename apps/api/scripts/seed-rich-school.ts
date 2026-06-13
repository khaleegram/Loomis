/**
 * Rich demo school — 12 classes, 467 students, 20 staff, timetables, 3 terms.
 *
 * Usage (after db:up + migrate; platform seed optional but tier/PSF must exist):
 *   pnpm db:seed:rich
 *
 * Idempotent: skips if principal@loomis.com already exists.
 * Does not replace the small demo school from db:seed.
 */
import { eq } from 'drizzle-orm';
import type { Role, StaffPrimaryRole } from '@loomis/contracts';
import { uuidv7 } from 'uuidv7';
import { tiers } from '../drizzle/schema/tenant.js';
import { roleAssignments, staffProfiles } from '../drizzle/schema/hrm.js';
import { academicRepository } from '../src/modules/academic/repository/academic.repository.js';
import { academicYearService } from '../src/modules/academic/services/academic-year.service.js';
import { classStructureService } from '../src/modules/academic/services/class-structure.service.js';
import { gradebookService } from '../src/modules/academic/services/gradebook.service.js';
import { termService } from '../src/modules/academic/services/term.service.js';
import { timetableRepository } from '../src/modules/academic/repository/timetable.repository.js';
import { timetableService } from '../src/modules/academic/services/timetable.service.js';
import { mfaRepository } from '../src/modules/identity/repository/mfa.repository.js';
import { userRepository } from '../src/modules/identity/repository/user.repository.js';
import { mfaService } from '../src/modules/identity/services/mfa.service.js';
import { passwordService } from '../src/modules/identity/services/password.service.js';
import { MFA_MANDATORY_ROLES } from '../src/modules/identity/types.js';
import { staffRepository } from '../src/modules/hrm/repository/staff.repository.js';
import { admissionService } from '../src/modules/student/services/admission.service.js';
import { enrollmentService } from '../src/modules/student/services/enrollment.service.js';
import { studentService } from '../src/modules/student/services/student.service.js';
import { psfRateService } from '../src/modules/tenant/services/psf-rate.service.js';
import { tenantService } from '../src/modules/tenant/services/tenant.service.js';
import { withTenantContext } from '../src/shared/tenant-context.js';

const PLATFORM_OWNER_EMAIL = 'owner@demo.loomis.local';
const SEED_EMAIL_DOMAIN = 'loomis.com';
const DEV_PASSWORD = 'LoomisDev2026!';
const DEV_TOTP_BASE32 = 'JBSWY3DPEHPK3PXP';
const TIER_CODE = 'demo';
const PSF_RATE_MINOR = 500_000;
const MARKER_EMAIL = `principal@${SEED_EMAIL_DOMAIN}`;
/** Audit `request_id` column is UUID — not an arbitrary string. */
const SEED_REQUEST_ID = uuidv7();

function seedEmail(local: string): string {
  return `${local}@${SEED_EMAIL_DOMAIN}`;
}

const SUBJECTS = [
  { id: '019c0000-0000-7000-8000-000000000001', code: 'MTH' },
  { id: '019c0000-0000-7000-8000-000000000002', code: 'ENG' },
  { id: '019c0000-0000-7000-8000-000000000003', code: 'BSC' },
  { id: '019c0000-0000-7000-8000-000000000004', code: 'SST' },
  { id: '019c0000-0000-7000-8000-000000000005', code: 'CIV' },
  { id: '019c0000-0000-7000-8000-000000000006', code: 'CMP' },
];

const PERIOD_SLOTS = [
  { dayOfWeek: 1, startMinute: 480, endMinute: 520 },
  { dayOfWeek: 1, startMinute: 520, endMinute: 560 },
  { dayOfWeek: 1, startMinute: 560, endMinute: 600 },
  { dayOfWeek: 2, startMinute: 480, endMinute: 520 },
  { dayOfWeek: 2, startMinute: 520, endMinute: 560 },
  { dayOfWeek: 3, startMinute: 480, endMinute: 520 },
  { dayOfWeek: 3, startMinute: 520, endMinute: 560 },
  { dayOfWeek: 4, startMinute: 480, endMinute: 520 },
  { dayOfWeek: 4, startMinute: 520, endMinute: 560 },
  { dayOfWeek: 5, startMinute: 480, endMinute: 520 },
  { dayOfWeek: 5, startMinute: 520, endMinute: 560 },
];

const CLASS_LEVELS = [
  { code: 'JSS1', name: 'Junior Secondary 1', rank: 1 },
  { code: 'JSS2', name: 'Junior Secondary 2', rank: 2 },
  { code: 'JSS3', name: 'Junior Secondary 3', rank: 3 },
  { code: 'SS1', name: 'Senior Secondary 1', rank: 4 },
  { code: 'SS2', name: 'Senior Secondary 2', rank: 5 },
  { code: 'SS3', name: 'Senior Secondary 3', rank: 6 },
] as const;

const ARMS = ['A', 'B'] as const;
const TOTAL_STUDENTS = 467;
const TOTAL_CLASSES = CLASS_LEVELS.length * ARMS.length;

interface StaffSpec {
  email: string;
  role: Role;
  fullName: string;
  primaryRole: StaffPrimaryRole;
  phone: string;
  classTeacher?: boolean;
}

function buildStaffSpecs(): StaffSpec[] {
  const specs: StaffSpec[] = [
    {
      email: MARKER_EMAIL,
      role: 'principal',
      fullName: 'Adaeze Okonkwo',
      primaryRole: 'principal',
      phone: '+2348011000001',
    },
    {
      email: seedEmail('exam'),
      role: 'exam_officer',
      fullName: 'Emeka Nwosu',
      primaryRole: 'exam_officer',
      phone: '+2348011000002',
    },
    {
      email: seedEmail('timetable'),
      role: 'timetable_officer',
      fullName: 'Funke Adeyemi',
      primaryRole: 'timetable_officer',
      phone: '+2348011000003',
    },
    {
      email: seedEmail('admin'),
      role: 'admin_officer',
      fullName: 'Ibrahim Musa',
      primaryRole: 'admin_officer',
      phone: '+2348011000004',
    },
  ];

  for (let i = 1; i <= 16; i++) {
    specs.push({
      email: seedEmail(`teacher${String(i).padStart(2, '0')}`),
      role: i <= 12 ? 'class_teacher' : 'teacher',
      fullName: `Teacher ${String(i).padStart(2, '0')}`,
      primaryRole: 'teacher',
      phone: `+234801100${String(100 + i).padStart(4, '0')}`,
      classTeacher: i <= 12,
    });
  }
  return specs;
}

async function ensureTier(code: string) {
  return withTenantContext(null, async (tx) => {
    const [existing] = await tx.select().from(tiers).where(eq(tiers.code, code)).limit(1);
    if (existing) return existing;
    const [tier] = await tx
      .insert(tiers)
      .values({ code, name: 'Demo Tier', defaultPsfRateMinor: PSF_RATE_MINOR })
      .returning();
    if (!tier) throw new Error('Failed to create demo tier');
    return tier;
  });
}

async function enrollDevMfa(userId: string) {
  const encrypted = mfaService.encryptSecret(DEV_TOTP_BASE32);
  const existing = await mfaRepository.findByUserId(userId);
  if (existing) {
    await mfaRepository.updateEncryptedSecret(userId, encrypted, 'pending');
  } else {
    await mfaRepository.create({ userId, encryptedSecret: encrypted, status: 'pending' });
  }
  const { hashed } = await mfaService.generateBackupCodes();
  await mfaRepository.activate(userId, hashed);
}

async function createStaffUser(spec: StaffSpec, tenantId: string, createdById: string) {
  const existing = await userRepository.findByEmail(spec.email);
  if (existing) {
    const profile = await staffRepository.findProfileByUserId(tenantId, existing.id);
    if (!profile) throw new Error(`Staff profile missing for ${spec.email}`);
    return { user: existing, profile };
  }

  const passwordHash = await passwordService.hash(DEV_PASSWORD);
  const user = await userRepository.create({
    email: spec.email,
    passwordHash,
    role: spec.role,
    tenantId,
    displayName: spec.fullName,
    mfaRequired: MFA_MANDATORY_ROLES.has(spec.role),
    status: 'active',
    phone: spec.phone,
  });

  if (MFA_MANDATORY_ROLES.has(spec.role)) {
    await enrollDevMfa(user.id);
  }

  const profile = await withTenantContext(tenantId, async (tx) => {
    const now = new Date();
    const [row] = await tx
      .insert(staffProfiles)
      .values({
        tenantId,
        userId: user.id,
        fullName: spec.fullName,
        email: spec.email.toLowerCase(),
        phone: spec.phone,
        status: 'active',
        joinedAt: now,
        createdById,
      })
      .returning();
    if (!row) throw new Error(`Failed to create staff profile for ${spec.email}`);

    await tx.insert(roleAssignments).values({
      tenantId,
      staffProfileId: row.id,
      role: spec.primaryRole,
      assignmentType: 'primary',
      approvedById: createdById,
    });

    if (spec.classTeacher) {
      await tx.insert(roleAssignments).values({
        tenantId,
        staffProfileId: row.id,
        role: 'class_teacher',
        assignmentType: 'extension',
        approvedById: createdById,
      });
    }

    return row;
  });

  return { user, profile };
}

async function seedStudentsForClass(
  tenantId: string,
  actor: { userId: string; role: Role; tenantId: string },
  termId: string,
  classArmId: string,
  classLevelId: string,
  count: number,
  startIndex: number,
) {
  for (let i = 0; i < count; i++) {
    const n = startIndex + i;
    const admission = await admissionService.createAdmission(
      tenantId,
      {
        firstName: 'Student',
        lastName: String(n).padStart(3, '0'),
        dateOfBirth: '2011-03-15',
        gender: n % 2 === 0 ? 'female' : 'male',
        intendedClassLevelId: classLevelId,
        guardianName: `Guardian ${n}`,
        guardianEmail: seedEmail(`guardian${n}`),
        guardianPhone: '+2348012345678',
        guardianRelationship: 'father',
      },
      actor,
    );

    const decided = await admissionService.decideAdmission(
      tenantId,
      admission.id,
      { decision: 'approve', admissionNo: `GFA-${String(n).padStart(4, '0')}` },
      actor,
    );
    const studentId = decided.student?.id;
    if (!studentId) throw new Error('Student not created from admission');

    await studentService.recordIdentityAttestation(
      tenantId,
      studentId,
      { attestationType: 'birth_certificate' },
      actor,
    );

    await enrollmentService.enrollStudent(tenantId, studentId, { termId, classArmId }, actor);
  }
}

function printRichCredentials(tenantId: string) {
  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  Loomis RICH demo school — Greenfield Academy Lagos');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  Tenant ID:   ${tenantId}`);
  console.log(`  Password:    ${DEV_PASSWORD}`);
  console.log('');
  console.log('  Key logins:');
  console.log(`    • ${seedEmail('principal')}  (principal)`);
  console.log(`    • ${seedEmail('timetable')}  (timetable officer → /school/timetable)`);
  console.log(`    • ${seedEmail('exam')}  (exam officer → /school/exams)`);
  console.log(`    • ${seedEmail('teacher01')}  (class teacher JSS1 A)`);
  console.log('');
  console.log('  Data: 12 classes · 467 students · 20 staff · published timetables');
  console.log('  Try: /school/timetable · /school/students · /school/academic');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
}

async function seedTimetables(
  tenantId: string,
  openTermId: string,
  classArms: { id: string }[],
  teachers: { staffProfileId: string }[],
) {
  const timetableOfficer = await userRepository.findByEmail(seedEmail('timetable'));
  if (!timetableOfficer) throw new Error('Timetable officer missing');

  const timetableActor = {
    userId: timetableOfficer.id,
    role: 'timetable_officer' as Role,
    tenantId,
  };

  console.log('  Building and publishing timetables…');
  for (let armIndex = 0; armIndex < classArms.length; armIndex++) {
    const arm = classArms[armIndex]!;
    const existing = await timetableRepository.list(tenantId, openTermId, arm.id, false);
    const published = existing.filter((e) => e.status === 'published');

    if (published.length >= PERIOD_SLOTS.length) {
      continue;
    }

    if (existing.length === 0) {
      for (let slotIndex = 0; slotIndex < PERIOD_SLOTS.length; slotIndex++) {
        const slot = PERIOD_SLOTS[slotIndex]!;
        const subjectIndex = slotIndex % SUBJECTS.length;
        const subject = SUBJECTS[subjectIndex]!;
        const teacher = teachers[(armIndex + subjectIndex) % teachers.length]!;
        await timetableService.createEntry(
          tenantId,
          {
            termId: openTermId,
            classArmId: arm.id,
            subjectId: subject.id,
            teacherStaffProfileId: teacher.staffProfileId,
            dayOfWeek: slot.dayOfWeek,
            startMinute: slot.startMinute,
            endMinute: slot.endMinute,
          },
          timetableActor,
          SEED_REQUEST_ID,
        );
      }
    }
  }

  await timetableService.publishTimetable(
    tenantId,
    { termId: openTermId },
    timetableActor,
    SEED_REQUEST_ID,
  );
}

/** Finish timetables when a prior run failed after enrolling students. */
async function resumeRichSeedTimetables(tenantId: string): Promise<boolean> {
  const years = await academicRepository.listYears(tenantId);
  const year = years.find((y) => y.status === 'active') ?? years[0];
  if (!year) return false;

  const terms = await academicRepository.listTermsByYear(tenantId, year.id);
  const openTerm = terms.find((t) => t.status === 'open');
  if (!openTerm) return false;

  const arms = await academicRepository.listClassArms(tenantId, year.id);
  if (arms.length === 0) return false;

  const firstPublished = await timetableRepository.list(tenantId, openTerm.id, arms[0]!.id, true);
  if (firstPublished.length >= PERIOD_SLOTS.length) {
    return false;
  }

  console.log('  Resuming rich seed — completing timetables…');

  const profiles = await staffRepository.listProfiles(tenantId);
  const teachers = profiles
    .filter((row) => row.profile.email.startsWith('teacher'))
    .map((row) => ({ staffProfileId: row.profile.id }));

  if (teachers.length === 0) throw new Error('No teacher profiles found for resume');

  await seedTimetables(tenantId, openTerm.id, arms, teachers);
  return true;
}

async function main() {
  const existing = await userRepository.findByEmail(MARKER_EMAIL);
  if (existing?.tenantId) {
    const resumed = await resumeRichSeedTimetables(existing.tenantId);
    printRichCredentials(existing.tenantId);
    console.log(
      resumed ? 'Rich seed timetables completed (resumed).' : 'Rich seed already applied.',
    );
    return;
  }

  console.log('Seeding rich demo school (this may take several minutes)…');

  const platformOwner = await userRepository.findByEmail(PLATFORM_OWNER_EMAIL);
  if (!platformOwner) {
    throw new Error('Run pnpm db:seed first to create platform owner.');
  }

  await ensureTier(TIER_CODE);
  try {
    await psfRateService.setGlobalPsfRate(
      {
        rateMinor: PSF_RATE_MINOR,
        effectiveFrom: new Date('2026-01-01'),
        reason: 'Rich dev seed',
      },
      { userId: platformOwner.id, role: 'platform_owner' },
    );
  } catch {
    /* global rate may already exist */
  }

  const tenant = await tenantService.provisionTenant(
    {
      name: 'Greenfield Academy Lagos',
      region: 'Lagos',
      contactEmail: seedEmail('contact'),
      address: '12 Greenfield Avenue, Lekki, Lagos',
      tierCode: TIER_CODE,
      initialPsfRateMinor: PSF_RATE_MINOR,
    },
    { userId: platformOwner.id, role: 'platform_owner' },
  );

  const staffSpecs = buildStaffSpecs();
  const staffProfiles: { email: string; staffProfileId: string; userId: string }[] = [];

  for (const spec of staffSpecs) {
    const { user, profile } = await createStaffUser(spec, tenant.id, platformOwner.id);
    staffProfiles.push({ email: spec.email, staffProfileId: profile.id, userId: user.id });
  }

  const principal = staffProfiles.find((s) => s.email === MARKER_EMAIL);
  if (!principal) throw new Error('Principal missing');

  const actor = { userId: principal.userId, role: 'principal' as Role, tenantId: tenant.id };

  const year = await academicYearService.createYear(
    tenant.id,
    {
      label: '2025/2026',
      startDate: '2025-09-01',
      endDate: '2026-07-31',
      termCount: 3,
    },
    actor,
  );
  await academicYearService.activateYear(tenant.id, year.id, actor);

  const draftTerms = await academicRepository.listTermsByYear(tenant.id, year.id);
  const termConfigs = [
    {
      name: 'First Term',
      startDate: '2025-09-01',
      endDate: '2025-12-15',
      enrollmentWindowOpenDate: '2025-09-01',
      enrollmentWindowCloseDate: '2025-10-31',
      censusLockDate: '2025-11-01',
      examStartDate: '2025-11-15',
      examEndDate: '2025-12-10',
    },
    {
      name: 'Second Term',
      startDate: '2026-01-08',
      endDate: '2026-04-04',
      enrollmentWindowOpenDate: '2026-01-08',
      enrollmentWindowCloseDate: '2026-01-31',
      censusLockDate: '2026-02-01',
      examStartDate: '2026-03-15',
      examEndDate: '2026-04-01',
    },
    {
      name: 'Third Term',
      startDate: '2026-04-20',
      endDate: '2026-07-10',
      enrollmentWindowOpenDate: '2026-04-20',
      enrollmentWindowCloseDate: '2026-05-01',
      censusLockDate: '2026-05-05',
      examStartDate: '2026-06-15',
      examEndDate: '2026-07-05',
    },
  ];

  for (let i = 0; i < draftTerms.length; i++) {
    const term = draftTerms[i];
    const cfg = termConfigs[i];
    if (!term || !cfg) continue;
    await termService.configureTerm(tenant.id, term.id, cfg, actor);
    if (i === 0) {
      await termService.openTerm(tenant.id, term.id, actor);
    }
  }

  const openTerm = (await academicRepository.listTermsByYear(tenant.id, year.id)).find(
    (t) => t.status === 'open',
  );
  if (!openTerm) throw new Error('Open term missing');

  const levelRows = [];
  for (const level of CLASS_LEVELS) {
    const row = await classStructureService.createClassLevel(
      tenant.id,
      { code: level.code, name: level.name, rank: level.rank, isTerminal: level.rank === 6 },
      actor,
    );
    levelRows.push(row);
  }

  const classArms: { id: string; levelId: string; label: string }[] = [];
  for (const level of levelRows) {
    for (const armName of ARMS) {
      const arm = await classStructureService.createClassArm(
        tenant.id,
        { academicYearId: year.id, classLevelId: level.id, name: armName },
        actor,
      );
      classArms.push({
        id: arm.id,
        levelId: level.id,
        label: `${level.code} ${armName}`,
      });
    }
  }

  const teachers = staffProfiles.filter((s) => s.email.startsWith('teacher'));
  let studentCounter = 1;
  const basePerClass = Math.floor(TOTAL_STUDENTS / TOTAL_CLASSES);
  let remainder = TOTAL_STUDENTS - basePerClass * TOTAL_CLASSES;

  for (let armIndex = 0; armIndex < classArms.length; armIndex++) {
    const arm = classArms[armIndex]!;
    const extra = remainder > 0 ? 1 : 0;
    if (extra) remainder -= 1;
    const count = basePerClass + extra;

    console.log(`  Enrolling ${count} students in ${arm.label}…`);
    await seedStudentsForClass(
      tenant.id,
      actor,
      openTerm.id,
      arm.id,
      arm.levelId,
      count,
      studentCounter,
    );
    studentCounter += count;

    const classTeacher = teachers[armIndex];
    if (classTeacher) {
      await staffRepository.assignClassTeacher({
        tenantId: tenant.id,
        staffProfileId: classTeacher.staffProfileId,
        termId: openTerm.id,
        classArmId: arm.id,
        actorUserId: principal.userId,
      });
    }

    for (let s = 0; s < SUBJECTS.length; s++) {
      const subject = SUBJECTS[s]!;
      const teacher = teachers[(armIndex + s) % teachers.length]!;
      await staffRepository.createSubjectAssignment({
        tenantId: tenant.id,
        staffProfileId: teacher.staffProfileId,
        termId: openTerm.id,
        classArmId: arm.id,
        subjectId: subject.id,
        actorUserId: principal.userId,
        approvedById: principal.userId,
      });
    }
  }

  const scheme = await gradebookService.createGradingScheme(
    tenant.id,
    {
      name: 'Greenfield Standard 40/60',
      continuousAssessmentWeight: 40,
      examWeight: 60,
      passMark: 40,
      gradeBands: [
        { minScore: 70, maxScore: 100, grade: 'A', remark: 'Excellent' },
        { minScore: 60, maxScore: 69, grade: 'B', remark: 'Very Good' },
        { minScore: 50, maxScore: 59, grade: 'C', remark: 'Good' },
        { minScore: 45, maxScore: 49, grade: 'D', remark: 'Pass' },
        { minScore: 0, maxScore: 44, grade: 'F', remark: 'Fail' },
      ],
      isDefault: true,
    },
    actor,
  );

  await gradebookService.createExamConfig(
    tenant.id,
    {
      termId: openTerm.id,
      classArmId: classArms[0]!.id,
      subjectId: SUBJECTS[0]!.id,
      gradingSchemeId: scheme.id,
      title: 'First Term Mathematics',
    },
    actor,
  );

  await seedTimetables(
    tenant.id,
    openTerm.id,
    classArms,
    teachers.map((t) => ({ staffProfileId: t.staffProfileId })),
  );

  printRichCredentials(tenant.id);
  console.log('Rich seed completed.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Rich seed failed:', err);
    process.exit(1);
  });
