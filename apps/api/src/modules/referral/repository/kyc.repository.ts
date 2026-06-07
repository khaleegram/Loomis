import { and, desc, eq } from 'drizzle-orm';
import { kycRecords } from '../../../../drizzle/schema/referral.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { KycStatus } from '@loomis/contracts';

export const kycRepository = {
  async findById(tx: Executor, id: string) {
    const [row] = await tx.select().from(kycRecords).where(eq(kycRecords.id, id)).limit(1);
    return row ?? null;
  },

  async findByIdGlobal(id: string) {
    return withTenantContext(null, async (tx) => this.findById(tx, id));
  },

  async findLatestForParticipant(tx: Executor, participantId: string) {
    const [row] = await tx
      .select()
      .from(kycRecords)
      .where(eq(kycRecords.participantId, participantId))
      .orderBy(desc(kycRecords.submittedAt))
      .limit(1);
    return row ?? null;
  },

  async findApprovedForParticipant(tx: Executor, participantId: string) {
    const [row] = await tx
      .select()
      .from(kycRecords)
      .where(
        and(eq(kycRecords.participantId, participantId), eq(kycRecords.status, 'approved')),
      )
      .orderBy(desc(kycRecords.reviewedAt))
      .limit(1);
    return row ?? null;
  },

  async hasApprovedKyc(tx: Executor, participantId: string): Promise<boolean> {
    const row = await this.findApprovedForParticipant(tx, participantId);
    return Boolean(row);
  },

  async create(
    tx: Executor,
    input: {
      participantId: string;
      submittedByUserId: string;
      identityDocumentObjectId: string;
      addressProofObjectId: string;
      conflictOfInterestDeclared: boolean;
      conflictDetails?: string | null;
      conflictAnswers: Record<string, unknown>;
    },
  ) {
    const [row] = await tx
      .insert(kycRecords)
      .values({
        participantId: input.participantId,
        submittedByUserId: input.submittedByUserId,
        identityDocumentObjectId: input.identityDocumentObjectId,
        addressProofObjectId: input.addressProofObjectId,
        conflictOfInterestDeclared: input.conflictOfInterestDeclared,
        conflictDetails: input.conflictDetails ?? null,
        conflictAnswers: input.conflictAnswers,
        status: 'pending',
      })
      .returning();
    if (!row) throw new Error('Failed to create KYC record');
    return row;
  },

  async approve(tx: Executor, id: string, reviewedByUserId: string) {
    const [row] = await tx
      .update(kycRecords)
      .set({
        status: 'approved',
        reviewedByUserId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(kycRecords.id, id))
      .returning();
    return row ?? null;
  },

  async reject(tx: Executor, id: string, reviewedByUserId: string, reason: string) {
    const [row] = await tx
      .update(kycRecords)
      .set({
        status: 'rejected',
        reviewedByUserId,
        reviewedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(kycRecords.id, id))
      .returning();
    return row ?? null;
  },

  async listPending(tx: Executor) {
    return tx
      .select()
      .from(kycRecords)
      .where(eq(kycRecords.status, 'pending'))
      .orderBy(desc(kycRecords.submittedAt));
  },
};
