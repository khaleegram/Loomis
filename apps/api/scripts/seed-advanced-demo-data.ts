/**
 * Minimal academic + student demo data for the Advanced QA school on production.
 * Run after `seed-dev.ts` (principal@advanced.loomis.com must exist).
 *
 * Usage:
 *   node --env-file=../../.env.railway.local ./node_modules/tsx/dist/cli.mjs scripts/seed-advanced-demo-data.ts
 */
import type { Role } from '@loomis/contracts';
import { academicRepository } from '../src/modules/academic/repository/academic.repository.js';
import { academicYearService } from '../src/modules/academic/services/academic-year.service.js';
import { classStructureService } from '../src/modules/academic/services/class-structure.service.js';
import { termService } from '../src/modules/academic/services/term.service.js';
import { userRepository } from '../src/modules/identity/repository/user.repository.js';
import { admissionService } from '../src/modules/student/services/admission.service.js';
import { enrollmentService } from '../src/modules/student/services/enrollment.service.js';
import { studentRepository } from '../src/modules/student/repository/student.repository.js';
import { studentService } from '../src/modules/student/services/student.service.js';
import { ADVANCED_SCHOOL_SLUG, schoolDevEmail } from './seed-email.js';

const PRINCIPAL_EMAIL = schoolDevEmail('principal', ADVANCED_SCHOOL_SLUG);
const ENROLLED_TARGET = 24;
const PENDING_ADMISSIONS = 4;

