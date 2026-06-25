/**
 * Local dev seed — platform accounts (with MFA), regional accounts, PSF tier, Advanced QA fixture.
 *
 * Usage (from repo root, after db:up + migrate):
 *   pnpm db:seed          # this script + Greenfield rich school (see root package.json)
 *
 * Idempotent: re-runs missing platform/regional users; Advanced QA is one-shot.
 *
 * Emails: `{role}@{schoolSlug}.loomis.com` — see scripts/seed-email.ts
 */
import { eq } from 'drizzle-orm';
import type { Role, StaffPrimaryRole } from '@loomis/contracts';
import speakeasy from 'speakeasy';
import { tiers } from '../drizzle/schema/tenant.js';
import { roleAssignments, staffProfiles } from '../drizzle/schema/hrm.js';
import { mfaRepository } from '../src/modules/identity/repository/mfa.repository.js';
import { userRepository } from '../src/modules/identity/repository/user.repository.js';
import { mfaService } from '../src/modules/identity/services/mfa.service.js';
import { passwordService } from '../src/modules/identity/services/password.service.js';
import { MFA_MANDATORY_ROLES } from '../src/modules/identity/types.js';
import { participantRepository } from '../src/modules/referral/repository/participant.repository.js';
import { psfRateService } from '../src/modules/tenant/services/psf-rate.service.js';
import { tenantService } from '../src/modules/tenant/services/tenant.service.js';
import { tenantRepository } from '../src/modules/tenant/repository/tenant.repository.js';
import { withTenantContext } from '../src/shared/tenant-context.js';
import {
  ADVANCED_SCHOOL_SLUG,
  ENTERPRISE_SCHOOL_SLUG,
  GREENFIELD_SCHOOL_SLUG,
  platformDevEmail,
  schoolContactEmail,
  schoolDevEmail,
} from './seed-email.js';
import { ensureProductTiers } from './ensure-product-tiers.js';

const DEV_PASSWORD = 'LoomisDev2026!';
/** Fixed dev TOTP secret — add to any authenticator app as "Loomis Dev" (base32). */
const DEV_TOTP_BASE32 = 'JBSWY3DPEHPK3PXP';
const TIER_CODE = 'core';
const PSF_RATE_MINOR = 100_000;

interface PlatformDemoAccountSpec {
  email: string;
  role: Role;
  fullName: string;
  phone: string;
}

/** Platform console logins — MFA enrolled; password + TOTP at login. */
const PLATFORM_DEMO_ACCOUNTS: PlatformDemoAccountSpec[] = [
  {
    email: platformDevEmail('owner'),
    role: 'platform_owner',
    fullName: 'Demo Platform Owner',
    phone: '+2348020000001',
  },
  {
    email: platformDevEmail('admin'),
    role: 'platform_admin',
    fullName: 'Demo Platform Admin',
    phone: '+2348020000002',
  },
  {
    email: platformDevEmail('dpo'),
    role: 'dpo',
    fullName: 'Demo DPO',
    phone: '+2348020000003',
  },
];

