import type { EnrollmentAttestationResponse } from '@loomis/contracts';
import { attestationRepository } from '../repository/attestation.repository.js';
import type { ActorContext } from '../types.js';
import { requireTenant } from './_shared.js';

function serializeAttestation(
  row: Awaited<ReturnType<typeof attestationRepository.listByTenant>>[number],
): EnrollmentAttestationResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    termId: row.termId,
    systemBillableCount: row.systemBillableCount,
    generatedBy: row.generatedBy,
    attestedById: row.attestedById,
    attestedAt: row.attestedAt.toISOString(),
    studentListHash: row.studentListHash,
    attestationHash: row.attestationHash,
    rateSnapshotId: row.rateSnapshotId,
    psfRateMinor: row.psfRateMinor,
    attestationStatus: row.attestationStatus as EnrollmentAttestationResponse['attestationStatus'],
    createdAt: row.createdAt.toISOString(),
  };
}

/** US-REV-002 — census lock attestation history (read-only). */
export const attestationService = {
  async listAttestations(tenantId: string, actor: ActorContext, limit?: number) {
    requireTenant(actor, tenantId);
    const rows = await attestationRepository.listByTenant(tenantId, limit);
    return { attestations: rows.map(serializeAttestation) };
  },
};
