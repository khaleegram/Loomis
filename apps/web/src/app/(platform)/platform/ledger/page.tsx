'use client';

import { usePlatformLedger } from '@loomis/api-client';
import { Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@loomis/ui-web';

import { PageBody, PageHeader } from '@/components/platform/platform-shell';

const DIRECTION_COLOR: Record<string, string> = {
  debit: 'text-red-600 dark:text-red-400',
  credit: 'text-green-600 dark:text-green-400',
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

  return (
    <>
      <PageHeader
        title="Platform Ledger"
        description="Immutable double-entry ledger — all financial movements — US-REV-004"
      />
      <PageBody>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : isError ? (
          <p className="text-sm text-destructive">{(error as Error).message ?? 'Ledger read endpoint may not be available yet.'}</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <p className="text-sm text-muted-foreground">No ledger entries found.</p>
            <p className="mt-1 text-xs text-muted-foreground">Entries are recorded when financial events occur on the platform.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {e.createdAt ? new Date(e.createdAt).toISOString().replace('T', ' ').slice(0, 19) : '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{e.accountCode ?? e.account?.slice(0, 12) ?? '—'}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-semibold uppercase ${DIRECTION_COLOR[e.direction] ?? ''}`}>
                      {e.direction}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">
                    {e.amountMinor != null ? `₦${(e.amountMinor / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.sourceType ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PageBody>
    </>
  );
}
