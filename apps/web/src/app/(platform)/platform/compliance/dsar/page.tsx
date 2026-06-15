'use client';

import { useState } from 'react';
import type { DsarResponse } from '@loomis/contracts';
import { useDsars } from '@loomis/api-client';
import {
  Badge,
  CountdownRing,
  PriorityBadge,
  SegmentedControl,
  Skeleton,
  cn,
  dsarPriority,
} from '@loomis/ui-web';
import { format } from 'date-fns';

import { DsarDetailSheet } from '@/components/compliance/dsar-detail-sheet';
import { PlatformConsoleHero } from '@/components/platform/platform-console-hero';
import { PageBody } from '@/components/platform/platform-shell';
import { PLATFORM_PAGE_CLASS, PLATFORM_UI } from '@/lib/platform/platform-ui';
import { SURFACES } from '@/lib/design/surfaces';
import { AlertTriangle, ClipboardList, Clock } from 'lucide-react';

type QueueView = 'ledger' | 'triage';

function formatDeadline(dsar: DsarResponse): string {
  if (dsar.daysRemaining <= 0) return 'Overdue';
  if (dsar.daysRemaining === 1) return '1d';
  return `${dsar.daysRemaining}d`;
}

function deadlineProgress(dsar: DsarResponse): number {
  const total = 30;
  return Math.max(0, Math.min(100, (dsar.daysRemaining / total) * 100));
}

export default function DsarQueuePage() {
  const [view, setView] = useState<QueueView>('ledger');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: dsars, isLoading } = useDsars();

  const sorted = [...(dsars ?? [])].sort((a, b) => {
    if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining;
    return new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
  });

  const overdue = sorted.filter((d) => d.daysRemaining <= 0).length;
  const urgent = sorted.filter((d) => d.daysRemaining > 0 && d.daysRemaining <= 7).length;

  return (
    <PageBody className={PLATFORM_PAGE_CLASS}>
      <div className="space-y-6">
        <PlatformConsoleHero
          sectionLabel="Compliance · NDPA"
          title="DSAR queue"
          description="Data Subject Access Requests — US-AUD-002. 30-day statutory response window."
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
              label: 'Active',
              value: String(sorted.length),
              hint: 'In queue',
              icon: ClipboardList,
              gradient: SURFACES.kpi.g1,
            },
            {
              label: 'Overdue',
              value: String(overdue),
              hint: 'Past deadline',
              icon: AlertTriangle,
              gradient: overdue > 0 ? SURFACES.kpi.g4 : SURFACES.kpi.g3,
            },
            {
              label: 'Urgent',
              value: String(urgent),
              hint: '≤ 7 days left',
              icon: Clock,
              gradient: SURFACES.kpi.g4,
            },
            {
              label: 'Window',
              value: '30d',
              hint: 'NDPA response SLA',
              icon: Clock,
              gradient: SURFACES.kpi.g2,
            },
          ]}
        />

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className={`${PLATFORM_UI.dataPanel} py-16 text-center text-[13px] text-neutral-500`}>
            No DSAR requests in queue
          </div>
        ) : view === 'triage' ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((dsar) => (
              <button
                key={dsar.id}
                type="button"
                onClick={() => setSelectedId(dsar.id)}
                className={cn(
                  `${PLATFORM_UI.dataPanel} p-4 text-left transition-shadow hover:shadow-md`,
                  dsar.daysRemaining <= 0 ? 'ring-1 ring-destructive/30' : '',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <PriorityBadge priority={dsarPriority(dsar.daysRemaining)} />
                  <Badge variant="outline">{dsar.status}</Badge>
                </div>
                <p className="mt-2 font-semibold capitalize text-neutral-900">{dsar.requesterType}</p>
                <p className="mt-1 text-[12px] text-neutral-500">
                  Due {format(new Date(dsar.responseDeadlineAt), 'dd MMM yyyy')}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className={`${PLATFORM_UI.dataPanel} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead className={PLATFORM_UI.tableHeader}>
                  <tr>
                    {['Deadline', 'Requester', 'Categories', 'Received', 'Status', 'Priority'].map((h) => (
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
                  {sorted.map((dsar) => (
                    <tr
                      key={dsar.id}
                      className="cursor-pointer border-t border-brand-50/80 hover:bg-brand-50/20"
                      onClick={() => setSelectedId(dsar.id)}
                    >
                      <td className="px-4 py-3">
                        <CountdownRing
                          progress={deadlineProgress(dsar)}
                          label={formatDeadline(dsar)}
                          urgent={dsar.daysRemaining <= 7}
                          size={40}
                        />
                      </td>
                      <td className="px-4 py-3 capitalize text-neutral-800">{dsar.requesterType}</td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-[12px] text-neutral-600">
                        {dsar.dataCategories.join(', ')}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-neutral-700">
                        {format(new Date(dsar.receivedAt), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{dsar.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={dsarPriority(dsar.daysRemaining)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <DsarDetailSheet dsarId={selectedId} onClose={() => setSelectedId(null)} />
    </PageBody>
  );
}
