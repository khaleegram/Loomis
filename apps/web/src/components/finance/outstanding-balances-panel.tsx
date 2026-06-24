'use client';

import {
  useBulkFeeReminder,
  useClassLevels,
  useOutstandingBalances,
  useSendFeeReminder,
} from '@loomis/api-client';
import type { InvoiceStatus, OutstandingBalanceScope } from '@loomis/contracts';
import { formatKobo } from '@loomis/core';
import {
  Alert,
  AlertDescription,
  Badge,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@loomis/ui-web';
import { Bell, Download } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  formatClassLevelLabel,
  formatInvoiceStatus,
  formatStudentRef,
} from '@/lib/finance/finance-labels';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { cn } from '@loomis/ui-web';

interface OutstandingBalancesPanelProps {
  tenantId: string;
  termId: string;
}

const SCOPE_OPTIONS: { value: OutstandingBalanceScope; label: string; hint: string }[] = [
  { value: 'term', label: 'This term', hint: 'Balances for the selected term only' },
  { value: 'arrears', label: 'Arrears', hint: 'Families still owing from earlier terms' },
  { value: 'all', label: 'All owed', hint: 'This term plus any arrears' },
];

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${ACADEMIC_UI.dataPanel} p-4`}>
      <p className={ACADEMIC_UI.sectionLabel}>{label}</p>
      <p className="mt-2 font-mono text-xl font-extrabold tabular-nums text-neutral-900">{value}</p>
    </div>
  );
}

export function OutstandingBalancesPanel({ tenantId, termId }: OutstandingBalancesPanelProps) {
  const [classLevelId, setClassLevelId] = useState<string | undefined>();
  const [status, setStatus] = useState<InvoiceStatus | undefined>();
  const [scope, setScope] = useState<OutstandingBalanceScope>('term');
  const [remindError, setRemindError] = useState<string | null>(null);
  const [remindSuccess, setRemindSuccess] = useState<string | null>(null);

  const classLevelsQuery = useClassLevels(tenantId);
  const balancesQuery = useOutstandingBalances(tenantId, termId, {
    ...(classLevelId ? { classLevelId } : {}),
    ...(status ? { status } : {}),
    scope,
  });
  const sendReminder = useSendFeeReminder(tenantId, termId);
  const bulkReminder = useBulkFeeReminder(tenantId, termId);

  const classLevels = classLevelsQuery.data?.levels ?? [];
  const data = balancesQuery.data;
  const rows = data?.rows ?? [];

  const owingStudentIds = useMemo(
    () => rows.filter((row) => row.balanceMinor > 0).map((row) => row.studentId),
    [rows],
  );

  function exportCsv() {
    if (rows.length === 0) return;
    const header = [
      'studentId',
      'classLevelId',
      'status',
      'termBalanceMinor',
      'arrearsBalanceMinor',
      'balanceMinor',
    ];
    const lines = rows.map((row) =>
      [
        row.studentId,
        row.classLevelId,
        row.status ?? '',
        row.termBalanceMinor ?? row.balanceMinor,
        row.arrearsBalanceMinor ?? 0,
        row.balanceMinor,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `outstanding-balances-${scope}-${termId.slice(0, 8)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleRemindOne(studentId: string) {
    setRemindError(null);
    setRemindSuccess(null);
    try {
      const result = await sendReminder.mutateAsync(studentId);
      setRemindSuccess(
        result.remindedParentCount > 0
          ? 'Reminder sent to linked parent(s).'
          : 'No linked parents found for this student.',
      );
    } catch {
      setRemindError('Could not send reminder. Try again.');
    }
  }

  async function handleRemindFiltered() {
    if (owingStudentIds.length === 0) return;
    setRemindError(null);
    setRemindSuccess(null);
    try {
      const result = await bulkReminder.mutateAsync({ studentIds: owingStudentIds });
      setRemindSuccess(
        `Reminders sent for ${result.remindedStudentCount} student${result.remindedStudentCount === 1 ? '' : 's'}.`,
      );
    } catch {
      setRemindError('Could not send bulk reminders. Try again.');
    }
  }

  const showArrearsColumn = scope === 'all' || scope === 'arrears';
  const showTermColumn = scope === 'all';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {SCOPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setScope(option.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors',
              scope === option.value
                ? 'border-brand-300 bg-brand-50 text-brand-900'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-brand-200',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="text-[12px] text-neutral-500">{SCOPE_OPTIONS.find((o) => o.value === scope)?.hint}</p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Select
          value={classLevelId ?? 'all'}
          onValueChange={(v) => setClassLevelId(v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Class level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All class levels</SelectItem>
            {classLevels.map((level) => (
              <SelectItem key={level.id} value={level.id}>
                {level.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status ?? 'all'}
          onValueChange={(v) => setStatus(v === 'all' ? undefined : (v as InvoiceStatus))}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="issued">Issued (unpaid)</SelectItem>
            <SelectItem value="partially_paid">Partially paid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {balancesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile label="Families" value={String(data.summary.studentCount)} />
          <KpiTile label="Total charged" value={formatKobo(data.summary.totalChargedMinor)} />
          <KpiTile label="Total paid" value={formatKobo(data.summary.totalPaidMinor)} />
          <KpiTile label="Outstanding" value={formatKobo(data.summary.totalBalanceMinor)} />
        </div>
      ) : null}

      {remindError ? (
        <Alert variant="destructive">
          <AlertDescription>{remindError}</AlertDescription>
        </Alert>
      ) : null}
      {remindSuccess ? (
        <Alert>
          <AlertDescription>{remindSuccess}</AlertDescription>
        </Alert>
      ) : null}

      {balancesQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>Failed to load outstanding balances.</AlertDescription>
        </Alert>
      ) : null}

      <div className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-border/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className={ACADEMIC_UI.sectionLabel}>Who owes</p>
          <div className="flex flex-wrap gap-2">
            {owingStudentIds.length > 0 ? (
              <button
                type="button"
                className={ACADEMIC_UI.btnPrimary}
                disabled={bulkReminder.isPending}
                onClick={() => void handleRemindFiltered()}
              >
                <Bell aria-hidden className="mr-1.5 inline size-4" />
                Remind all ({owingStudentIds.length})
              </button>
            ) : null}
            {rows.length > 0 ? (
              <button type="button" className={ACADEMIC_UI.btnSecondarySm} onClick={exportCsv}>
                <Download aria-hidden className="mr-1.5 inline size-4" />
                Export CSV
              </button>
            ) : null}
          </div>
        </div>
        <div className="p-5">
          {balancesQuery.isLoading ? <Skeleton className="h-64 w-full rounded-xl" /> : null}
          {!balancesQuery.isLoading && rows.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-neutral-500">
              No families match this view. Try another scope or filter.
            </p>
          ) : null}
          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead className={ACADEMIC_UI.tableHeader}>
                  <tr>
                    {[
                      'Student',
                      'Class',
                      ...(showTermColumn ? ['This term'] : []),
                      ...(showArrearsColumn ? ['Arrears'] : []),
                      'Owed',
                      'Status',
                      '',
                    ].map((h) => (
                      <th
                        key={h || 'actions'}
                        className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500 last:text-right"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.studentId}-${row.invoiceId ?? 'agg'}`} className="border-t border-brand-50/80">
                      <td className="px-4 py-3 font-mono text-[12px] text-neutral-800">
                        {formatStudentRef(row.studentId)}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">
                        {formatClassLevelLabel(row.classLevelId)}
                      </td>
                      {showTermColumn ? (
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-neutral-800">
                          {formatKobo(row.termBalanceMinor ?? 0)}
                        </td>
                      ) : null}
                      {showArrearsColumn ? (
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-amber-800">
                          {formatKobo(row.arrearsBalanceMinor ?? (scope === 'arrears' ? row.balanceMinor : 0))}
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-brand-700">
                        {formatKobo(row.balanceMinor)}
                      </td>
                      <td className="px-4 py-3">
                        {row.status ? (
                          <Badge variant="outline">{formatInvoiceStatus(row.status)}</Badge>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.balanceMinor > 0 ? (
                          <button
                            type="button"
                            className={ACADEMIC_UI.btnSecondarySm}
                            disabled={sendReminder.isPending}
                            onClick={() => void handleRemindOne(row.studentId)}
                          >
                            Remind
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      <p className="text-[12px] text-neutral-500">
        Reminders go to linked parents by push, email, and SMS when overdue. Automatic reminders also
        run on a standard schedule (4 weeks after term start, before due date, and when overdue).
      </p>
    </div>
  );
}
