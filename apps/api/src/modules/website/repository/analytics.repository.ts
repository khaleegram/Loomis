import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { websiteInquiries, websitePageViews } from '../../../../drizzle/schema/website.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

export interface CreateWebsitePageViewInput {
  tenantId: string;
  siteId: string;
  path: string;
  referrerHost: string | null;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
  dailyVisitorHash: string;
}

export const websiteAnalyticsRepository = {
  async createPageView(input: CreateWebsitePageViewInput): Promise<void> {
    await withTenantContext(input.tenantId, async (tx) => {
      await tx.insert(websitePageViews).values(input);
    });
  },

  async dailyViews(
    tenantId: string,
    siteId: string,
    since: Date,
  ): Promise<Array<{ date: string; pageViews: number; uniqueVisitors: number }>> {
    return withTenantContext(tenantId, async (tx) => {
      const rows = await tx
        .select({
          date: sql<string>`to_char(date_trunc('day', ${websitePageViews.createdAt}), 'YYYY-MM-DD')`,
          pageViews: sql<number>`count(*)::int`,
          uniqueVisitors: sql<number>`count(distinct ${websitePageViews.dailyVisitorHash})::int`,
        })
        .from(websitePageViews)
        .where(
          and(
            eq(websitePageViews.siteId, siteId),
            eq(websitePageViews.tenantId, tenantId),
            gte(websitePageViews.createdAt, since),
          ),
        )
        .groupBy(sql`date_trunc('day', ${websitePageViews.createdAt})`)
        .orderBy(sql`date_trunc('day', ${websitePageViews.createdAt})`);

      return rows;
    });
  },

  async topReferrers(
    tenantId: string,
    siteId: string,
    since: Date,
  ): Promise<Array<{ host: string; pageViews: number }>> {
    return withTenantContext(tenantId, async (tx) => {
      return tx
        .select({
          host: sql<string>`coalesce(${websitePageViews.referrerHost}, 'Direct')`,
          pageViews: sql<number>`count(*)::int`,
        })
        .from(websitePageViews)
        .where(
          and(
            eq(websitePageViews.siteId, siteId),
            eq(websitePageViews.tenantId, tenantId),
            gte(websitePageViews.createdAt, since),
          ),
        )
        .groupBy(sql`coalesce(${websitePageViews.referrerHost}, 'Direct')`)
        .orderBy(desc(sql`count(*)`))
        .limit(8);
    });
  },

  async inquiryCounts(
    tenantId: string,
    siteId: string,
    since: Date,
  ): Promise<{ inquiries: number; admissionInterest: number }> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select({
          inquiries: sql<number>`count(*)::int`,
          admissionInterest: sql<number>`count(*) filter (where ${websiteInquiries.type} = 'admission_interest')::int`,
        })
        .from(websiteInquiries)
        .where(
          and(
            eq(websiteInquiries.siteId, siteId),
            eq(websiteInquiries.tenantId, tenantId),
            gte(websiteInquiries.createdAt, since),
          ),
        );

      return {
        inquiries: row?.inquiries ?? 0,
        admissionInterest: row?.admissionInterest ?? 0,
      };
    });
  },
};
