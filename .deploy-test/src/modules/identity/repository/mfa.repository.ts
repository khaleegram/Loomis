import { eq } from 'drizzle-orm';
import { mfaConfigs } from '../../../../drizzle/schema/identity.js';
import { db, type Executor } from '../../../shared/db.js';
import type { CreateMfaConfigInput, MfaStatus } from '../types.js';

export const mfaRepository = {
  async findByUserId(userId: string) {
    const [config] = await db
      .select()
      .from(mfaConfigs)
      .where(eq(mfaConfigs.userId, userId))
      .limit(1);
    return config ?? null;
  },

  async create(input: CreateMfaConfigInput, tx?: Executor) {
    const executor = tx ?? db;
    const [config] = await executor
      .insert(mfaConfigs)
      .values({
        userId: input.userId,
        encryptedSecret: input.encryptedSecret,
        status: input.status,
      })
      .returning();
    if (!config) throw new Error('Failed to create MFA config');
    return config;
  },

  async updateEncryptedSecret(
    userId: string,
    encryptedSecret: string,
    status: MfaStatus,
    tx?: Executor,
  ) {
    const executor = tx ?? db;
    const [config] = await executor
      .update(mfaConfigs)
      .set({
        encryptedSecret,
        status,
        updatedAt: new Date(),
      })
      .where(eq(mfaConfigs.userId, userId))
      .returning();
    return config ?? null;
  },

  async activate(
    userId: string,
    backupCodesHash: string[],
    tx?: Executor,
  ) {
    const executor = tx ?? db;
    const [config] = await executor
      .update(mfaConfigs)
      .set({
        status: 'active',
        backupCodesHash,
        usedBackupCodeIndexes: [],
        enrolledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mfaConfigs.userId, userId))
      .returning();
    return config ?? null;
  },

  async markBackupCodeUsed(
    userId: string,
    codeIndex: number,
    tx?: Executor,
  ) {
    const config = await this.findByUserId(userId);
    if (!config) return null;

    const usedIndexes = [...config.usedBackupCodeIndexes, codeIndex];
    const executor = tx ?? db;
    const [updated] = await executor
      .update(mfaConfigs)
      .set({
        usedBackupCodeIndexes: usedIndexes,
        updatedAt: new Date(),
      })
      .where(eq(mfaConfigs.userId, userId))
      .returning();
    return updated ?? null;
  },

  async reset(userId: string, encryptedSecret: string, tx?: Executor) {
    const executor = tx ?? db;
    const [config] = await executor
      .update(mfaConfigs)
      .set({
        encryptedSecret,
        status: 'pending',
        backupCodesHash: [],
        usedBackupCodeIndexes: [],
        enrolledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(mfaConfigs.userId, userId))
      .returning();
    return config ?? null;
  },

  async deleteByUserId(userId: string, tx?: Executor) {
    const executor = tx ?? db;
    const [config] = await executor
      .delete(mfaConfigs)
      .where(eq(mfaConfigs.userId, userId))
      .returning();
    return config ?? null;
  },
};
