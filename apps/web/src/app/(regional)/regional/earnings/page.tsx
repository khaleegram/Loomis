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
  cn,
} from '@loomis/ui-web';

import { RegionalConsoleHero } from '@/components/regional/regional-console-hero';
import { PageBody } from '@/components/regional/regional-shell';
import { REGIONAL_PAGE_CLASS, REGIONAL_UI } from '@/lib/regional/regional-ui';
import { SURFACES } from '@/lib/design/surfaces';
import { AlertTriangle, TrendingUp, Wallet } from 'lucide-react';

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
    <PageBody className={REGIONAL_PAGE_CLASS}>
      <div className="space-y-6">
        <RegionalConsoleHero
          title="Referral earnings"
          description="Payout-cycle statement for your referral network — US-REG-004"
          isLoading={isLoading}
          stats={[
            {
              label: 'Accrued',
              value: formatKobo(summary?.totalAccruedMinor ?? 0),
              hint: 'Current cycle',
              icon: TrendingUp,
              gradient: SURFACES.kpi.g1,
            },
            {
              label: 'Paid',
              value: formatKobo(summary?.totalPaidMinor ?? 0),
              hint: 'Lifetime',
              icon: Wallet,
              gradient: SURFACES.kpi.g2,
            },
            {
              label: 'Eligible',
              value: formatKobo(summary?.totalEligibleMinor ?? 0),
              hint: 'Ready for payout',
              icon: Wallet,
              gradient: SURFACES.kpi.g3,
            },
            {
              label: 'Held',
              value: formatKobo(heldTotal),
              hint: 'IVP / disputes',
              icon: AlertTriangle,
              gradient: heldTotal > 0 ? SURFACES.kpi.g4 : SURFACES.kpi.g4,
            },
          ]}
        />

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
              <span className="font-mono font-semibold">{formatKobo(heldTotal)}</span> held due to
              IVP investigations or disputes — shown separately below.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className={`${REGIONAL_UI.dataPanel} overflow-hidden`}>
          <div className="border-b border-border/80 px-5 py-4">
            <p className={REGIONAL_UI.sectionLabel}>Statement</p>
            <p className="mt-1 text-[14px] font-semibold text-neutral-900">Earnings by payout cycle</p>
          </div>

          {isLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <p className="p-8 text-center text-[13px] text-neutral-500">
              No earnings recorded yet. Onboard schools to begin accruing referral income.
            </p>
          ) : (
            grouped.map(({ cycle, entries }) => (
              <div key={cycle?.id ?? 'unassigned'} className="border-b border-border/80 last:border-0">
                <div className="bg-gradient-to-r from-neutral-50 to-brand-50/30 px-5 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
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
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-[13px]">
                    <thead className={REGIONAL_UI.tableHeader}>
                      <tr>
                        {['School', 'PSF settled', 'Your share', 'Status'].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e) => (
                        <tr
                          key={e.id}
                          className={cn(
                            'border-t border-brand-50/80 font-mono tabular-nums',
                            e.status === 'held' && 'bg-red-50/50',
                          )}
                        >
                          <td className="px-4 py-3 text-[12px] text-neutral-700">{e.tenantId.slice(0, 8)}…</td>
                          <td className="px-4 py-3 text-neutral-800">{formatKobo(e.psfSettledAmountMinor)}</td>
                          <td className="px-4 py-3 text-neutral-800">{formatKobo(e.amountMinor)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'text-[12px]',
                                e.status === 'held' && 'font-semibold text-destructive',
                                e.status === 'paid' && 'text-accent-green-700',
                              )}
                            >
                              {statusLabel(e.status)}
                            </span>
                            {e.holdReason ? (
                              <p className="mt-0.5 font-sans text-[10px] text-neutral-500">{e.holdReason}</p>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageBody>
  );
}