async function main() {
  const principalUser = await userRepository.findByEmail(PRINCIPAL_EMAIL);
  if (!principalUser?.tenantId) {
    throw new Error('Advanced principal missing — run seed-dev.ts first.');
  }

  const tenantId = principalUser.tenantId;
  const actor = { userId: principalUser.id, role: 'principal' as Role, tenantId };

  const existingStudents = await studentRepository.listStudents(tenantId);
  const enrolledCount = existingStudents.filter((s) => s.status === 'enrolled').length;
  if (enrolledCount >= ENROLLED_TARGET) {
    console.log(`Advanced demo already has ${enrolledCount} enrolled students — skipping.`);
    return;
  }

  console.log('Seeding Advanced QA demo data (calendar, classes, students, admissions)…');
  const admittedOnly = existingStudents.filter((s) => s.status === 'admitted');
  if (admittedOnly.length > 0) {
    console.log(`  Resuming ${admittedOnly.length} admitted student(s) from a prior interrupted run…`);
  }

  let year = (await academicRepository.listYears(tenantId)).find((y) => y.status === 'active');
  if (!year) {
    year = await academicYearService.createYear(
      tenantId,
      {
        label: '2025/2026',
        startDate: '2025-09-01',
        endDate: '2026-07-31',
        termCount: 3,
      },
      actor,
    );
    await academicYearService.activateYear(tenantId, year.id, actor);
  }

  let terms = await academicRepository.listTermsByYear(tenantId, year.id);
  if (terms.length === 0) {
    throw new Error('Expected draft terms after year activation');
  }

  const firstTerm = terms[0]!;
  if (firstTerm.status === 'draft') {
    await termService.configureTerm(
      tenantId,
      firstTerm.id,
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
      actor,
    );
    await termService.openTerm(tenantId, firstTerm.id, actor);
    terms = await academicRepository.listTermsByYear(tenantId, year.id);
  }

  const openTerm = terms.find((t) => t.status === 'open') ?? terms[0];
  if (!openTerm) throw new Error('No term available for enrollment');

  let level = (await academicRepository.listClassLevels(tenantId)).find((l) => l.code === 'JSS1');
  if (!level) {
    level = await classStructureService.createClassLevel(
      tenantId,
      { code: 'JSS1', name: 'Junior Secondary 1', rank: 4, isTerminal: false },
      actor,
    );
  }

  let arms = await academicRepository.listClassArms(tenantId, year.id);
  if (arms.length === 0) {
    for (const armName of ['A', 'B']) {
      await classStructureService.createClassArm(
        tenantId,
        { academicYearId: year.id, classLevelId: level.id, name: armName },
        actor,
      );
    }
    arms = await academicRepository.listClassArms(tenantId, year.id);
  }

  const jss1a = arms.find((a) => a.name === 'A') ?? arms[0];
  if (!jss1a) throw new Error('Class arm missing');

  async function enrollAdmittedStudent(studentId: string) {
    const student = await studentRepository.findStudentById(tenantId, studentId);
    if (!student) throw new Error('Student not found');
    if (student.status === 'enrolled') return;
    if (!student.identityAttestationType) {
      await studentService.recordIdentityAttestation(
        tenantId,
        studentId,
        { attestationType: 'birth_certificate' },
        actor,
      );
    }
    await enrollmentService.enrollStudent(
      tenantId,
      studentId,
      { termId: openTerm.id, classArmId: jss1a.id },
      actor,
    );
  }

  for (const row of admittedOnly) {
    await enrollAdmittedStudent(row.id);
  }

  const enrolledAfterResume = (await studentRepository.listStudents(tenantId)).filter(
    (s) => s.status === 'enrolled',
  ).length;

  let studentNo = 1;
  for (const row of await studentRepository.listStudents(tenantId)) {
    if (row.admissionNo?.startsWith('ADV-')) {
      const n = Number.parseInt(row.admissionNo.replace('ADV-', ''), 10);
      if (Number.isFinite(n) && n >= studentNo) studentNo = n + 1;
    }
  }

  const toEnroll = ENROLLED_TARGET - enrolledAfterResume;
  for (let i = 0; i < toEnroll; i++) {
    const n = studentNo + i;
    const created = await admissionService.createAdmission(
      tenantId,
      {
        firstName: 'Student',
        lastName: String(n).padStart(3, '0'),
        dateOfBirth: '2012-05-10',
        gender: n % 2 === 0 ? 'female' : 'male',
        intendedClassLevelId: level.id,
        guardianName: `Guardian ${n}`,
        guardianEmail: schoolDevEmail(`guardian${n}`, ADVANCED_SCHOOL_SLUG),
        guardianPhone: '+2348012345678',
        guardianRelationship: 'mother',
      },
      actor,
    );

    let studentId = created.student?.id ?? null;
    if (!studentId) {
      const decided = await admissionService.decideAdmission(
        tenantId,
        created.admission.id,
        { decision: 'approve', admissionNo: `ADV-${String(n).padStart(4, '0')}` },
        actor,
      );
      studentId = decided.student?.id ?? null;
    }
    if (!studentId) throw new Error('Student not created from admission');

    await enrollAdmittedStudent(studentId);
  }

  const pendingExisting = (await studentRepository.listAdmissions(tenantId)).filter(
    (a) => a.status === 'pending',
  ).length;
  const pendingToAdd = Math.max(0, PENDING_ADMISSIONS - pendingExisting);

  for (let i = 0; i < pendingToAdd; i++) {
    const n = studentNo + toEnroll + i;
    await admissionService.createAdmission(
      tenantId,
      {
        firstName: 'Applicant',
        lastName: `Pending${String(n).padStart(2, '0')}`,
        dateOfBirth: '2013-01-20',
        gender: 'male',
        intendedClassLevelId: level.id,
        guardianName: `Guardian P${n}`,
        guardianEmail: schoolDevEmail(`pending${n}`, ADVANCED_SCHOOL_SLUG),
        guardianPhone: '+2348099999999',
        guardianRelationship: 'father',
      },
      actor,
    );
  }

  console.log('');
  console.log('Advanced QA demo data ready.');
  console.log(`  Login: ${PRINCIPAL_EMAIL}`);
  console.log(`  Password: LoomisDev2026!`);
  console.log(`  Enrolled students: ${ENROLLED_TARGET} in JSS1 A`);
  console.log(`  Pending admissions: ${PENDING_ADMISSIONS}`);
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Advanced demo seed failed:', err);
    process.exit(1);
  });
