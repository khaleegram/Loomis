import { and, desc, eq, sql } from 'drizzle-orm';
import { websitePublishSnapshots, websiteSites } from '../../../../drizzle/schema/website.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

export type WebsiteSiteRow = typeof websiteSites.$inferSelect;
export type WebsitePublishSnapshotRow = typeof websitePublishSnapshots.$inferSelect;

export interface CreateWebsiteSiteInput {
  tenantId: string;
  slug: string;
  templateId: string;
  theme: Record<string, unknown>;
  sections: unknown[];
  seo: Record<string, unknown>;
}

export const websiteRepository = {
  async findByTenantId(tenantId: string): Promise<WebsiteSiteRow | null> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(websiteSites)
        .where(eq(websiteSites.tenantId, tenantId))
        .limit(1);
      return row ?? null;
    });
  },

  async findBySlug(slug: string): Promise<WebsiteSiteRow | null> {
    return withTenantContext(null, async (tx) => {
      const [row] = await tx
        .select()
        .from(websiteSites)
        .where(eq(websiteSites.slug, slug))
        .limit(1);
      return row ?? null;
    });
  },

  async slugExists(slug: string, excludeSiteId?: string): Promise<boolean> {
    return withTenantContext(null, async (tx) => {
      const rows = await tx
        .select({ id: websiteSites.id })
        .from(websiteSites)
        .where(eq(websiteSites.slug, slug));
      if (rows.length === 0) return false;
      if (excludeSiteId && rows.every((r) => r.id === excludeSiteId)) return false;
      return true;
    });
  },

  async create(input: CreateWebsiteSiteInput): Promise<WebsiteSiteRow> {
    return withTenantContext(input.tenantId, async (tx) => {
      const [row] = await tx
        .insert(websiteSites)
        .values({
          tenantId: input.tenantId,
          slug: input.slug,
          templateId: input.templateId,
          theme: input.theme,
          sections: input.sections,
          seo: input.seo,
          status: 'draft',
        })
        .returning();
      if (!row) throw new Error('Failed to create website site');
      return row;
    });
  },

  async updateDraft(
    tenantId: string,
    siteId: string,
    patch: {
      slug?: string;
      templateId?: string;
      theme?: Record<string, unknown>;
      sections?: unknown[];
      seo?: Record<string, unknown>;
    },
  ): Promise<WebsiteSiteRow | null> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .update(websiteSites)
        .set({
          ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
          ...(patch.templateId !== undefined ? { templateId: patch.templateId } : {}),
          ...(patch.theme !== undefined ? { theme: patch.theme } : {}),
          ...(patch.sections !== undefined ? { sections: patch.sections } : {}),
          ...(patch.seo !== undefined ? { seo: patch.seo } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(websiteSites.id, siteId), eq(websiteSites.tenantId, tenantId)))
        .returning();
      return row ?? null;
    });
  },

  async setPublished(
    tenantId: string,
    siteId: string,
    snapshotId: string,
    publishedById: string,
    publishedAt: Date,
    tx?: Executor,
  ): Promise<WebsiteSiteRow | null> {
    const update = async (executor: Executor) => {
      const [row] = await executor
        .update(websiteSites)
        .set({
          status: 'published',
          publishedSnapshotId: snapshotId,
          publishedById,
          publishedAt,
          updatedAt: new Date(),
        })
        .where(and(eq(websiteSites.id, siteId), eq(websiteSites.tenantId, tenantId)))
        .returning();
      return row ?? null;
    };
    if (tx) return update(tx);
    return withTenantContext(tenantId, update);
  },

  async setUnpublished(tenantId: string, siteId: string): Promise<WebsiteSiteRow | null> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .update(websiteSites)
        .set({
          status: 'unpublished',
          updatedAt: new Date(),
        })
        .where(and(eq(websiteSites.id, siteId), eq(websiteSites.tenantId, tenantId)))
        .returning();
      return row ?? null;
    });
  },

  async createSnapshot(
    tenantId: string,
    input: {
      siteId: string;
      version: number;
      templateId: string;
      theme: Record<string, unknown>;
      sections: unknown[];
      seo: Record<string, unknown>;
      publishedById: string;
    },
    tx?: Executor,
  ): Promise<WebsitePublishSnapshotRow> {
    const insert = async (executor: Executor) => {
      const [row] = await executor
        .insert(websitePublishSnapshots)
        .values({
          siteId: input.siteId,
          tenantId,
          version: input.version,
          templateId: input.templateId,
          theme: input.theme,
          sections: input.sections,
          seo: input.seo,
          publishedById: input.publishedById,
        })
        .returning();
      if (!row) throw new Error('Failed to create publish snapshot');
      return row;
    };
    if (tx) return insert(tx);
    return withTenantContext(tenantId, insert);
  },

  async findSnapshotById(
    tenantId: string,
    snapshotId: string,
  ): Promise<WebsitePublishSnapshotRow | null> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(websitePublishSnapshots)
        .where(
          and(
            eq(websitePublishSnapshots.id, snapshotId),
            eq(websitePublishSnapshots.tenantId, tenantId),
          ),
        )
        .limit(1);
      return row ?? null;
    });
  },

  async findSnapshotByIdPublic(snapshotId: string): Promise<WebsitePublishSnapshotRow | null> {
    return withTenantContext(null, async (tx) => {
      const [row] = await tx
        .select()
        .from(websitePublishSnapshots)
        .where(eq(websitePublishSnapshots.id, snapshotId))
        .limit(1);
      return row ?? null;
    });
  },

  async latestSnapshotVersion(tenantId: string, siteId: string): Promise<number> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select({ version: websitePublishSnapshots.version })
        .from(websitePublishSnapshots)
        .where(eq(websitePublishSnapshots.siteId, siteId))
        .orderBy(desc(websitePublishSnapshots.version))
        .limit(1);
      return row?.version ?? 0;
    });
  },

  async listSnapshots(tenantId: string, siteId: string): Promise<WebsitePublishSnapshotRow[]> {
    return withTenantContext(tenantId, async (tx) => {
      return tx
        .select()
        .from(websitePublishSnapshots)
        .where(eq(websitePublishSnapshots.siteId, siteId))
        .orderBy(desc(websitePublishSnapshots.version));
    });
  },

  async countSites(): Promise<number> {
    return withTenantContext(null, async (tx) => {
      const [row] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(websiteSites);
      return row?.count ?? 0;
    });
  },
};
