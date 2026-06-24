import { and, eq, sql } from 'drizzle-orm';
import { ledgerEntries } from '../../../../drizzle/schema/ledger.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { LedgerPostInput } from '../types.js';

export const ledgerEntryRepository = {
  async insertPosting(tx: Executor, ledgerTxnId: string, input: LedgerPostInput): Promise<void> {
    const currency = input.currency ?? 'NGN';
    await tx.insert(ledgerEntries).values(
      input.entries.map((leg) => ({
        ledgerTxnId,
        tenantId: input.tenantId,
        accountCode: leg.accountCode,
        direction: leg.direction,
        amountMinor: leg.amountMinor,
        currency,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      })),
    );
  },

  async sumDebitsAndCredits(): Promise<{ debitTotalMinor: number; creditTotalMinor: number }> {
    return withTenantContext(null, async (tx) => {
      const [row] = await tx
        .select({
          debitTotalMinor: sql<number>`coalesce(sum(case when ${ledgerEntries.direction} = 'debit' then ${ledgerEntries.amountMinor} else 0 end), 0)::bigint`,
          creditTotalMinor: sql<number>`coalesce(sum(case when ${ledgerEntries.direction} = 'credit' then ${ledgerEntries.amountMinor} else 0 end), 0)::bigint`,
        })
        .from(ledgerEntries);
      return {
        debitTotalMinor: Number(row?.debitTotalMinor ?? 0),
        creditTotalMinor: Number(row?.creditTotalMinor ?? 0),
      };
    });
  },

  async sumAccountCredits(accountCode: string): Promise<number> {
    return withTenantContext(null, async (tx) => {
      const [row] = await tx
        .select({
          total: sql<number>`coalesce(sum(${ledgerEntries.amountMinor}), 0)::bigint`,
        })
        .from(ledgerEntries)
        .where(
          and(eq(ledgerEntries.accountCode, accountCode), eq(ledgerEntries.direction, 'credit')),
        );
      return Number(row?.total ?? 0);
    });
  },
};
