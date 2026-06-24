import { LoomisError } from '../../../shared/errors.js';
import { writeAudit } from '../../../shared/audit.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { deliveryService } from '../../comms/services/delivery.service.js';
import { transactionalEmailService } from '../../comms/services/transactional-email.service.js';
import { staffRepository } from '../../hrm/repository/staff.repository.js';
import { attestationRepository } from '../../student/repository/attestation.repository.js';
import { studentRepository } from '../../student/repository/student.repository.js';
import {
  buildAttestationHash,
  buildStudentListHash,
} from '../../student/utils/attestation-hash.js';
import { configurationRepository } from '../../tenant/repository/configuration.repository.js';
import { psfRateService } from '../../tenant/services/psf-rate.service.js';
import { tenantRepository } from '../../tenant/repository/tenant.repository.js';
import type { TermCensusLockedPayload } from '../events/types.js';
import { ACADEMIC_EVENT_TYPES } from '../events/types.js';
import { academicRepository } from '../repository/academic.repository.js';
import { outboxRepository } from '../repository/outbox.repository.js';
import type { ActorContext } from '../types.js';
import { requireTenant, requireTerm } from './_shared.js';
import { uuidv7 } from 'uuidv7';

const MTC_CONFIG_KEY = 'minimum_term_commitment';
const ADJUSTMENT_WINDOW_DAYS = 7;

export type SnapshotTrigger = 'scheduled' | 'manual_early';

