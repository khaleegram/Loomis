import type { CreatePsfAdjustmentRequest, PsfAdjustmentRequestResponse } from '@loomis/contracts';
import { uuidv7 } from 'uuidv7';
import { LoomisError } from '../../../shared/errors.js';
import { writeAudit } from '../../../shared/audit.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { academicRepository } from '../../academic/repository/academic.repository.js';
import { attestationRepository } from '../../student/repository/attestation.repository.js';
import type { ActorContext } from '../../academic/types.js';
import { requireTenant } from '../../academic/services/_shared.js';
import { adjustmentRepository } from '../repository/adjustment.repository.js';
import { obligationService } from './obligation.service.js';

function toResponse(row: {
  id: string;
  tenantId: string;
  termId: string;
  requestedById: string;
  reason: string;
  deltaType: string;
  studentIds: string[];
  status: string;
  reviewedById: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
}): PsfAdjustmentRequestResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    termId: row.termId,
    requestedById: row.requestedById,
    reason: row.reason,
    deltaType: row.deltaType as PsfAdjustmentRequestResponse['deltaType'],
    studentIds: row.studentIds,
    status: row.status as PsfAdjustmentRequestResponse['status'],
    reviewedById: row.reviewedById,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt.toISOString(),
  };
}

export const adjustmentService = {
  async createRequest(
    tenantId: string,
    termId: string,
    input: CreatePsfAdjustmentRequest,
    actor: ActorContext,
  ): Promise<PsfAdjustmentRequestResponse> {
    requireTenant(actor, tenantId);
    if (actor.role !== 'school_owner') {
      throw new LoomisError('FORBIDDEN', 403, 'Only the school owner may request billing adjustments');
    }

    const term = await academicRepository.findTermById(tenantId, termId);
    if (!term) {
      throw new LoomisError('ACADEMIC_TERM_NOT_FOUND', 404, 'Term not found');
    }
    if (term.status !== 'census_locked') {
      throw new LoomisError(
        'ACADEMIC_BILLING_ADJUSTMENT_NOT_ALLOWED',
        409,
        'Billing adjustments require a completed snapshot',
      );
    }
    if (!term.adjustmentWindowEndsAt || new Date() > term.adjustmentWindowEndsAt) {
      throw new LoomisError(
        'ACADEMIC_BILLING_ADJUSTMENT_WINDOW_CLOSED',
        409,
        'The billing adjustment window has closed for this term',
      );
    }

    const row = await adjustmentRepository.create(tenantId, {
      termId,
      requestedById: actor.userId,
      reason: input.reason,
      deltaType: input.deltaType,
      studentIds: input.studentIds,
    });

    await writeAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'billing.adjustment.requested',
      resourceType: 'psf_adjustment_request',
      resourceId: row.id,
      sensitivity: 'financial',
      result: 'success',
      requestId: uuidv7(),
      metadata: {
        termId,
        deltaType: input.deltaType,
        studentCount: input.studentIds.length,
      },
    });

    return toResponse(row);
  },

  async listForTerm(
    tenantId: string,
    termId: string,
    actor: ActorContext,
  ): Promise<PsfAdjustmentRequestResponse[]> {
    requireTenant(actor, tenantId);
    if (actor.role !== 'school_owner') {
      throw new LoomisError('FORBIDDEN', 403, 'Only the school owner may view billing adjustments');
    }
    const rows = await adjustmentRepository.listForTerm(tenantId, termId);
    return rows.map(toResponse);
  },

  async listPending(): Promise<PsfAdjustmentRequestResponse[]> {
    const rows = await adjustmentRepository.listPendingGlobal();
    return rows.map(toResponse);
  },

  async approve(requestId: string, actor: ActorContext): Promise<PsfAdjustmentRequestResponse> {
    const request = await adjustmentRepository.findByIdGlobal(requestId);
    if (!request) {
      throw new LoomisError('LEDGER_ADJUSTMENT_NOT_FOUND', 404, 'Adjustment request not found');
    }
    if (request.status !== 'pending') {
      throw new LoomisError('LEDGER_ADJUSTMENT_ALREADY_REVIEWED', 409, 'Request already reviewed');
    }

    const attestation = await attestationRepository.findByTerm(request.tenantId, request.termId);
    if (!attestation) {
      throw new LoomisError(
        'ACADEMIC_BILLING_SNAPSHOT_MISSING',
        422,
        'No billing snapshot attestation found for this term',
      );
    }

    const reviewedAt = new Date();
    const updated = await withTenantContext(request.tenantId, async (tx) => {
      const row = await adjustmentRepository.updateStatusInTx(tx, requestId, {
        status: 'approved',
        reviewedById: actor.userId,
        reviewedAt,
      });
      if (!row) return null;

      await obligationService.applySnapshotAdjustment(tx, {
        tenantId: request.tenantId,
        termId: request.termId,
        requestId,
        deltaType: request.deltaType as 'add_students' | 'remove_students',
        studentIds: request.studentIds,
        psfRateMinor: attestation.psfRateMinor,
        rateSnapshotId: attestation.rateSnapshotId,
      });

      return row;
    });

    if (!updated) {
      throw new LoomisError('LEDGER_ADJUSTMENT_ALREADY_REVIEWED', 409, 'Request already reviewed');
    }

    await writeAudit({
      tenantId: request.tenantId,
      actorUserId: actor.userId,
      action: 'billing.adjustment.approved',
      resourceType: 'psf_adjustment_request',
      resourceId: requestId,
      sensitivity: 'financial',
      result: 'success',
      requestId: uuidv7(),
      metadata: {
        termId: request.termId,
        deltaType: request.deltaType,
        studentCount: request.studentIds.length,
      },
    });

    return toResponse(updated);
  },

  async reject(
    requestId: string,
    rejectionReason: string,
    actor: ActorContext,
  ): Promise<PsfAdjustmentRequestResponse> {
    const request = await adjustmentRepository.findByIdGlobal(requestId);
    if (!request) {
      throw new LoomisError('LEDGER_ADJUSTMENT_NOT_FOUND', 404, 'Adjustment request not found');
    }

    const reviewedAt = new Date();
    const updated = await withTenantContext(request.tenantId, async (tx) =>
      adjustmentRepository.updateStatusInTx(tx, requestId, {
        status: 'rejected',
        reviewedById: actor.userId,
        reviewedAt,
        rejectionReason,
      }),
    );

    if (!updated) {
      throw new LoomisError('LEDGER_ADJUSTMENT_ALREADY_REVIEWED', 409, 'Request already reviewed');
    }

    await writeAudit({
      tenantId: request.tenantId,
      actorUserId: actor.userId,
      action: 'billing.adjustment.rejected',
      resourceType: 'psf_adjustment_request',
      resourceId: requestId,
      sensitivity: 'financial',
      result: 'success',
      requestId: uuidv7(),
      metadata: { termId: request.termId, rejectionReason },
    });

    return toResponse(updated);
  },
};
