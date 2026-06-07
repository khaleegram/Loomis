import { createHash } from 'node:crypto';

/** SHA-256 of the sorted billable student ID list (System Design §8.1 step 6). */
export function buildStudentListHash(studentIds: string[]): string {
  const sorted = [...studentIds].sort();
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
}

/** Tamper-evident digest of the attested census figures. */
export function buildAttestationHash(parts: {
  tenantId: string;
  termId: string;
  declaredBillableCount: number;
  systemBillableCount: number;
  studentListHash: string;
  rateSnapshotId: string;
  psfRateMinor: number;
  attestedById: string;
  lockedAt: string;
}): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}