function parseMinimumTermCommitment(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  return null;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function notifyOwnersSnapshotTaken(
  tenantId: string,
  termId: string,
  termName: string,
  systemBillableCount: number,
  adjustmentWindowEndsAt: Date,
): Promise<void> {
  const owners = await staffRepository.findActiveUserIdsByRole(tenantId, 'school_owner');
  if (owners.length === 0) return;

  const title = 'Platform billing snapshot taken';
  const body = `${termName}: ${systemBillableCount} billable students. You have until ${adjustmentWindowEndsAt.toISOString().slice(0, 10)} to request corrections.`;

  await deliveryService.createManyInApp(
    owners.map((userId) => ({
      tenantId,
      userId,
      notificationType: 'generic' as const,
      safeCopy: {
        title,
        body,
        deepLinkResourceType: 'platform_billing',
      },
      resourceId: termId,
      eventIdempotencyKey: `billing.snapshot:${tenantId}:${termId}`,
    })),
  );

  for (const owner of owners) {
    if (!owner.email) continue;
    await transactionalEmailService.sendPlatformBillingSnapshotEmail({
      to: owner.email,
      termName,
      systemBillableCount,
      adjustmentWindowEndsAt,
    });
  }
}

async function notifyOwnersMtcWarning(
  tenantId: string,
  termId: string,
  termName: string,
  systemBillableCount: number,
  minimumTermCommitment: number,
  snapshotDate: string,
): Promise<void> {
  const owners = await staffRepository.findActiveUserIdsByRole(tenantId, 'school_owner');
  if (owners.length === 0) return;

  const title = 'Platform billing snapshot in 7 days';
  const body = `${termName}: ${systemBillableCount} billable students is below your minimum term commitment of ${minimumTermCommitment}. Snapshot date: ${snapshotDate}.`;

  await deliveryService.createManyInApp(
    owners.map((userId) => ({
      tenantId,
      userId,
      notificationType: 'generic' as const,
      safeCopy: {
        title,
        body,
        deepLinkResourceType: 'platform_billing',
      },
      resourceId: termId,
      eventIdempotencyKey: `billing.mtc-warning:${tenantId}:${termId}`,
    })),
  );

  for (const owner of owners) {
    if (!owner.email) continue;
    await transactionalEmailService.sendMtcBelowCommitmentWarningEmail({
      to: owner.email,
      termName,
      systemBillableCount,
      minimumTermCommitment,
      snapshotDate,
    });
  }
}

async function auditBillingSnapshot(
  tenantId: string,
  termId: string,
  trigger: SnapshotTrigger,
  actorId: string | undefined,
  systemBillableCount: number,
): Promise<void> {
  const action =
    trigger === 'manual_early' ? 'billing.snapshot.manual_early' : 'billing.snapshot.scheduled';
  await writeAudit({
    tenantId,
    actorUserId: actorId ?? null,
    actorType: trigger === 'scheduled' ? 'job' : 'user',
    action,
    resourceType: 'academic_term',
    resourceId: termId,
    sensitivity: 'financial',
    result: 'success',
    requestId: uuidv7(),
    metadata: { systemBillableCount, trigger },
  });
}

export const censusService = {
  /**
   * Read-only platform billing preview (US-ASM-003). System billable count and
   * projected PSF — no snapshot is created.
   */
  async previewPlatformBilling(tenantId: string, termId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    const term = await requireTerm(tenantId, termId);

    if (term.status !== 'open' && term.status !== 'census_locked') {
      throw new LoomisError(
        'ACADEMIC_CENSUS_NOT_READY',
        409,
        'The term must be open or snapshotted to preview platform billing',
      );
    }

    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }

    const [studentIds, classLevelBreakdown, mtcConfig] = await Promise.all([
      studentRepository.listBillableStudentIds(tenantId, termId),
      studentRepository.listBillableCountByClassLevel(tenantId, termId),
      configurationRepository.findByKey(tenantId, MTC_CONFIG_KEY),
    ]);

    const psfRateMinor = await psfRateService.resolveEffectiveRateMinor(tenantId, tenant.tierId);

    return {
      termId: term.id,
      academicYearId: term.academicYearId,
      termName: term.name,
      termStatus: term.status,
      censusSnapshotDate: term.censusSnapshotDate ?? null,
      snapshotCreatedAt: term.snapshotCreatedAt?.toISOString() ?? null,
      adjustmentWindowEndsAt: term.adjustmentWindowEndsAt?.toISOString() ?? null,
      systemBillableCount: studentIds.length,
      classLevelBreakdown,
      minimumTermCommitment: parseMinimumTermCommitment(mtcConfig?.value ?? null),
      psfRateMinor: psfRateMinor !== null && psfRateMinor > 0 ? psfRateMinor : null,
    };
  },

  /** @deprecated Use previewPlatformBilling */
  previewCensus(tenantId: string, termId: string, actor: ActorContext) {
    return this.previewPlatformBilling(tenantId, termId, actor);
  },

  /**
   * Creates the enrollment billing snapshot (System Design §8.1). System count
   * only — idempotent when the term is already `census_locked`.
   */
  async createEnrollmentSnapshot(
    tenantId: string,
    termId: string,
    options: { trigger: SnapshotTrigger; actorId?: string },
  ) {
    const term = await requireTerm(tenantId, termId);

    if (term.status === 'census_locked') {
      const psfRateMinor =
        (await attestationRepository.findByTerm(tenantId, termId))?.psfRateMinor ?? 0;
      return {
        term,
        psfRateMinor,
        systemBillableCount: term.systemBillableCount ?? 0,
        alreadySnapshotted: true as const,
      };
    }

    if (term.status === 'closed') {
      throw new LoomisError(
        'ACADEMIC_CENSUS_ALREADY_LOCKED',
        409,
        'This term is closed; billing snapshot cannot be created',
      );
    }
    if (term.status !== 'open') {
      throw new LoomisError(
        'ACADEMIC_CENSUS_NOT_READY',
        409,
        'The term must be open before a billing snapshot can be created',
      );
    }

    if (options.trigger === 'manual_early' && !options.actorId) {
      throw new LoomisError('FORBIDDEN', 403, 'Manual early snapshot requires an actor');
    }

    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }
    const psfRateMinor = await psfRateService.resolveEffectiveRateMinor(tenantId, tenant.tierId);
    if (psfRateMinor === null || psfRateMinor <= 0) {
      throw new LoomisError(
        'ACADEMIC_CENSUS_PSF_RATE_MISSING',
        422,
        'No non-zero PSF rate is configured; billing snapshot is blocked (CON-006)',
      );
    }

    const rateSnapshot = await psfRateService.ensureBillingSnapshot(tenantId, psfRateMinor);
    const generatedBy =
      options.trigger === 'manual_early' && options.actorId ? options.actorId : 'system';

    const snapshotted = await withTenantContext(
      tenantId,
      async (tx) => {
        const studentIds = await studentRepository.listBillableStudentIdsTx(tx, tenantId, termId);
        const systemBillableCount = studentIds.length;
        const now = new Date();
        const snapshotAt = now.toISOString();
        const adjustmentWindowEndsAt = addDays(now, ADJUSTMENT_WINDOW_DAYS);
        const studentListHash = buildStudentListHash(studentIds);
        const attestationHash = buildAttestationHash({
          tenantId,
          termId,
          systemBillableCount,
          studentListHash,
          rateSnapshotId: rateSnapshot.id,
          psfRateMinor,
          generatedBy,
          snapshotAt,
        });

        const updatedTerm = await academicRepository.createSnapshotInTx(tx, {
          tenantId,
          termId,
          systemBillableCount,
          snapshotAt: now,
          adjustmentWindowEndsAt,
        });
        if (!updatedTerm) return null;

        await attestationRepository.insert(tx, {
          tenantId,
          termId,
          systemBillableCount,
          generatedBy,
          attestedById: options.actorId ?? null,
          attestedAt: now,
          studentListHash,
          attestationHash,
          rateSnapshotId: rateSnapshot.id,
          psfRateMinor,
        });

        const eventPayload: TermCensusLockedPayload = {
          tenantId,
          academicYearId: term.academicYearId,
          termId,
          systemBillableCount,
          psfRateMinor,
          rateSnapshotId: rateSnapshot.id,
          studentListHash,
          attestationHash,
          generatedBy,
          snapshotCreatedAt: snapshotAt,
        };

        await outboxRepository.append(tx, {
          aggregateType: 'academic_term',
          aggregateId: termId,
          eventType: ACADEMIC_EVENT_TYPES.termCensusLocked,
          tenantId,
          payload: eventPayload,
        });

        return { term: updatedTerm, systemBillableCount, adjustmentWindowEndsAt };
      },
      { isolationLevel: 'serializable' },
    );

    if (!snapshotted) {
      const existing = await requireTerm(tenantId, termId);
      if (existing.status === 'census_locked') {
        const attestation = await attestationRepository.findByTerm(tenantId, termId);
        return {
          term: existing,
          psfRateMinor: attestation?.psfRateMinor ?? psfRateMinor,
          systemBillableCount: existing.systemBillableCount ?? 0,
          alreadySnapshotted: true as const,
        };
      }
      throw new LoomisError(
        'ACADEMIC_CENSUS_NOT_READY',
        409,
        'Billing snapshot could not be created for this term',
      );
    }

    await notifyOwnersSnapshotTaken(
      tenantId,
      termId,
      term.name,
      snapshotted.systemBillableCount,
      snapshotted.adjustmentWindowEndsAt,
    );

    await auditBillingSnapshot(
      tenantId,
      termId,
      options.trigger,
      options.actorId,
      snapshotted.systemBillableCount,
    );

    return {
      term: snapshotted.term,
      psfRateMinor,
      systemBillableCount: snapshotted.systemBillableCount,
      alreadySnapshotted: false as const,
    };
  },

  async snapshotNow(tenantId: string, termId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    if (actor.role !== 'school_owner') {
      throw new LoomisError('FORBIDDEN', 403, 'Only the school owner may take an early billing snapshot');
    }
    return this.createEnrollmentSnapshot(tenantId, termId, {
      trigger: 'manual_early',
      actorId: actor.userId,
    });
  },

  /** Daily job: auto-snapshot open terms whose snapshot date has been reached. */
  async runScheduledSnapshots(asOfDate?: string): Promise<{ snapshotted: number; skipped: number }> {
    const today = asOfDate ?? new Date().toISOString().slice(0, 10);
    const tenants = await tenantRepository.listAll();
    let snapshotted = 0;
    let skipped = 0;

    for (const tenant of tenants) {
      const dueTerms = await academicRepository.listOpenTermsDueForSnapshot(tenant.id, today);
      for (const term of dueTerms) {
        const result = await this.createEnrollmentSnapshot(tenant.id, term.id, {
          trigger: 'scheduled',
        });
        if (result.alreadySnapshotted) skipped += 1;
        else snapshotted += 1;
      }
    }

    return { snapshotted, skipped };
  },

  /** Daily job: T-7 MTC warning when billable count is below commitment. */
  async runMtcWarnings(asOfDate?: string): Promise<{ notified: number }> {
    const today = asOfDate ?? new Date().toISOString().slice(0, 10);
    const warningDate = addDays(new Date(`${today}T00:00:00.000Z`), 7)
      .toISOString()
      .slice(0, 10);
    const tenants = await tenantRepository.listAll();
    let notified = 0;

    for (const tenant of tenants) {
      const terms = await academicRepository.listOpenTermsForSnapshotDate(tenant.id, warningDate);
      if (terms.length === 0) continue;

      const mtcConfig = await configurationRepository.findByKey(tenant.id, MTC_CONFIG_KEY);
      const mtc = parseMinimumTermCommitment(mtcConfig?.value ?? null);
      if (mtc === null) continue;

      for (const term of terms) {
        const studentIds = await studentRepository.listBillableStudentIds(tenant.id, term.id);
        if (studentIds.length >= mtc) continue;

        await notifyOwnersMtcWarning(
          tenant.id,
          term.id,
          term.name,
          studentIds.length,
          mtc,
          warningDate,
        );
        notified += 1;
      }
    }

    return { notified };
  },
};
