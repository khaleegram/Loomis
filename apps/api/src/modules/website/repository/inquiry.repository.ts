import { and, desc, eq, sql } from 'drizzle-orm';
import { websiteInquiries } from '../../../../drizzle/schema/website.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

export type WebsiteInquiryRow = typeof websiteInquiries.$inferSelect;

export interface CreateWebsiteInquiryInput {
  tenantId: string;
  siteId: string;
  type: string;
  submitterName: string;
  submitterEmail: string;
  submitterPhone: string | null;
  message: string;
  metadata: Record<string, unknown>;
  ipHash: string | null;
}

export const websiteInquiryRepository = {
  async create(input: CreateWebsiteInquiryInput): Promise<WebsiteInquiryRow> {
    return withTenantContext(input.tenantId, async (tx) => {
      const [row] = await tx
        .insert(websiteInquiries)
        .values({
          tenantId: input.tenantId,
          siteId: input.siteId,
          type: input.type,
          submitterName: input.submitterName,
          submitterEmail: input.submitterEmail,
          submitterPhone: input.submitterPhone,
          message: input.message,
          metadata: input.metadata,
          ipHash: input.ipHash,
          status: 'new',
        })
        .returning();
      if (!row) throw new Error('Failed to create website inquiry');
      return row;
    });
  },

  async listByTenant(
    tenantId: string,
    filters?: { status?: string },
  ): Promise<WebsiteInquiryRow[]> {
    return withTenantContext(tenantId, async (tx) => {
      const conditions = [eq(websiteInquiries.tenantId, tenantId)];
      if (filters?.status) {
        conditions.push(eq(websiteInquiries.status, filters.status));
      }
      return tx
        .select()
        .from(websiteInquiries)
        .where(and(...conditions))
        .orderBy(desc(websiteInquiries.createdAt));
    });
  },

  async findById(tenantId: string, inquiryId: string): Promise<WebsiteInquiryRow | null> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(websiteInquiries)
        .where(
          and(eq(websiteInquiries.id, inquiryId), eq(websiteInquiries.tenantId, tenantId)),
        )
        .limit(1);
      return row ?? null;
    });
  },

  async updateStatus(
    tenantId: string,
    inquiryId: string,
    status: string,
  ): Promise<WebsiteInquiryRow | null> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .update(websiteInquiries)
        .set({ status, updatedAt: new Date() })
        .where(
          and(eq(websiteInquiries.id, inquiryId), eq(websiteInquiries.tenantId, tenantId)),
        )
        .returning();
      return row ?? null;
    });
  },

  async linkAdmission(
    tenantId: string,
    inquiryId: string,
    admissionId: string,
  ): Promise<WebsiteInquiryRow | null> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .update(websiteInquiries)
        .set({
          admissionId,
          status: 'read',
          updatedAt: new Date(),
        })
        .where(
          and(eq(websiteInquiries.id, inquiryId), eq(websiteInquiries.tenantId, tenantId)),
        )
        .returning();
      return row ?? null;
    });
  },

  async countNew(tenantId: string): Promise<number> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(websiteInquiries)
        .where(
          and(eq(websiteInquiries.tenantId, tenantId), eq(websiteInquiries.status, 'new')),
        );
      return row?.count ?? 0;
    });
  },
};
