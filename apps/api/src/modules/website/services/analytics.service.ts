import { createHmac } from 'node:crypto';
import type {
  SubmitWebsitePageViewRequest,
  WebsiteAnalyticsResponse,
} from '@loomis/contracts';
import { getEnv } from '../../../config/env.js';
import { tenantRepository } from '../../tenant/repository/tenant.repository.js';
import { websiteAnalyticsRepository } from '../repository/analytics.repository.js';
import { websiteRepository } from '../repository/website.repository.js';
import { websiteService } from './website.service.js';

type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(`${utcDateKey(date)}T00:00:00.000Z`);
}

function normaliseRange(days: number | undefined): number {
  if (!days || Number.isNaN(days)) return 30;
  return Math.min(Math.max(Math.trunc(days), 7), 90);
}

function normalisePath(path: string | undefined): string {
  const raw = (path || '/').trim();
  if (!raw.startsWith('/')) return '/';
  return raw.slice(0, 500);
}

function referrerHost(referrer: string | undefined): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).host.toLowerCase();
    return host || null;
  } catch {
    return null;
  }
}

function deviceType(userAgent: string | undefined): DeviceType {
  const ua = (userAgent ?? '').toLowerCase();
  if (!ua) return 'unknown';
  if (/bot|crawler|spider|preview|slurp/.test(ua)) return 'bot';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  if (/mobile|iphone|android/.test(ua)) return 'mobile';
  return 'desktop';
}

function dailyVisitorHash(siteId: string, ip: string, now: Date): string {
  return createHmac('sha256', getEnv().REFRESH_TOKEN_HMAC_SECRET)
    .update(`${siteId}:${utcDateKey(now)}:${ip}`)
    .digest('hex');
}

function dailyRange(days: number): string[] {
  const today = startOfUtcDay(new Date());
  return Array.from({ length: days }, (_, idx) => {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - (days - 1 - idx));
    return utcDateKey(day);
  });
}

export const websiteAnalyticsService = {
  async recordPageView(
    slug: string,
    input: SubmitWebsitePageViewRequest,
    meta: { ip: string; userAgent?: string },
  ): Promise<void> {
    const site = await websiteRepository.findBySlug(slug.trim().toLowerCase());
    if (!site || site.status !== 'published') return;

    const tenant = await tenantRepository.findById(site.tenantId);
    if (!tenant || tenant.status === 'suspended') return;

    const now = new Date();
    await websiteAnalyticsRepository.createPageView({
      tenantId: site.tenantId,
      siteId: site.id,
      path: normalisePath(input.path),
      referrerHost: referrerHost(input.referrer),
      deviceType: deviceType(meta.userAgent),
      dailyVisitorHash: dailyVisitorHash(site.id, meta.ip, now),
    });
  },

  async getAnalytics(tenantId: string, days?: number): Promise<WebsiteAnalyticsResponse> {
    const site = await websiteService.ensureSite(tenantId);
    const rangeDays = normaliseRange(days);
    const today = startOfUtcDay(new Date());
    const since = new Date(today);
    since.setUTCDate(today.getUTCDate() - (rangeDays - 1));

    const [dailyRows, topReferrers, inquiryCounts] = await Promise.all([
      websiteAnalyticsRepository.dailyViews(tenantId, site.id, since),
      websiteAnalyticsRepository.topReferrers(tenantId, site.id, since),
      websiteAnalyticsRepository.inquiryCounts(tenantId, site.id, since),
    ]);

    const byDate = new Map(dailyRows.map((row) => [row.date, row]));
    const daily = dailyRange(rangeDays).map((date) => {
      const row = byDate.get(date);
      return {
        date,
        pageViews: row?.pageViews ?? 0,
        uniqueVisitors: row?.uniqueVisitors ?? 0,
      };
    });

    return {
      rangeDays,
      totals: {
        pageViews: daily.reduce((sum, row) => sum + row.pageViews, 0),
        uniqueVisitors: daily.reduce((sum, row) => sum + row.uniqueVisitors, 0),
        inquiries: inquiryCounts.inquiries,
        admissionInterest: inquiryCounts.admissionInterest,
      },
      daily,
      topReferrers,
    };
  },
};
