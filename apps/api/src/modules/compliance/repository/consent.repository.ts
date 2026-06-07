import { desc, eq } from 'drizzle-orm';
import { consentVersions } from '../../../../drizzle/schema/compliance.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

export const consentRepository = {
  async create(
    tx: Executor,
    input: {
      versionLabel: string;
      privacyPolicyHash: string;
      contentSummary: string;
      effectiveFrom: Date;
      publishedById: string;
    },
  ) {
    await tx
      .update(consentVersions)
      .set({ isActive: false })
      .where(eq(consentVersions.isActive, true));

    const [row] = await tx
      .insert(consentVersions)
      .values({
        versionLabel: input.versionLabel,
        privacyPolicyHash: input.privacyPolicyHash,
        contentSummary: input.contentSummary,
        effectiveFrom: input.effectiveFrom,
        publishedById: input.publishedById,
        isActive: true,
      })
      .returning();
    if (!row) throw new Error('Failed to create consent version');
    return row;
  },

  async findActive(tx: Executor) {
    const [row] = await tx
      .select()
      .from(consentVersions)
      .where(eq(consentVersions.isActive, true))
      .limit(1);
    return row ?? null;
  },

  async list(tx: Executor) {
    return tx.select().from(consentVersions).orderBy(desc(consentVersions.effectiveFrom));
  },

  async findByVersionLabel(tx: Executor, versionLabel: string) {
    const [row] = await tx
      .select()
      .from(consentVersions)
      .where(eq(consentVersions.versionLabel, versionLabel))
      .limit(1);
    return row ?? null;
  },

  async listGlobal() {
    return withTenantContext(null, async (tx) => this.list(tx));
  },

  async findActiveGlobal() {
    return withTenantContext(null, async (tx) => this.findActive(tx));
  },
};
