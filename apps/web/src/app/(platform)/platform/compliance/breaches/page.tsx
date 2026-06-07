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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  breachPriority,
  cn,
} from '@loomis/ui-web';
import { format } from 'date-fns';

import { BreachDetailSheet } from '@/components/compliance/breach-detail-sheet';
import { PageBody, PageHeader } from '@/components/platform/platform-shell';

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

  return (
    <>
      <PageHeader
        title="Breach Records"
        description="NDPC notification workflow — US-AUD-003"
        actions={
          <SegmentedControl
            value={view}
            onValueChange={(v) => setView(v as QueueView)}
            options={[
              { value: 'ledger', label: 'Regulatory Ledger' },
              { value: 'triage', label: 'Triage Board' },
            ]}
          />
        }
      />
      <PageBody>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-md" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No breach records</p>
        ) : view === 'triage' ? (
          <div className="space-y-2">
            {sorted.map((breach) => (
              <button
                key={breach.id}
                type="button"
                onClick={() => setSelectedId(breach.id)}
                className={cn(
                  'flex w-full items-center gap-4 rounded-md border px-4 py-3 text-left',
                  breach.ndpcHoursRemaining != null && breach.ndpcHoursRemaining <= 24
                    ? 'border-danger/40 bg-danger/5'
                    : 'border-neutral-200 dark:border-forest-800',
                )}
              >
                <PriorityBadge priority={breachPriority(breach.ndpcHoursRemaining)} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{breach.breachType}</p>
                  <p className="text-xs text-muted-foreground">
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
          <div className="overflow-hidden rounded-lg border border-neutral-300 dark:border-forest-700 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NDPC Clock</TableHead>
                  <TableHead>Discovery</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((breach) => (
                  <TableRow
                    key={breach.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(breach.id)}
                  >
                    <TableCell>
                      {breach.ndpcNotificationRequired && breach.ndpcHoursRemaining != null ? (
                        <CountdownRing
                          progress={ndpcProgress(breach)}
                          label={ndpcLabel(breach)}
                          urgent={breach.ndpcHoursRemaining <= 24}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {format(new Date(breach.discoveredAt), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{breach.breachType}</TableCell>
                    <TableCell className="text-xs">
                      {breach.affectedDataCategories.slice(0, 2).join(', ')}
                      {breach.affectedDataCategories.length > 2 ? '…' : ''}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{breach.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageBody>

      <BreachDetailSheet breachId={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}
