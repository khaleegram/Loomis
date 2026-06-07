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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
  dsarPriority,
} from '@loomis/ui-web';
import { format } from 'date-fns';

import { DsarDetailSheet } from '@/components/compliance/dsar-detail-sheet';
import { PageBody, PageHeader } from '@/components/platform/platform-shell';

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

  return (
    <>
      <PageHeader
        title="DSAR Queue"
        description="Data Subject Access Requests — US-AUD-002"
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
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-md" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No DSAR requests in queue</p>
        ) : view === 'triage' ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((dsar) => (
              <button
                key={dsar.id}
                type="button"
                onClick={() => setSelectedId(dsar.id)}
                className={cn(
                  'rounded-md border p-4 text-left transition-shadow hover:shadow-md',
                  dsar.daysRemaining <= 0
                    ? 'border-danger/40 bg-danger/5'
                    : 'border-neutral-200 dark:border-forest-800',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <PriorityBadge priority={dsarPriority(dsar.daysRemaining)} />
                  <Badge variant="outline">{dsar.status}</Badge>
                </div>
                <p className="mt-2 font-medium capitalize">{dsar.requesterType}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Due {format(new Date(dsar.responseDeadlineAt), 'dd MMM yyyy')}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-300 dark:border-forest-700 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((dsar) => (
                  <TableRow
                    key={dsar.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(dsar.id)}
                  >
                    <TableCell>
                      <CountdownRing
                        progress={deadlineProgress(dsar)}
                        label={formatDeadline(dsar)}
                        urgent={dsar.daysRemaining <= 7}
                        size={40}
                      />
                    </TableCell>
                    <TableCell className="capitalize">{dsar.requesterType}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">
                      {dsar.dataCategories.join(', ')}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {format(new Date(dsar.receivedAt), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{dsar.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={dsarPriority(dsar.daysRemaining)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageBody>

      <DsarDetailSheet dsarId={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}
