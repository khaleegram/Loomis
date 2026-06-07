/**
 * Local dev seed — platform accounts (with MFA), demo school, staff, academic fixtures.
 *
 * Usage (from repo root, after db:up + migrate):
 *   pnpm db:seed
 *
 * Idempotent: re-runs platform user creation if missing; school seed is one-shot.
 */
import { eq } from 'drizzle-orm';
import type { Role, StaffPrimaryRole } from '@loomis/contracts';
import speakeasy from 'speakeasy';
import { tiers } from '../drizzle/schema/tenant.js';
import { roleAssignments, staffProfiles } from '../drizzle/schema/hrm.js';
import { academicRepository } from '../src/modules/academic/repository/academic.repository.js';
import { academicYearService } from '../src/modules/academic/services/academic-year.service.js';
import { classStructureService } from '../src/modules/academic/services/class-structure.service.js';
import { gradebookService } from '../src/modules/academic/services/gradebook.service.js';
import { termService } from '../src/modules/academic/services/term.service.js';
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

const DEMO_DOMAIN = 'demo.loomis.local';
const DEV_PASSWORD = 'LoomisDev2026!';
/** Fixed dev TOTP secret — add to any authenticator app as "Loomis Dev" (base32). */
const DEV_TOTP_BASE32 = 'JBSWY3DPEHPK3PXP';
const TIER_CODE = 'demo';
const PSF_RATE_MINOR = 500_000;
const SUBJECT_MATH_ID = '019c0000-0000-7000-8000-000000000001';
const MARKER_EMAIL = `principal@${DEMO_DOMAIN}`;

interface PlatformDemoAccountSpec {
  email: string;
  role: Role;
  fullName: string;
  phone: string;
}

/** Platform console logins — MFA enrolled; password + TOTP at login. */
const PLATFORM_DEMO_ACCOUNTS: PlatformDemoAccountSpec[] = [
  {
    email: `owner@${DEMO_DOMAIN}`,
    role: 'platform_owner',
    fullName: 'Demo Platform Owner',
    phone: '+2348020000001',
  },
  {
    email: `admin@${DEMO_DOMAIN}`,
    role: 'platform_admin',
    fullName: 'Demo Platform Admin',
    phone: '+2348020000002',
  },
  {
    email: `dpo@${DEMO_DOMAIN}`,
    role: 'dpo',
    fullName: 'Demo DPO',
    phone: '+2348020000003',
  },
];

interface DemoAccountSpec {
  email: string;
  role: Role;
  fullName: string;
  primaryRole: StaffPrimaryRole;
  phone: string;
  classTeacher?: boolean;
}

const DEMO_ACCOUNTS: DemoAccountSpec[] = [
  {
    email: `principal@${DEMO_DOMAIN}`,
    role: 'principal',
    fullName: 'Demo Principal',
    primaryRole: 'principal',
    phone: '+2348010000001',
  },
  {
    email: `exam@${DEMO_DOMAIN}`,
    role: 'exam_officer',
    fullName: 'Demo Exam Officer',
    primaryRole: 'exam_officer',
    phone: '+2348010000002',
  },
  {
    email: `teacher@${DEMO_DOMAIN}`,
    role: 'teacher',
    fullName: 'Demo Teacher',
    primaryRole: 'teacher',
    phone: '+2348010000003',
  },
  {
    email: `classteacher@${DEMO_DOMAIN}`,
    role: 'class_teacher',
    fullName: 'Demo Class Teacher',
    primaryRole: 'teacher',
    phone: '+2348010000004',
    classTeacher: true,
  },
];

async function ensureTier(code: string) {
  return withTenantContext(null, async (tx) => {
    const [existing] = await tx.select().from(tiers).where(eq(tiers.code, code)).limit(1);
    if (existing) return existing;
    const [tier] = await tx
      .insert(tiers)
      .values({
        code,
        name: 'Demo Tier',
        defaultPsfRateMinor: PSF_RATE_MINOR,
      })
      .returning();
    if (!tier) throw new Error('Failed to create demo tier');
    return tier;
  });
}

