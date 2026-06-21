'use client';

import { useMemo, useState } from 'react';
import { useTenantAuditLogSearch } from '@loomis/api-client';
import type { AuditLogEntryResponse } from '@loomis/contracts';
import { Input, Skeleton, cn } from '@loomis/ui-web';
import { FileSearch, Search } from 'lucide-react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import type { AuditLogFilters } from '@loomis/api-client';

const CORE_RETENTION_DAYS = 90;

function defaultFromIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - CORE_RETENTION_DAYS);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function resultTone(result: AuditLogEntryResponse['result']): string {
  if (result === 'success') return 'text-emerald-700 bg-emerald-50';
  if (result === 'denied') return 'text-amber-800 bg-amber-50';
  return 'text-red-700 bg-red-50';
}

interface SchoolAuditLogProps {
  tenantId: string;
}

export function SchoolAuditLog({ tenantId }: SchoolAuditLogProps) {
  const [actionQuery, setActionQuery] = useState('');
  const [fromDate, setFromDate] = useState(() => defaultFromIso().slice(0, 10));
  const [toDate, setToDate] = useState('');
  const [applied, setApplied] = useState<AuditLogFilters>(() => ({
    from: defaultFromIso(),
    limit: 50,
  }));

  const filters = useMemo(
    (): Omit<AuditLogFilters, 'tenantId'> => ({
      ...applied,
      action: applied.action || undefined,
      from: applied.from,
      to: applied.to,
      limit: 50,
    }),
    [applied],
  );

  const { data, isLoading, isError, error } = useTenantAuditLogSearch(tenantId, filters);
  const entries = data?.entries ?? [];

  function applyFilters() {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : defaultFromIso();
    const to = toDate ? new Date(`${toDate}T23:59:59`).toISOString() : undefined;
    setApplied({
      action: actionQuery.trim() || undefined,
      from,
      to,
      limit: 50,
      cursor: undefined,
    });
  }

  function clearFilters() {
    setActionQuery('');
    setFromDate(defaultFromIso().slice(0, 10));
    setToDate('');
    setApplied({ from: defaultFromIso(), limit: 50 });
  }

  return (
    <div className="space-y-4">
      <div className={`${ACADEMIC_UI.dataPanel} space-y-4 p-4 sm:p-5`}>
        <p className="text-[13px] text-neutral-600">
          Read-only trail for dispute resolution — last {CORE_RETENTION_DAYS} days on Core. No export
          on Core tier.
        </p>

        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="relative min-w-[200px] flex-1 lg:max-w-xs">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
            />
            <Input
              value={actionQuery}
              onChange={(e) => setActionQuery(e.target.value)}
              placeholder="Filter by action (e.g. payment.verified)"
              aria-label="Filter by action type"
              className={cn(ACADEMIC_UI.searchField, 'pl-10')}
            />
          </div>
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            From
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 rounded-lg bg-muted/45 px-3 text-[13px] text-neutral-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            To
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 rounded-lg bg-muted/45 px-3 text-[13px] text-neutral-800"
            />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={applyFilters} className={ACADEMIC_UI.btnPrimarySm}>
              Apply
            </button>
            <button type="button" onClick={clearFilters} className={ACADEMIC_UI.btnSecondarySm}>
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className={ACADEMIC_UI.dataPanel}>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <p className="p-5 text-[13px] text-destructive" role="alert">
            {(error as Error).message ?? 'Failed to load audit log.'}
          </p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <FileSearch aria-hidden className="size-10 text-neutral-300" />
            <p className="text-[13px] font-medium text-neutral-600">No audit events match your filters</p>
            <p className="text-[12px] text-neutral-400">Try widening the date range or clearing the action filter.</p>
          </div>
        ) : (
          <>
            <div
              className={cn(
                'hidden min-w-0 grid-cols-[1fr_1.2fr_1fr_auto_auto] gap-3 px-5 py-3 sm:grid',
                ACADEMIC_UI.tableHeader,
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-800/70">
                When
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-800/70">
                Action
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-800/70">
                Resource
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-800/70">
                Result
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-800/70">
                Actor
              </span>
            </div>
            <ul className="divide-y divide-brand-50/80">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="grid gap-2 px-4 py-3.5 sm:grid-cols-[1fr_1.2fr_1fr_auto_auto] sm:items-center sm:gap-3 sm:px-5"
                >
                  <span className="text-[12px] tabular-nums text-neutral-600">
                    {formatWhen(entry.createdAt)}
                  </span>
                  <span className="font-mono text-[12px] font-medium text-neutral-900">
                    {entry.action}
                  </span>
                  <span className="truncate text-[12px] text-neutral-500">
                    {entry.resourceType}
                    {entry.resourceId ? (
                      <span className="ml-1 font-mono text-[10px] text-neutral-400">
                        {entry.resourceId.slice(0, 8)}…
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      'inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                      resultTone(entry.result),
                    )}
                  >
                    {entry.result}
                  </span>
                  <span className="font-mono text-[10px] text-neutral-400">
                    {entry.actorUserId ? `${entry.actorUserId.slice(0, 8)}…` : entry.actorType}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
