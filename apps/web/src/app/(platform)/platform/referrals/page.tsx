'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { formatKobo } from '@loomis/core';
import { usePlatformReferralParticipants, usePlatformPayoutCycles } from '@loomis/api-client';
import { Badge, Skeleton, cn } from '@loomis/ui-web';
import type { KycStatus, ParticipantStatus } from '@loomis/contracts';
import { Coins, Users, Wallet } from 'lucide-react';

import { PlatformConsoleHero } from '@/components/platform/platform-console-hero';
import { PageBody } from '@/components/platform/platform-shell';
import { PLATFORM_PAGE_CLASS, PLATFORM_UI } from '@/lib/platform/platform-ui';
import { SURFACES } from '@/lib/design/surfaces';

function KycBadge({ status }: { status: KycStatus | null }) {
  if (!status) return <Badge variant="secondary">—</Badge>;
  const variants: Record<KycStatus, 'default' | 'secondary' | 'destructive' | 'gold'> = {
    approved: 'default',
    pending: 'gold',
    rejected: 'destructive',
  };
  return <Badge variant={variants[status]}>{status}</Badge>;
}

function ParticipantStatusBadge({ status }: { status: ParticipantStatus }) {
  const variants: Record<ParticipantStatus, 'default' | 'secondary' | 'destructive'> = {
    active: 'default',
    pending_kyc: 'secondary',
    deactivated: 'destructive',
  };
  const labels: Record<ParticipantStatus, string> = {
    active: 'Active',
    pending_kyc: 'KYC pending',
    deactivated: 'Deactivated',
  };
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}

type Tab = 'participants' | 'payouts';

export default function ReferralsPage() {
  const [tab, setTab] = useState<Tab>('participants');
  const { data: participantsData, isLoading: pLoading } = usePlatformReferralParticipants();
  const { data: cyclesData, isLoading: cLoading } = usePlatformPayoutCycles();

  const participants = participantsData?.participants ?? [];
  const cycles = cyclesData?.cycles ?? [];
  const totalEarned = participants.reduce((s, p) => s + p.totalEarnedMinor, 0);
  const totalEligible = participants.reduce((s, p) => s + p.eligibleMinor, 0);
  const pendingKyc = participants.filter((p) => p.kycStatus === 'pending').length;

  return (
    <PageBody className={PLATFORM_PAGE_CLASS}>
      <div className="space-y-6">
        <PlatformConsoleHero
          sectionLabel="Referral programme"
          title="Referral attribution & oversight"
          description="Regional manager and subordinate referral programme visibility — US-PLT-007"
          isLoading={pLoading}
          stats={[
            {
              label: 'Participants',
              value: String(participants.length),
              hint: `${pendingKyc} KYC pending`,
              icon: Users,
              gradient: SURFACES.kpi.g1,
            },
            {
              label: 'Total earned',
              value: formatKobo(totalEarned),
              hint: 'Lifetime accrual',
              icon: Coins,
              gradient: SURFACES.kpi.g2,
            },
            {
              label: 'Eligible',
              value: formatKobo(totalEligible),
              hint: 'Ready for payout',
              icon: Wallet,
              gradient: SURFACES.kpi.g3,
            },
            {
              label: 'Cycles',
              value: String(cycles.length),
              hint: 'Payout periods',
              icon: Coins,
              gradient: SURFACES.kpi.g4,
            },
          ]}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={tab === 'participants' ? PLATFORM_UI.chipActive : PLATFORM_UI.chipInactive}
            onClick={() => setTab('participants')}
          >
            Participants
          </button>
          <button
            type="button"
            className={tab === 'payouts' ? PLATFORM_UI.chipActive : PLATFORM_UI.chipInactive}
            onClick={() => setTab('payouts')}
          >
            Payout cycles
          </button>
        </div>

        {tab === 'participants' ? (
          <div className={`${PLATFORM_UI.dataPanel} overflow-hidden`}>
            <div className="border-b border-border/80 px-5 py-4">
              <p className={PLATFORM_UI.sectionLabel}>Network</p>
              <p className="mt-1 text-[14px] font-semibold text-neutral-900">
                Participants ({participants.length})
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead className={PLATFORM_UI.tableHeader}>
                  <tr>
                    {['ID', 'Type', 'Region', 'Status', 'KYC', 'Schools', 'Earned', 'Eligible'].map((h) => (
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
                  {pLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-t border-brand-50/80">
                        <td colSpan={8} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : participants.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-neutral-500">
                        No referral participants registered.
                      </td>
                    </tr>
                  ) : (
                    participants.map((p) => (
                      <tr key={p.id} className="border-t border-brand-50/80">
                        <td className="px-4 py-3 font-mono text-[11px] text-neutral-500">···{p.id.slice(-8)}</td>
                        <td className="px-4 py-3 capitalize text-neutral-700">
                          {p.participantType.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{p.region ?? '—'}</td>
                        <td className="px-4 py-3">
                          <ParticipantStatusBadge status={p.status} />
                        </td>
                        <td className="px-4 py-3">
                          <KycBadge status={p.kycStatus} />
                        </td>
                        <td className="px-4 py-3 tabular-nums text-neutral-800">{p.schoolsAttributed}</td>
                        <td className="px-4 py-3 font-mono tabular-nums text-neutral-800">
                          {formatKobo(p.totalEarnedMinor)}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums">
                          <span className={cn(p.eligibleMinor > 0 ? 'font-semibold text-accent-green-700' : 'text-neutral-600')}>
                            {formatKobo(p.eligibleMinor)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={`${PLATFORM_UI.dataPanel} overflow-hidden`}>
            <div className="border-b border-border/80 px-5 py-4">
              <p className={PLATFORM_UI.sectionLabel}>Disbursements</p>
              <p className="mt-1 text-[14px] font-semibold text-neutral-900">Payout cycles</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead className={PLATFORM_UI.tableHeader}>
                  <tr>
                    {['Period', 'Status', 'Total payout', 'Closed', 'Disbursed'].map((h) => (
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
                  {cLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-t border-brand-50/80">
                        <td colSpan={5} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : cycles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-neutral-500">
                        No payout cycles created yet.
                      </td>
                    </tr>
                  ) : (
                    cycles.map((cycle) => (
                      <tr key={cycle.id} className="border-t border-brand-50/80">
                        <td className="px-4 py-3 text-neutral-800">
                          {new Date(cycle.periodStart).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })}{' '}
                          –{' '}
                          {new Date(cycle.periodEnd).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              cycle.status === 'disbursed'
                                ? 'default'
                                : cycle.status === 'closed'
                                  ? 'secondary'
                                  : 'gold'
                            }
                          >
                            {cycle.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold tabular-nums text-neutral-900">
                          {formatKobo(cycle.totalPayoutMinor)}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-neutral-500">
                          {cycle.closedAt
                            ? formatDistanceToNow(new Date(cycle.closedAt), { addSuffix: true })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-neutral-500">
                          {cycle.disbursedAt
                            ? formatDistanceToNow(new Date(cycle.disbursedAt), { addSuffix: true })
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageBody>
  );
}
