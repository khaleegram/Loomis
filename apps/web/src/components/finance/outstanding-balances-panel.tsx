'use client';

import { useClassLevels, useOutstandingBalances } from '@loomis/api-client';
import type { InvoiceStatus } from '@loomis/contracts';
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
import { useState } from 'react';
import { Download } from 'lucide-react';

import {
  formatClassLevelLabel,
  formatInvoiceStatus,
  formatStudentRef,
} from '@/lib/finance/finance-labels';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

interface OutstandingBalancesPanelProps {
  tenantId: string;
  termId: string;
}

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

  const classLevelsQuery = useClassLevels(tenantId);
  const balancesQuery = useOutstandingBalances(tenantId, termId, {
    ...(classLevelId ? { classLevelId } : {}),
    ...(status ? { status } : {}),
  });

  const classLevels = classLevelsQuery.data?.levels ?? [];
  const data = balancesQuery.data;
  const rows = data?.rows ?? [];

  function exportCsv() {
    if (rows.length === 0) return;
    const header = ['studentId', 'classLevelId', 'status', 'amountChargedMinor', 'amountPaidMinor', 'balanceMinor'];
    const lines = rows.map((row) =>
      [
        row.studentId,
        row.classLevelId,
        row.status,
        row.amountChargedMinor,
        row.amountPaidMinor,
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
    anchor.download = `outstanding-balances-${termId.slice(0, 8)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
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
          onValueChange={(v) =>
            setStatus(v === 'all' ? undefined : (v as InvoiceStatus))
          }
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
          <KpiTile label="Students" value={String(data.summary.studentCount)} />
          <KpiTile label="Total charged" value={formatKobo(data.summary.totalChargedMinor)} />
          <KpiTile label="Total paid" value={formatKobo(data.summary.totalPaidMinor)} />
          <KpiTile
            label="Outstanding balance"
            value={formatKobo(data.summary.totalBalanceMinor)}
          />
        </div>
      ) : null}

      {balancesQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>Failed to load outstanding balances.</AlertDescription>
        </Alert>
      ) : null}

      <div className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-border/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className={ACADEMIC_UI.sectionLabel}>Student balances</p>
          {rows.length > 0 ? (
            <button type="button" className={ACADEMIC_UI.btnSecondarySm} onClick={exportCsv}>
              <Download aria-hidden className="mr-1.5 inline size-4" />
              Export CSV
            </button>
          ) : null}
        </div>
        <div className="p-5">
          {balancesQuery.isLoading ? <Skeleton className="h-64 w-full rounded-xl" /> : null}
          {!balancesQuery.isLoading && rows.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-neutral-500">
              No students match the selected filters.
            </p>
          ) : null}
          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead className={ACADEMIC_UI.tableHeader}>
                  <tr>
                    {['Student', 'Class', 'Status', 'Charged', 'Paid', 'Balance'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500 last:text-right"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.invoiceId} className="border-t border-brand-50/80">
                      <td className="px-4 py-3 font-mono text-[12px] text-neutral-800">
                        {formatStudentRef(row.studentId)}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{formatClassLevelLabel(row.classLevelId)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{formatInvoiceStatus(row.status)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-neutral-800">
                        {formatKobo(row.amountChargedMinor)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-neutral-800">
                        {formatKobo(row.amountPaidMinor)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-brand-700">
                        {formatKobo(row.balanceMinor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
