'use client';

import { formatKobo } from '@loomis/core';
import * as React from 'react';

import { cn } from '../../lib/utils.js';
import { Badge } from './badge.js';

export interface JournalVoucherLeg {
  account: string;
  narration?: string;
  direction: 'debit' | 'credit';
  amountMinor: number;
}

export interface JournalVoucherCardProps {
  voucherLabel?: string;
  date?: string;
  legs: JournalVoucherLeg[];
  /** When set, shows paired reversal relationship (refund reversals). */
  pairedVoucherLabel?: string;
  immutable?: boolean;
  className?: string;
}

function sumLegs(legs: JournalVoucherLeg[], direction: 'debit' | 'credit'): number {
  return legs
    .filter((leg) => leg.direction === direction)
    .reduce((total, leg) => total + leg.amountMinor, 0);
}

/**
 * Journal Voucher Card — immutable audit artifact with gold left border when balanced.
 */
export function JournalVoucherCard({
  voucherLabel,
  date,
  legs,
  pairedVoucherLabel,
  immutable = false,
  className,
}: JournalVoucherCardProps) {
  const debitTotal = sumLegs(legs, 'debit');
  const creditTotal = sumLegs(legs, 'credit');
  const isBalanced = debitTotal > 0 && debitTotal === creditTotal;

  return (
    <div
      className={cn(
        'rounded-sm border bg-card p-4 shadow-xs',
        isBalanced
          ? 'border-l-4 border-l-gold-400 border-y-border border-r-border dark:border-l-gold-400'
          : 'border-l-4 border-l-warning border-y-border border-r-border',
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          {voucherLabel ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {voucherLabel}
            </p>
          ) : null}
          {date ? <p className="text-sm text-foreground">{date}</p> : null}
          {pairedVoucherLabel ? (
            <p className="mt-1 text-xs text-gold-600 dark:text-gold-400">
              Paired reversal · {pairedVoucherLabel}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {immutable ? <Badge variant="outline">Immutable</Badge> : null}
          <Badge variant={isBalanced ? 'gold' : 'destructive'}>
            {isBalanced ? 'Balanced' : 'Unbalanced'}
          </Badge>
        </div>
      </div>

      <ul className="space-y-2">
        {legs.map((leg, index) => (
          <li
            key={`${leg.account}-${leg.direction}-${index}`}
            className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{leg.account}</p>
              {leg.narration ? (
                <p className="text-xs text-muted-foreground">{leg.narration}</p>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <Badge
                variant="outline"
                className={cn(
                  'mb-1 font-mono text-[10px] uppercase',
                  leg.direction === 'debit'
                    ? 'border-danger/30 text-danger dark:text-red-400'
                    : 'border-success/30 text-success dark:text-mint-400',
                )}
              >
                {leg.direction === 'debit' ? 'DR' : 'CR'}
              </Badge>
              <p className="font-mono text-sm tabular-nums text-foreground">
                {formatKobo(leg.amountMinor)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex justify-between border-t border-border pt-2 font-mono text-xs tabular-nums text-muted-foreground">
        <span>DR {formatKobo(debitTotal)}</span>
        <span>CR {formatKobo(creditTotal)}</span>
      </div>
    </div>
  );
}
