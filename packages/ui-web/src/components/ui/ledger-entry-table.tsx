'use client';

import { formatKobo } from '@loomis/core';

import { cn } from '../../lib/utils.js';
import { Badge } from './badge.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table.js';

export interface LedgerEntryRow {
  id: string;
  transactionId: string;
  account: string;
  narration?: string;
  direction: 'debit' | 'credit';
  amountMinor: number;
  postedAt?: string;
}

export interface LedgerEntryTableProps {
  entries: LedgerEntryRow[];
  className?: string;
}

/**
 * Dense ledger drill-down table (Option 4) — sortable account view for auditors.
 */
export function LedgerEntryTable({ entries, className }: LedgerEntryTableProps) {
  const grouped = entries.reduce<Map<string, LedgerEntryRow[]>>((map, row) => {
    const bucket = map.get(row.transactionId) ?? [];
    bucket.push(row);
    map.set(row.transactionId, bucket);
    return map;
  }, new Map());

  return (
    <div className={cn('overflow-hidden rounded-sm border bg-card shadow-xs', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Transaction</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>DR / CR</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...grouped.entries()].map(([transactionId, legs]) =>
            legs.map((row, index) => (
              <TableRow key={row.id} className="font-mono text-sm tabular-nums">
                <TableCell className="text-muted-foreground">
                  {index === 0 ? `···${transactionId.slice(-8)}` : ''}
                </TableCell>
                <TableCell>
                  <span className="font-sans font-medium text-foreground">{row.account}</span>
                  {row.narration ? (
                    <p className="font-sans text-xs font-normal text-muted-foreground">
                      {row.narration}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] uppercase',
                      row.direction === 'debit'
                        ? 'text-danger dark:text-red-400'
                        : 'text-success dark:text-mint-400',
                    )}
                  >
                    {row.direction === 'debit' ? 'DR' : 'CR'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatKobo(row.amountMinor)}</TableCell>
              </TableRow>
            )),
          )}
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                No ledger entries to display.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
