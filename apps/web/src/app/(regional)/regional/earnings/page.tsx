'use client';

import { useMemo } from 'react';
import { formatKobo } from '@loomis/core';
import {
  useMyEarnings,
  useMyEarningsSummary,
  useRegionalPayoutCycles,
} from '@loomis/api-client';
import type { EarningEntryResponse, PayoutCycleResponse } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Badge,
  ProgressStrip,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@loomis/ui-web';

import { PageBody, PageHeader } from '@/components/regional/regional-shell';

function groupByCycle(
  earnings: EarningEntryResponse[],
  cycles: PayoutCycleResponse[],
): { cycle: PayoutCycleResponse | null; entries: EarningEntryResponse[] }[] {
  const cycleMap = new Map(cycles.map((c) => [c.id, c]));
  const groups = new Map<string, EarningEntryResponse[]>();

  for (const e of earnings) {
    const key = e.payoutCycleId ?? 'unassigned';
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .map(([cycleId, entries]) => ({
      cycle: cycleId === 'unassigned' ? null : (cycleMap.get(cycleId) ?? null),
      entries,
    }))
    .sort((a, b) => {
      const aDate = a.cycle?.periodStart ?? '';
      const bDate = b.cycle?.periodStart ?? '';
      return bDate.localeCompare(aDate);
    });
}

function statusLabel(status: EarningEntryResponse['status']): string {
  const map: Record<EarningEntryResponse['status'], string> = {
    accrued: 'Accrued',
    held: 'Held',
    eligible: 'Eligible',
    paid: 'Paid',
    forfeited: 'Forfeited',
    carried_forward: 'Carried forward',
  };
  return map[status] ?? status;
}

export default function ReferralEarningsPage() {
  const { data: summary, isLoading: summaryLoading } = useMyEarningsSummary();
  const { data: earnings, isLoading: earningsLoading } = useMyEarnings();
  const { data: cycles, isLoading: cyclesLoading } = useRegionalPayoutCycles();

  const isLoading = summaryLoading || earningsLoading || cyclesLoading;

  const grouped = useMemo(
    () => groupByCycle(earnings ?? [], cycles ?? []),
    [earnings, cycles],
  );

  const openCycle = (cycles ?? []).find((c) => c.status === 'open');
  const capUsage = openCycle?.tenantCapUsage ?? {};
  const capEntries = Object.entries(capUsage);
  const maxCapPct =
    capEntries.length > 0
      ? Math.max(
          ...capEntries.map(([, u]) =>
            u.capMinor > 0 ? (u.referralPaidMinor / u.capMinor) * 100 : 0,
          ),
        )
      : 0;

  const heldTotal = summary?.totalHeldMinor ?? 0;

  return (
    <>
      <PageHeader
        title="Referral Earnings"
        description="Payout-cycle statement for your referral network — US-REG-004"
      />
      <PageBody>
        <div className="space-y-6">
          {/* Summary strip */}
          <div className="grid grid-cols-1 gap-4 border-b border-neutral-200 pb-6 dark:border-forest-800 sm:grid-cols-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))
            ) : (
              <>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                    Current Cycle Accrued
                  </p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                    {formatKobo(summary?.totalAccruedMinor ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                    Total Paid to Date
                  </p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                    {formatKobo(summary?.totalPaidMinor ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                    Eligible for Payout
                  </p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-gold-600 dark:text-gold-400">
                    {formatKobo(summary?.totalEligibleMinor ?? 0)}
                  </p>
                </div>
              </>
            )}
          </div>

          {!isLoading && capEntries.length > 0 ? (
            <ProgressStrip
              label="40% per-tenant payout cap (current cycle)"
              valueLabel={`${maxCapPct.toFixed(0)}% of cap used`}
              percent={maxCapPct}
              nearCap={maxCapPct >= 85}
            />
          ) : null}

          {!isLoading && heldTotal > 0 ? (
            <Alert variant="destructive">
              <AlertDescription>
                <span className="font-mono font-semibold">{formatKobo(heldTotal)}</span> held due
                to IVP investigations or disputes — shown separately below.
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Bank statement body */}
          <div className="rounded-lg border border-neutral-200 bg-white dark:border-forest-800 dark:bg-forest-900">
            <div className="border-b border-neutral-200 px-6 py-4 dark:border-forest-800">
              <h2 className="font-serif text-base font-semibold">Earnings Statement</h2>
              <p className="text-xs text-muted-foreground">Grouped by payout cycle</p>
            </div>

            {isLoading ? (
              <div className="space-y-4 p-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : grouped.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No earnings recorded yet. Onboard schools to begin accruing referral income.
              </p>
            ) : (
              grouped.map(({ cycle, entries }) => (
                <div
                  key={cycle?.id ?? 'unassigned'}
                  className="border-b border-neutral-100 last:border-0 dark:border-forest-800"
                >
                  <div className="bg-neutral-50 px-6 py-3 dark:bg-forest-950">
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      {cycle
                        ? `${new Date(cycle.periodStart).toLocaleDateString('en-NG')} — ${new Date(cycle.periodEnd).toLocaleDateString('en-NG')}`
                        : 'Unassigned cycle'}
                    </p>
                    {cycle ? (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {cycle.status}
                      </Badge>
                    ) : null}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>School</TableHead>
                        <TableHead>PSF Settled</TableHead>
                        <TableHead>Your Share</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((e) => (
                        <TableRow
                          key={e.id}
                          className={cn(
                            'font-mono tabular-nums',
                            e.status === 'held' && 'bg-danger/5',
                          )}
                        >
                          <TableCell className="text-xs">{e.tenantId.slice(0, 8)}…</TableCell>
                          <TableCell>{formatKobo(e.psfSettledAmountMinor)}</TableCell>
                          <TableCell>{formatKobo(e.amountMinor)}</TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'text-xs',
                                e.status === 'held' && 'font-semibold text-danger',
                                e.status === 'paid' && 'text-success',
                              )}
                            >
                              {statusLabel(e.status)}
                            </span>
                            {e.holdReason ? (
                              <p className="mt-0.5 font-sans text-[10px] text-muted-foreground">
                                {e.holdReason}
                              </p>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}
