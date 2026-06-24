import { and, eq } from 'drizzle-orm';
import { provisionDrafts } from '../../../../drizzle/schema/tenant.js';
import { db, type Executor } from '../../../shared/db.js';

export type ProvisionDraftSource = 'platform' | 'regional';

export const provisionDraftRepository = {
  async findByActor(createdById: string, source: ProvisionDraftSource, tx?: Executor) {
    const executor = tx ?? db;
    const [row] = await executor
      .select()
      .from(provisionDrafts)
      .where(
        and(eq(provisionDrafts.createdById, createdById), eq(provisionDrafts.source, source)),
      )
      .limit(1);
    return row ?? null;
  },

  async upsert(
    input: {
      createdById: string;
      source: ProvisionDraftSource;
      payload: Record<string, unknown>;
      stepIndex: number;
    },
    tx?: Executor,
  ) {
    const executor = tx ?? db;
    const existing = await this.findByActor(input.createdById, input.source, executor);
    if (existing) {
      const [row] = await executor
        .update(provisionDrafts)
        .set({
          payload: input.payload,
          stepIndex: input.stepIndex,
          updatedAt: new Date(),
        })
        .where(eq(provisionDrafts.id, existing.id))
        .returning();
      return row!;
    }
    const [row] = await executor
      .insert(provisionDrafts)
      .values({
        createdById: input.createdById,
        source: input.source,
        payload: input.payload,
        stepIndex: input.stepIndex,
      })
      .returning();
    return row!;
  },

  async deleteByActor(createdById: string, source: ProvisionDraftSource, tx?: Executor) {
    const executor = tx ?? db;
    await executor
      .delete(provisionDrafts)
      .where(
        and(eq(provisionDrafts.createdById, createdById), eq(provisionDrafts.source, source)),
      );
  },
};
