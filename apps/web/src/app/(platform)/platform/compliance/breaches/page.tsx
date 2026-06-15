'use client';

import { useState } from 'react';
import type { BreachRecordResponse } from '@loomis/contracts';
import { useBreaches } from '@loomis/api-client';
import {
  Badge,
  CountdownRing,
  PriorityBadge,
  SegmentedControl,
  Skeleton,
  breachPriority,
  cn,
} from '@loomis/ui-web';
import { format } from 'date-fns';

import { BreachDetailSheet } from '@/components/compliance/breach-detail-sheet';
import { PlatformConsoleHero } from '@/components/platform/platform-console-hero';
import { PageBody } from '@/components/platform/platform-shell';
import { PLATFORM_PAGE_CLASS, PLATFORM_UI } from '@/lib/platform/platform-ui';
import { SURFACES } from '@/lib/design/surfaces';
import { AlertTriangle, Clock, Shield } from 'lucide-react';

type QueueView = 'ledger' | 'triage';

function ndpcLabel(breach: BreachRecordResponse): string {
  if (breach.ndpcHoursRemaining == null) return '—';
  if (breach.ndpcHoursRemaining <= 0) return '0h';
  if (breach.ndpcHoursRemaining < 24) return `${Math.round(breach.ndpcHoursRemaining)}h`;
  return `${Math.round(breach.ndpcHoursRemaining / 24)}d`;
}

function ndpcProgress(breach: BreachRecordResponse): number {
  if (breach.ndpcHoursRemaining == null) return 100;
  return Math.max(0, Math.min(100, (breach.ndpcHoursRemaining / 72) * 100));
}

export default function BreachQueuePage() {
  const [view, setView] = useState<QueueView>('ledger');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: breaches, isLoading } = useBreaches();

  const sorted = [...(breaches ?? [])].sort((a, b) => {
    const ah = a.ndpcHoursRemaining ?? 9999;
    const bh = b.ndpcHoursRemaining ?? 9999;
    return ah - bh;
  });

  const ndpcUrgent = sorted.filter(
    (b) => b.ndpcNotificationRequired && b.ndpcHoursRemaining != null && b.ndpcHoursRemaining <= 24,
  ).length;

  return (
    <PageBody className={PLATFORM_PAGE_CLASS}>
      <div className="space-y-6">
        <PlatformConsoleHero
          sectionLabel="Compliance · NDPA"
          title="Breach records"
          description="NDPC notification workflow — US-AUD-003. 72-hour notification clock."
          isLoading={isLoading}
          actions={
            <SegmentedControl
              value={view}
              onValueChange={(v) => setView(v as QueueView)}
              options={[
                { value: 'ledger', label: 'Regulatory ledger' },
                { value: 'triage', label: 'Triage board' },
              ]}
            />
          }
          stats={[
            {
              label: 'Records',
              value: String(sorted.length),
              hint: 'Total breaches',
              icon: Shield,
              gradient: SURFACES.kpi.g1,
            },
            {
              label: 'NDPC urgent',
              value: String(ndpcUrgent),
              hint: '≤ 24h on clock',
              icon: AlertTriangle,
              gradient: ndpcUrgent > 0 ? SURFACES.kpi.g4 : SURFACES.kpi.g3,
            },
            {
              label: 'Open',
              value: String(sorted.filter((b) => b.status !== 'closed').length),
              hint: 'Active cases',
              icon: Clock,
              gradient: SURFACES.kpi.g2,
            },
            {
              label: 'Clock',
              value: '72h',
              hint: 'NDPC notification SLA',
              icon: Clock,
              gradient: SURFACES.kpi.g4,
            },
          ]}
        />

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className={`${PLATFORM_UI.dataPanel} py-16 text-center text-[13px] text-neutral-500`}>
            No breach records
          </div>
        ) : view === 'triage' ? (
          <div className="space-y-2">
            {sorted.map((breach) => (
              <button
                key={breach.id}
                type="button"
                onClick={() => setSelectedId(breach.id)}
                className={cn(
                  `${PLATFORM_UI.dataPanel} flex w-full items-center gap-4 px-4 py-3 text-left transition-shadow hover:shadow-md`,
                  breach.ndpcHoursRemaining != null && breach.ndpcHoursRemaining <= 24
                    ? 'ring-1 ring-destructive/30'
                    : '',
                )}
              >
                <PriorityBadge priority={breachPriority(breach.ndpcHoursRemaining)} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-neutral-900">{breach.breachType}</p>
                  <p className="text-[12px] text-neutral-500">
                    {breach.estimatedSubjectCount.toLocaleString()} subjects · {breach.status}
                  </p>
                </div>
                {breach.ndpcNotificationRequired ? (
                  <CountdownRing
                    progress={ndpcProgress(breach)}
                    label={ndpcLabel(breach)}
                    urgent={(breach.ndpcHoursRemaining ?? 99) <= 24}
                  />
                ) : null}
              </button>
            ))}
          </div>
        ) : (
          <div className={`${PLATFORM_UI.dataPanel} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead className={PLATFORM_UI.tableHeader}>
                  <tr>
                    {['NDPC clock', 'Discovery', 'Type', 'Scope', 'Status'].map((h) => (
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
                  {sorted.map((breach) => (
                    <tr
                      key={breach.id}
                      className="cursor-pointer border-t border-brand-50/80 hover:bg-brand-50/20"
                      onClick={() => setSelectedId(breach.id)}
                    >
                      <td className="px-4 py-3">
                        {breach.ndpcNotificationRequired && breach.ndpcHoursRemaining != null ? (
                          <CountdownRing
                            progress={ndpcProgress(breach)}
                            label={ndpcLabel(breach)}
                            urgent={breach.ndpcHoursRemaining <= 24}
                          />
                        ) : (
                          <span className="text-[12px] text-neutral-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-neutral-700">
                        {format(new Date(breach.discoveredAt), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3 text-neutral-800">{breach.breachType}</td>
                      <td className="px-4 py-3 text-[12px] text-neutral-600">
                        {breach.affectedDataCategories.slice(0, 2).join(', ')}
                        {breach.affectedDataCategories.length > 2 ? '…' : ''}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{breach.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <BreachDetailSheet breachId={selectedId} onClose={() => setSelectedId(null)} />
    </PageBody>
  );
}