const REGIONAL_DEMO_ACCOUNTS: PlatformDemoAccountSpec[] = [
  {
    email: platformDevEmail('regional.manager'),
    role: 'regional_manager',
    fullName: 'Demo Regional Manager',
    phone: '+2348020000010',
  },
  {
    email: platformDevEmail('regional.sub'),
    role: 'regional_subordinate',
    fullName: 'Demo Regional Subordinate',
    phone: '+2348020000011',
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

async function ensureTier(_code: string) {
  await ensureProductTiers();
  return withTenantContext(null, async (tx) => {
    const [tier] = await tx.select().from(tiers).where(eq(tiers.code, TIER_CODE)).limit(1);
    if (!tier) throw new Error(`Product tier '${TIER_CODE}' missing — run ensureProductTiers`);
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

async function ensureRegionalDemoUsers() {
  const managerUser = await createPlatformDemoUser(REGIONAL_DEMO_ACCOUNTS[0]!);
  const subUser = await createPlatformDemoUser(REGIONAL_DEMO_ACCOUNTS[1]!);

  await withTenantContext(null, async (tx) => {
    let managerParticipant = await participantRepository.findByUserId(tx, managerUser.id);
    if (!managerParticipant) {
      managerParticipant = await participantRepository.create(tx, {
        userId: managerUser.id,
        participantType: 'regional_manager',
        region: 'South-West',
        status: 'active',
      });
    } else if (managerParticipant.status !== 'active') {
      await participantRepository.activate(tx, managerParticipant.id);
    }

    let subParticipant = await participantRepository.findByUserId(tx, subUser.id);
    if (!subParticipant) {
      subParticipant = await participantRepository.create(tx, {
        userId: subUser.id,
        participantType: 'regional_subordinate',
        managerParticipantId: managerParticipant.id,
        region: 'South-West',
        status: 'active',
      });
    } else if (subParticipant.status !== 'active') {
      await participantRepository.activate(tx, subParticipant.id);
    }
  });
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

async function ensureDevPsfRate(actorId: string): Promise<void> {
  await psfRateService.setGlobalPsfRate(
    {
      rateMinor: PSF_RATE_MINOR,
      effectiveFrom: new Date('2026-01-01'),
      reason: 'Local dev seed',
    },
    { userId: actorId, role: 'platform_owner' },
  );
}

/** Advanced-tier fixture for QA (ROLE_EXPERIENCE_IMPLEMENTATION_ROADMAP Sprint 1). */
async function ensureAdvancedFixtureTenant(platformOwnerId: string): Promise<void> {
  const markerEmail = schoolDevEmail('principal', ADVANCED_SCHOOL_SLUG);
  const existing = await userRepository.findByEmail(markerEmail);
  if (existing?.tenantId) {
    return;
  }

  console.log('Seeding Advanced QA fixture school…');

  const tenant = await tenantService.provisionTenant(
    {
      name: 'Advanced QA School Lagos',
      region: 'Lagos',
      contactEmail: schoolContactEmail(ADVANCED_SCHOOL_SLUG),
      contactPhone: '+2348020000201',
      address: '2 Advanced Close, Ikeja, Lagos',
      tierCode: 'advanced',
    },
    { userId: platformOwnerId, role: 'platform_owner' },
  );

  await tenantRepository.updateExperience(tenant.id, {
    experienceTier: 'advanced',
    financeMode: 'combined',
    experienceFlags: {
      workflowsInbox: true,
      timetableDedicatedOfficer: true,
      deputyExamEnabled: true,
      totpOptional: true,
    },
  });

  const ownerSpec: DemoAccountSpec = {
    email: schoolDevEmail('owner', ADVANCED_SCHOOL_SLUG),
    role: 'school_owner',
    fullName: 'Advanced QA Owner',
    primaryRole: 'principal',
    phone: '+2348010000100',
  };
  const principalSpec: DemoAccountSpec = {
    email: markerEmail,
    role: 'principal',
    fullName: 'Advanced QA Principal',
    primaryRole: 'principal',
    phone: '+2348010000101',
  };

  const { user: ownerUser } = await createDemoUser(ownerSpec, tenant.id, platformOwnerId);
  await createDemoUser(principalSpec, tenant.id, ownerUser.id);

  console.log('');
  console.log('  Advanced QA school (experience_tier=advanced):');
  console.log(`    Tenant ID: ${tenant.id}`);
  console.log(`    • ${ownerSpec.email}  (school_owner)`);
  console.log(`    • ${principalSpec.email}  (principal)`);
  console.log('');
}

/** Split finance QA accounts for Advanced tenant (Sprint 8). */
async function ensureAdvancedSplitFinanceFixture(_platformOwnerId: string): Promise<void> {
  const ownerEmail = schoolDevEmail('owner', ADVANCED_SCHOOL_SLUG);
  const ownerUser = await userRepository.findByEmail(ownerEmail);
  if (!ownerUser?.tenantId) return;

  const cashierEmail = schoolDevEmail('cashier', ADVANCED_SCHOOL_SLUG);
  const accountantEmail = schoolDevEmail('accountant', ADVANCED_SCHOOL_SLUG);
  const existingCashier = await userRepository.findByEmail(cashierEmail);

  await tenantRepository.updateExperience(ownerUser.tenantId, {
    financeMode: 'split',
  });

  if (existingCashier) return;

  console.log('Seeding Advanced split finance (cashier + accountant)…');

  const cashierSpec: DemoAccountSpec = {
    email: cashierEmail,
    role: 'cashier',
    fullName: 'Advanced QA Cashier',
    primaryRole: 'cashier',
    phone: '+2348010000102',
  };
  const accountantSpec: DemoAccountSpec = {
    email: accountantEmail,
    role: 'accountant',
    fullName: 'Advanced QA Accountant',
    primaryRole: 'accountant',
    phone: '+2348010000103',
  };

  await createDemoUser(cashierSpec, ownerUser.tenantId, ownerUser.id);
  await createDemoUser(accountantSpec, ownerUser.tenantId, ownerUser.id);

  console.log(`    • ${cashierEmail}  (cashier → log desk)`);
  console.log(`    • ${accountantEmail}  (accountant → verify desk)`);
}

/** Optional Advanced roles for Sprint 11 QA (exam, deputy, timetable). */
async function ensureAdvancedOptionalRolesFixture(_platformOwnerId: string): Promise<void> {
  const ownerEmail = schoolDevEmail('owner', ADVANCED_SCHOOL_SLUG);
  const ownerUser = await userRepository.findByEmail(ownerEmail);
  if (!ownerUser?.tenantId) return;

  const examEmail = schoolDevEmail('exam', ADVANCED_SCHOOL_SLUG);
  if (await userRepository.findByEmail(examEmail)) return;

  console.log('Seeding Advanced optional roles (exam, deputy, timetable)…');

  const specs: DemoAccountSpec[] = [
    {
      email: examEmail,
      role: 'exam_officer',
      fullName: 'Advanced QA Exam Officer',
      primaryRole: 'exam_officer',
      phone: '+2348010000104',
    },
    {
      email: schoolDevEmail('deputy-exam', ADVANCED_SCHOOL_SLUG),
      role: 'deputy_exam_officer',
      fullName: 'Advanced QA Deputy Exam',
      primaryRole: 'deputy_exam_officer',
      phone: '+2348010000105',
    },
    {
      email: schoolDevEmail('timetable', ADVANCED_SCHOOL_SLUG),
      role: 'timetable_officer',
      fullName: 'Advanced QA Timetable Officer',
      primaryRole: 'timetable_officer',
      phone: '+2348010000106',
    },
  ];

  for (const spec of specs) {
    await createDemoUser(spec, ownerUser.tenantId, ownerUser.id);
    console.log(`    • ${spec.email}  (${spec.role})`);
  }
}

/** Enterprise-tier fixture for QA (Sprint 13 — Loomis-team activation). */
async function ensureEnterpriseFixtureTenant(platformOwnerId: string): Promise<void> {
  const markerEmail = schoolDevEmail('principal', ENTERPRISE_SCHOOL_SLUG);
  const existing = await userRepository.findByEmail(markerEmail);
  if (existing?.tenantId) {
    return;
  }

  console.log('Seeding Enterprise QA fixture school…');

  const tenant = await tenantService.provisionTenant(
    {
      name: 'Enterprise QA School Lagos',
      region: 'Lagos',
      contactEmail: schoolContactEmail(ENTERPRISE_SCHOOL_SLUG),
      contactPhone: '+2348020000301',
      address: '3 Enterprise Crescent, Ikeja, Lagos',
      tierCode: 'enterprise',
    },
    { userId: platformOwnerId, role: 'platform_owner' },
  );

  await tenantRepository.updateExperience(tenant.id, {
    experienceTier: 'enterprise',
    financeMode: 'combined',
    experienceFlags: {
      workflowsInbox: true,
      timetableDedicatedOfficer: true,
      deputyExamEnabled: true,
      totpOptional: true,
      admissionsRequirePrincipalApproval: true,
      admissionsRequireOwnerApproval: true,
    },
  });

  const ownerSpec: DemoAccountSpec = {
    email: schoolDevEmail('owner', ENTERPRISE_SCHOOL_SLUG),
    role: 'school_owner',
    fullName: 'Enterprise QA Owner',
    primaryRole: 'principal',
    phone: '+2348010000200',
  };
  const principalSpec: DemoAccountSpec = {
    email: markerEmail,
    role: 'principal',
    fullName: 'Enterprise QA Principal',
    primaryRole: 'principal',
    phone: '+2348010000201',
  };
  const examSpec: DemoAccountSpec = {
    email: schoolDevEmail('exam', ENTERPRISE_SCHOOL_SLUG),
    role: 'exam_officer',
    fullName: 'Enterprise QA Exam Officer',
    primaryRole: 'exam_officer',
    phone: '+2348010000202',
  };

  const { user: ownerUser } = await createDemoUser(ownerSpec, tenant.id, platformOwnerId);
  await createDemoUser(principalSpec, tenant.id, ownerUser.id);
  await createDemoUser(examSpec, tenant.id, ownerUser.id);

  console.log('');
  console.log('  Enterprise QA school (experience_tier=enterprise):');
  console.log(`    Tenant ID: ${tenant.id}`);
  console.log(`    • ${ownerSpec.email}  (school_owner)`);
  console.log(`    • ${principalSpec.email}  (principal)`);
  console.log(`    • ${examSpec.email}  (exam_officer)`);
  console.log('');
}

function printCredentials() {
  const mfaCode = currentTotpCode();
  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  Loomis local dev seed — credentials');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Web app:     http://localhost:3000/login`);
  console.log(`  Password:    ${DEV_PASSWORD}  (all accounts)`);
  console.log('');
  console.log('  Platform accounts (login requires MFA):');
  for (const spec of PLATFORM_DEMO_ACCOUNTS) {
    console.log(`    • ${spec.email}  (${spec.role})`);
  }
  console.log('');
  console.log('  Regional accounts (login requires MFA → /regional):');
  for (const spec of REGIONAL_DEMO_ACCOUNTS) {
    console.log(`    • ${spec.email}  (${spec.role})`);
  }
  console.log('');
  console.log('  School demo — Greenfield Academy (Core tier):');
  console.log(`    • ${schoolDevEmail('principal', GREENFIELD_SCHOOL_SLUG)}  (principal)`);
  console.log('    Full role list printed by db:seed:rich (also runs via pnpm db:seed).');
  console.log('');
  console.log('  Advanced QA school (experience_tier=advanced):');
  console.log(`    • ${schoolDevEmail('principal', ADVANCED_SCHOOL_SLUG)}  (principal)`);
  console.log(`    • ${schoolDevEmail('owner', ADVANCED_SCHOOL_SLUG)}  (school_owner)`);
  console.log(`    • ${schoolDevEmail('cashier', ADVANCED_SCHOOL_SLUG)}  (cashier, split finance)`);
  console.log(`    • ${schoolDevEmail('accountant', ADVANCED_SCHOOL_SLUG)}  (accountant, split finance)`);
  console.log(`    • ${schoolDevEmail('exam', ADVANCED_SCHOOL_SLUG)}  (exam_officer)`);
  console.log(`    • ${schoolDevEmail('deputy-exam', ADVANCED_SCHOOL_SLUG)}  (deputy_exam_officer)`);
  console.log(`    • ${schoolDevEmail('timetable', ADVANCED_SCHOOL_SLUG)}  (timetable_officer)`);
  console.log('');
  console.log('  Enterprise QA school (experience_tier=enterprise):');
  console.log(`    • ${schoolDevEmail('owner', ENTERPRISE_SCHOOL_SLUG)}  (school_owner)`);
  console.log(`    • ${schoolDevEmail('principal', ENTERPRISE_SCHOOL_SLUG)}  (principal)`);
  console.log(`    • ${schoolDevEmail('exam', ENTERPRISE_SCHOOL_SLUG)}  (exam_officer)`);
  console.log('');
  console.log('  MFA (platform logins + step-up on sensitive school actions):');
  console.log(`    Secret (base32): ${DEV_TOTP_BASE32}`);
  console.log(`    Current 6-digit code: ${mfaCode}  (rotates every 30s)`);
  console.log('');
  console.log('  Start stack:  pnpm db:up && pnpm --filter @loomis/api db:migrate && pnpm dev');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
}

async function main() {
  await ensurePlatformDemoUsers();
  await ensureRegionalDemoUsers();

  const platformOwner = await userRepository.findByEmail(PLATFORM_DEMO_ACCOUNTS[0]!.email);
  if (!platformOwner) throw new Error('Platform owner seed failed');

  await ensureTier(TIER_CODE);
  await ensureProductTiers();
  await ensureDevPsfRate(platformOwner.id);
  await ensureAdvancedFixtureTenant(platformOwner.id);
  await ensureAdvancedSplitFinanceFixture(platformOwner.id);
  await ensureAdvancedOptionalRolesFixture(platformOwner.id);
  await ensureEnterpriseFixtureTenant(platformOwner.id);

  printCredentials();
  console.log('Dev seed completed (platform + regional + Advanced + Enterprise QA). Greenfield runs via db:seed:rich.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
