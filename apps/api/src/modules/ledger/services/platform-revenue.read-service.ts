import { and, eq, gte, sql } from 'drizzle-orm';
import { psfObligations, psfSettlements } from '../../../../drizzle/schema/ledger.js';
import { tenants } from '../../../../drizzle/schema/tenant.js';
import { db } from '../../../shared/db.js';

function monthsForPeriod(period: string): number {
  if (period === '6m') return 6;
  if (period === '24m') return 24;
  return 12;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function buildMonthRange(count: number): string[] {
  const keys: string[] = [];
  const cursor = new Date();
  cursor.setUTCDate(1);
  cursor.setUTCHours(0, 0, 0, 0);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setUTCMonth(cursor.getUTCMonth() - i);
    keys.push(monthKey(d));
  }
  return keys;
}

/** Platform revenue read model — aggregates PSF obligations/settlements and tenant counts. */
export const platformRevenueReadService = {
  async getSummary() {
    const [[billedRow], [settledRow], [activeRow]] = await Promise.all([
      db
        .select({ total: sql<number>`coalesce(sum(${psfObligations.amountMinor}), 0)` })
        .from(psfObligations),
      db
        .select({ total: sql<number>`coalesce(sum(${psfSettlements.settlementAmountMinor}), 0)` })
        .from(psfSettlements)
        .where(eq(psfSettlements.settlementStatus, 'VERIFIED')),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(tenants)
        .where(eq(tenants.status, 'active')),
    ]);

    const billedMinor = Number(billedRow?.total ?? 0);
    const settledMinor = Number(settledRow?.total ?? 0);
    const outstandingMinor = Math.max(0, billedMinor - settledMinor);

    return {
      billedMinor,
      settledMinor,
      outstandingMinor,
      activeTenants: Number(activeRow?.count ?? 0),
      billedChangePct: null as number | null,
      settledChangePct: null as number | null,
      asOf: new Date().toISOString(),
    };
  },

  async getChart(period: string) {
    const months = monthsForPeriod(period);
    const cutoff = new Date();
    cutoff.setUTCDate(1);
    cutoff.setUTCHours(0, 0, 0, 0);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - (months - 1));

    const billedRows = await db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${psfObligations.createdAt}), 'YYYY-MM')`,
        total: sql<number>`coalesce(sum(${psfObligations.amountMinor}), 0)`,
      })
      .from(psfObligations)
      .where(gte(psfObligations.createdAt, cutoff))
      .groupBy(sql`date_trunc('month', ${psfObligations.createdAt})`);

    const settledRows = await db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${psfSettlements.createdAt}), 'YYYY-MM')`,
        total: sql<number>`coalesce(sum(${psfSettlements.settlementAmountMinor}), 0)`,
      })
      .from(psfSettlements)
      .where(
        and(
          eq(psfSettlements.settlementStatus, 'VERIFIED'),
          gte(psfSettlements.createdAt, cutoff),
        ),
      )
      .groupBy(sql`date_trunc('month', ${psfSettlements.createdAt})`);

    const billedByMonth = new Map(billedRows.map((row) => [row.month, Number(row.total)]));
    const settledByMonth = new Map(settledRows.map((row) => [row.month, Number(row.total)]));

    const points = buildMonthRange(months).map((month) => ({
      month,
      billedMinor: billedByMonth.get(month) ?? 0,
      settledMinor: settledByMonth.get(month) ?? 0,
    }));

    return { period, points };
  },
};
