'use client';

import { useClassLevels, useOutstandingBalances } from '@loomis/api-client';
import type { InvoiceStatus } from '@loomis/contracts';
import { formatKobo } from '@loomis/core';
import {
  Alert,
  AlertDescription,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@loomis/ui-web';
import { useState } from 'react';

import {
  formatClassLevelLabel,
  formatInvoiceStatus,
  formatStudentRef,
} from '@/lib/finance/finance-labels';

interface OutstandingBalancesPanelProps {
  tenantId: string;
  termId: string;
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-xl font-semibold tabular-nums text-foreground">{value}</p>
      </CardContent>
    </Card>
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

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Student balances</CardTitle>
        </CardHeader>
        <CardContent>
          {balancesQuery.isLoading ? <Skeleton className="h-64 w-full" /> : null}
          {!balancesQuery.isLoading && rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No students match the selected filters.
            </p>
          ) : null}
          {rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Charged</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.invoiceId}>
                    <TableCell className="font-mono text-sm">
                      {formatStudentRef(row.studentId)}
                    </TableCell>
                    <TableCell>{formatClassLevelLabel(row.classLevelId)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatInvoiceStatus(row.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatKobo(row.amountChargedMinor)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatKobo(row.amountPaidMinor)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold tabular-nums text-gold-600 dark:text-gold-400">
                      {formatKobo(row.balanceMinor)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
