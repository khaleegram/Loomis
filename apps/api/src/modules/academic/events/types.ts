/**
 * Events published by the Academic Session module (System Design §3.2 / §8.1).
 *
 * These are written to the durable transactional outbox (`ledger.outbox_events`)
 * inside the producing transaction — never dispatched out-of-band. The BullMQ
 * relay (built with the Ledger module) drains them to consumers.
 */
export const ACADEMIC_EVENT_TYPES = {
  yearActivated: 'academic.year.activated',
  yearClosed: 'academic.year.closed',
  termOpened: 'academic.term.opened',
  /**
   * The revenue trigger (System Design §8.1, line 143): the Ledger module
   * consumes this to create one PSF obligation per billable student plus the
   * balanced double-entry ledger postings. PSF obligations are created by census
   * lock, NEVER by payment (loomis-financial-integrity, CON-006).
   */
  termCensusLocked: 'academic.term.census_locked',
  termClosed: 'academic.term.closed',
  promotionConfirmed: 'academic.promotion.confirmed',
} as const;

export interface TermCensusLockedPayload extends Record<string, unknown> {
  tenantId: string;
  academicYearId: string;
  termId: string;
  declaredBillableCount: number;
  systemBillableCount: number;
  /** The PSF rate snapshot in effect at lock time, in kobo (System Design §8.1). */
  psfRateMinor: number;
  rateSnapshotId: string;
  /** SHA-256 of the sorted billable student ID list at lock time. */
  studentListHash: string;
  /** SHA-256 of the attested figures — the tamper-evident attestation digest. */
  attestationHash: string;
  attestedById: string;
  censusLockedAt: string;
}