async function createPlatformDemoUser(spec: PlatformDemoAccountSpec) {
  const existing = await userRepository.findByEmail(spec.email);
  if (existing) {
    if (MFA_MANDATORY_ROLES.has(spec.role)) {
      await enrollDevMfa(existing.id);
    }
    return existing;
  }

  const passwordHash = await passwordService.hash(DEV_PASSWORD);
  const user = await userRepository.create({
    email: spec.email,
    passwordHash,
    role: spec.role,
    tenantId: null,
    mfaRequired: MFA_MANDATORY_ROLES.has(spec.role),
    status: 'active',
    phone: spec.phone,
  });

  if (MFA_MANDATORY_ROLES.has(spec.role)) {
    await enrollDevMfa(user.id);
  }

  return user;
}

async function ensurePlatformDemoUsers() {
  for (const spec of PLATFORM_DEMO_ACCOUNTS) {
    await createPlatformDemoUser(spec);
  }
}

async function enrollDevMfa(userId: string) {
  // Store the same base32 secret shown in seed output / added to authenticator apps.
  // (speakeasy.generateSecret does NOT accept a preset secret — it always generates a new one.)
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

async function createDemoUser(spec: DemoAccountSpec, tenantId: string, createdById: string) {
  const passwordHash = await passwordService.hash(DEV_PASSWORD);
  const user = await userRepository.create({
    email: spec.email,
    passwordHash,
    role: spec.role,
    tenantId,
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

function currentTotpCode(): string {
  return speakeasy.totp({ secret: DEV_TOTP_BASE32, encoding: 'base32' });
}

function printCredentials(tenantId: string) {
  const mfaCode = currentTotpCode();
  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  Loomis local dev seed — demo credentials');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Web app:     http://localhost:3000/login`);
  console.log(`  Tenant ID:   ${tenantId}  (school accounts only)`);
  console.log(`  Password:    ${DEV_PASSWORD}  (all accounts)`);
  console.log('');
  console.log('  Platform accounts (login requires MFA):');
  for (const spec of PLATFORM_DEMO_ACCOUNTS) {
    console.log(`    • ${spec.email}  (${spec.role})`);
  }
  console.log('');
  console.log('  School accounts (password-only login):');
  for (const spec of DEMO_ACCOUNTS) {
    console.log(`    • ${spec.email}  (${spec.role})`);
  }
  console.log('');
  console.log('  MFA (platform logins + step-up on sensitive school actions):');
  console.log(`    Secret (base32): ${DEV_TOTP_BASE32}`);
  console.log(`    Current 6-digit code: ${mfaCode}  (rotates every 30s)`);
  console.log('');
  console.log('  Screens to try after login:');
  console.log('    /platform              — platform owner / admin / DPO');
  console.log('    /platform/psf          — PSF rate management');
  console.log('    /platform/approvals    — privileged change approvals');
  console.log('    /school/exams          — exam officer (grading schemes, corrections)');
  console.log('    /school/exams/publish  — exam officer (result publish + step-up MFA)');
  console.log('    /school/gradebook      — teacher (entry) / class teacher (read-only)');
  console.log('    /school/attendance     — class teacher');
  console.log('');
  console.log('  Start stack:  pnpm db:up && pnpm --filter @loomis/api db:migrate && pnpm dev');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
}

async function seedStudents(
  tenantId: string,
  actor: { userId: string; role: Role; tenantId: string },
  termId: string,
  classArmId: string,
  classLevelId: string,
  count: number,
) {
  const ids: string[] = [];
  for (let i = 1; i <= count; i++) {
    const admission = await admissionService.createAdmission(
      tenantId,
      {
        firstName: `Student${i}`,
        lastName: 'Demo',
        dateOfBirth: '2012-05-01',
        gender: 'male',
        intendedClassLevelId: classLevelId,
        guardianName: 'Guardian Demo',
        guardianEmail: `guardian${i}@${DEMO_DOMAIN}`,
        guardianPhone: '+2348012345678',
        guardianRelationship: 'father',
      },
      actor,
    );

    const decided = await admissionService.decideAdmission(
      tenantId,
      admission.id,
      { decision: 'approve', admissionNo: `DEMO-${String(i).padStart(3, '0')}` },
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

    await enrollmentService.enrollStudent(
      tenantId,
      studentId,
      { termId, classArmId },
      actor,
    );

    ids.push(studentId);
  }
  return ids;
}

async function main() {
  await ensurePlatformDemoUsers();

  const platformOwner = await userRepository.findByEmail(PLATFORM_DEMO_ACCOUNTS[0]!.email);
  if (!platformOwner) throw new Error('Platform owner seed failed');

  const existing = await userRepository.findByEmail(MARKER_EMAIL);
  if (existing?.tenantId) {
    printCredentials(existing.tenantId);
    console.log('Demo seed already applied — platform users ensured. Drop DB to re-seed school data.');
    return;
  }

  console.log('Seeding Loomis demo school…');

  await ensureTier(TIER_CODE);
  const bootstrapActorId = platformOwner.id;
  await psfRateService.setGlobalPsfRate(
    {
      rateMinor: PSF_RATE_MINOR,
      effectiveFrom: new Date('2026-01-01'),
      reason: 'Local dev seed',
    },
    { userId: bootstrapActorId, role: 'platform_owner' },
  );

  const tenant = await tenantService.provisionTenant(
    {
      name: 'Demo Private School Lagos',
      region: 'Lagos',
      contactEmail: `contact@${DEMO_DOMAIN}`,
      address: '1 Demo Close, Victoria Island, Lagos',
      tierCode: TIER_CODE,
      initialPsfRateMinor: PSF_RATE_MINOR,
    },
    { userId: bootstrapActorId, role: 'platform_owner' },
  );

  const principalSpec = DEMO_ACCOUNTS[0]!;
  const { user: principalUser, profile: principalProfile } = await createDemoUser(
    principalSpec,
    tenant.id,
    bootstrapActorId,
  );

  const actor = { userId: principalUser.id, role: 'principal' as Role, tenantId: tenant.id };

  const otherAccounts: typeof DEMO_ACCOUNTS = [];
  for (const spec of DEMO_ACCOUNTS.slice(1)) {
    otherAccounts.push(spec);
  }

  const staffByEmail = new Map<string, { userId: string; staffProfileId: string }>();
  staffByEmail.set(principalSpec.email, {
    userId: principalUser.id,
    staffProfileId: principalProfile.id,
  });

  for (const spec of otherAccounts) {
    const { user, profile } = await createDemoUser(spec, tenant.id, principalUser.id);
    staffByEmail.set(spec.email, { userId: user.id, staffProfileId: profile.id });
  }

  const year = await academicYearService.createYear(
    tenant.id,
    {
      label: '2025/2026',
      startDate: '2025-09-01',
      endDate: '2026-07-31',
      termCount: 1,
    },
    actor,
  );
  await academicYearService.activateYear(tenant.id, year.id, actor);

  const terms = await academicRepository.listTermsByYear(tenant.id, year.id);
  const term = terms[0];
  if (!term) throw new Error('No term after year activation');

  await termService.configureTerm(
    tenant.id,
    term.id,
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
  await termService.openTerm(tenant.id, term.id, actor);

  const level = await classStructureService.createClassLevel(
    tenant.id,
    { code: 'JSS1', name: 'Junior Secondary 1', rank: 1, isTerminal: false },
    actor,
  );
  const arm = await classStructureService.createClassArm(
    tenant.id,
    { academicYearId: year.id, classLevelId: level.id, name: 'A' },
    actor,
  );

  await seedStudents(tenant.id, actor, term.id, arm.id, level.id, 8);

  const teacher = staffByEmail.get(`teacher@${DEMO_DOMAIN}`);
  const classTeacher = staffByEmail.get(`classteacher@${DEMO_DOMAIN}`);
  if (!teacher || !classTeacher) throw new Error('Teacher staff profiles missing');

  await staffRepository.createSubjectAssignment({
    tenantId: tenant.id,
    staffProfileId: teacher.staffProfileId,
    termId: term.id,
    classArmId: arm.id,
    subjectId: SUBJECT_MATH_ID,
    actorUserId: principalUser.id,
    approvedById: principalUser.id,
  });

  await staffRepository.assignClassTeacher({
    tenantId: tenant.id,
    staffProfileId: classTeacher.staffProfileId,
    termId: term.id,
    classArmId: arm.id,
    actorUserId: principalUser.id,
  });

  const scheme = await gradebookService.createGradingScheme(
    tenant.id,
    {
      name: 'JSS Standard 40/60',
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
      termId: term.id,
      classArmId: arm.id,
      subjectId: SUBJECT_MATH_ID,
      gradingSchemeId: scheme.id,
      title: 'First Term Mathematics',
    },
    actor,
  );

  printCredentials(tenant.id);
  console.log('Demo seed completed successfully.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
