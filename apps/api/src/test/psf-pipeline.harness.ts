import { eq, sql } from 'drizzle-orm';
import type { Role } from '@loomis/contracts';
import { uuidv7 } from 'uuidv7';
import { tiers } from '../../drizzle/schema/tenant.js';
import { academicRepository } from '../modules/academic/repository/academic.repository.js';
import { academicYearService } from '../modules/academic/services/academic-year.service.js';
import { classStructureService } from '../modules/academic/services/class-structure.service.js';
import { termService } from '../modules/academic/services/term.service.js';
import { admissionService } from '../modules/student/services/admission.service.js';
import { enrollmentService } from '../modules/student/services/enrollment.service.js';
import { studentService } from '../modules/student/services/student.service.js';
import { psfRateService } from '../modules/tenant/services/psf-rate.service.js';
import { tenantService } from '../modules/tenant/services/tenant.service.js';
import { withTenantContext } from '../shared/tenant-context.js';

const PSF_RATE_MINOR = 500_000;

export interface PsfPipelineFixture {
  actor: { userId: string; role: Role; tenantId: string };
  tenantId: string;
  yearId: string;
  termId: string;
  classArmId: string;
  classLevelId: string;
  enrolledStudentIds: string[];
}

async function ensureTier(code: string) {
  return withTenantContext(null, async (tx) => {
    const [existing] = await tx.select().from(tiers).where(eq(tiers.code, code)).limit(1);
    if (existing) return existing;
    const [tier] = await tx
      .insert(tiers)
      .values({
        code,
        name: `Test Tier ${code}`,
        defaultPsfRateMinor: PSF_RATE_MINOR,
      })
      .returning();
    if (!tier) throw new Error('Failed to create tier');
    return tier;
  });
}

export async function buildPsfPipelineFixture(studentCount = 2): Promise<PsfPipelineFixture> {
  const suffix = uuidv7().slice(0, 8);
  const actorUserId = uuidv7();
  const tierCode = `psf-test-${suffix}`;

  await ensureTier(tierCode);
  await psfRateService.setGlobalPsfRate(
    {
      rateMinor: PSF_RATE_MINOR,
      effectiveFrom: new Date('2026-01-01'),
      reason: 'PSF pipeline integration test',
    },
    { userId: actorUserId, role: 'platform_owner' },
  );

  const tenant = await tenantService.provisionTenant(
    {
      name: `PSF Test School ${suffix}`,
      region: 'Lagos',
      contactEmail: `psf-${suffix}@example.com`,
      contactPhone: '+2348015550101',
      address: '1 Test Street',
      tierCode,
      initialPsfRateMinor: PSF_RATE_MINOR,
    },
    { userId: actorUserId, role: 'platform_owner' },
  );

  const actor = { userId: actorUserId, role: 'principal' as Role, tenantId: tenant.id };

  const year = await academicYearService.createYear(
    tenant.id,
    {
      label: `2026/${suffix}`,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      termCount: 1,
    },
    actor,
  );
  await academicYearService.activateYear(tenant.id, year.id, actor);

  const terms = await academicRepository.listTermsByYear(tenant.id, year.id);
  const term = terms[0];
  if (!term) throw new Error('No term placeholder after year activation');

  await termService.configureTerm(
    tenant.id,
    term.id,
    {
      name: 'First Term',
      startDate: '2026-01-01',
      endDate: '2026-04-30',
      enrollmentWindowOpenDate: '2026-01-01',
      enrollmentWindowCloseDate: '2026-02-28',
      censusLockDate: '2026-03-01',
      examStartDate: '2026-04-01',
      examEndDate: '2026-04-20',
    },
    actor,
  );
  await termService.openTerm(tenant.id, term.id, actor);

  const level = await classStructureService.createClassLevel(
    tenant.id,
    { code: `JSS1-${suffix}`, name: 'Junior Secondary 1', rank: 1, isTerminal: false },
    actor,
  );
  const arm = await classStructureService.createClassArm(
    tenant.id,
    { academicYearId: year.id, classLevelId: level.id, name: 'A' },
    actor,
  );

  const enrolledStudentIds: string[] = [];
  for (let i = 0; i < studentCount; i++) {
    const admission = await admissionService.createAdmission(
      tenant.id,
      {
        firstName: `Student${i}`,
        lastName: suffix,
        dateOfBirth: '2012-05-01',
        gender: 'male',
        intendedClassLevelId: level.id,
        guardianName: 'Guardian',
        guardianEmail: `guardian-${suffix}-${i}@example.com`,
        guardianPhone: '+2348012345678',
        guardianRelationship: 'father',
      },
      actor,
    );

    const decided = await admissionService.decideAdmission(
      tenant.id,
      admission.id,
      { decision: 'approve', admissionNo: `ADM-${suffix}-${i}` },
      actor,
    );
    const studentId = decided.student?.id;
    if (!studentId) throw new Error('Student not created from admission');

    await studentService.recordIdentityAttestation(
      tenant.id,
      studentId,
      { attestationType: 'birth_certificate' },
      actor,
    );

    await enrollmentService.enrollStudent(
      tenant.id,
      studentId,
      { termId: term.id, classArmId: arm.id },
      actor,
    );

    enrolledStudentIds.push(studentId);
  }

  return {
    actor,
    tenantId: tenant.id,
    yearId: year.id,
    termId: term.id,
    classArmId: arm.id,
    classLevelId: level.id,
    enrolledStudentIds,
  };
}

/**
 * Best-effort cleanup for mutable fixture rows. Ledger obligations, entries, and
 * attestations are INSERT-only — those rows are left in place for local dev DBs.
 */
export async function discardFixtureTenant(tenantId: string): Promise<void> {
  await withTenantContext(null, async (tx) => {
    await tx.execute(sql`DELETE FROM ledger.outbox_events WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM student.enrollments WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM student.students WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM student.admissions WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM academic.academic_terms WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM academic.academic_years WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM academic.class_arms WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM academic.class_levels WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM tenant.psf_rate_snapshots WHERE tenant_id = ${tenantId}`);
    await tx.execute(sql`DELETE FROM tenant.tenants WHERE id = ${tenantId}`);
  });
}
