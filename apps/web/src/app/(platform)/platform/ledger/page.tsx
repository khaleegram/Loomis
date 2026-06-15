'use client';

import { BookOpen, Layers, Wallet } from 'lucide-react';
import { usePlatformLedger } from '@loomis/api-client';
import { Skeleton } from '@loomis/ui-web';

import { PlatformConsoleHero } from '@/components/platform/platform-console-hero';
import { PageBody } from '@/components/platform/platform-shell';
import { PLATFORM_PAGE_CLASS, PLATFORM_UI } from '@/lib/platform/platform-ui';
import { SURFACES } from '@/lib/design/surfaces';

const DIRECTION_COLOR: Record<string, string> = {
  debit: 'text-red-600',
  credit: 'text-green-700',
};

interface LedgerEntry {
  id: string;
  createdAt?: string;
  accountCode?: string;
  account?: string;
  direction: string;
  amountMinor?: number;
  sourceType?: string;
}

interface PlatformLedgerResponse {
  entries?: LedgerEntry[];
}

export default function PlatformLedgerPage() {
  const { data, isLoading, isError, error } = usePlatformLedger();
  const entries = (data as PlatformLedgerResponse | undefined)?.entries ?? [];
  const debitCount = entries.filter((e) => e.direction === 'debit').length;
  const creditCount = entries.filter((e) => e.direction === 'credit').length;

  return (
    <PageBody className={PLATFORM_PAGE_CLASS}>
      <div className="space-y-6">
        <PlatformConsoleHero
          sectionLabel="Financial integrity"
          title="Platform ledger"
          description="Immutable double-entry ledger — all financial movements across the platform."
          isLoading={isLoading}
          stats={[
            {
              label: 'Entries',
              value: String(entries.length),
              hint: 'Recent ledger rows',
              icon: BookOpen,
              gradient: SURFACES.kpi.g1,
            },
            {
              label: 'Debits',
              value: String(debitCount),
              hint: 'Debit postings',
              icon: Layers,
              gradient: SURFACES.kpi.g4,
            },
            {
              label: 'Credits',
              value: String(creditCount),
              hint: 'Credit postings',
              icon: Wallet,
              gradient: SURFACES.kpi.g2,
            },
            {
              label: 'Mode',
              value: 'Read-only',
              hint: 'Insert-only at source',
              icon: BookOpen,
              gradient: SURFACES.kpi.g3,
            },
          ]}
        />

        <div className={`${PLATFORM_UI.dataPanel} overflow-hidden`}>
          {isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <p className="p-6 text-[13px] text-destructive">
              {(error as Error).message ?? 'Ledger read endpoint may not be available yet.'}
            </p>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[15px] font-semibold text-neutral-800">No ledger entries</p>
              <p className="mt-2 text-[13px] text-neutral-500">
                Entries appear when financial events are posted on the platform.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead className={PLATFORM_UI.tableHeader}>
                  <tr>
                    {['Timestamp', 'Account', 'Direction', 'Amount', 'Source'].map((head) => (
                      <th
                        key={head}
                        className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-t border-brand-50/80">
                      <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-neutral-700">
                        {entry.createdAt
                          ? new Date(entry.createdAt).toISOString().replace('T', ' ').slice(0, 19)
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-neutral-700">
                        {entry.accountCode ?? entry.account?.slice(0, 12) ?? '—'}
                      </td>
                      <td className={`px-4 py-3 text-[11px] font-bold uppercase ${DIRECTION_COLOR[entry.direction] ?? ''}`}>
                        {entry.direction}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums text-neutral-900">
                        {entry.amountMinor != null
                          ? `₦${(entry.amountMinor / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-neutral-500">{entry.sourceType ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageBody>
  );
}
