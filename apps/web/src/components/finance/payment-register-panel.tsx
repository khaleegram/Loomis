'use client';

import { usePayments } from '@loomis/api-client';
import type { PaymentChannel, PaymentResponse, PaymentStatus } from '@loomis/contracts';
import { formatKobo } from '@loomis/core';
import {
  Alert,
  AlertDescription,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@loomis/ui-web';
import { useMemo, useState } from 'react';

import { PaymentReceiptPanel } from '@/components/finance/payment-receipt-panel';
import { PaymentStatusChip } from '@/components/finance/payment-status-chip';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import {
  formatPaymentChannel,
  formatPaymentMethod,
  formatStudentRef,
} from '@/lib/finance/finance-labels';

interface PaymentRegisterPanelProps {
  tenantId: string;
  termId: string;
}

export function PaymentRegisterPanel({ tenantId, termId }: PaymentRegisterPanelProps) {
  const [channel, setChannel] = useState<PaymentChannel | 'all'>('all');
  const [status, setStatus] = useState<PaymentStatus | 'all'>('all');
  const [selected, setSelected] = useState<PaymentResponse | null>(null);

  const paymentsQuery = usePayments(tenantId, {
    termId,
    ...(channel !== 'all' ? { channel } : {}),
    ...(status !== 'all' ? { status } : {}),
  });

  const payments = paymentsQuery.data?.payments ?? [];

  const metrics = useMemo(() => {
    let verifiedCount = 0;
    let pendingCount = 0;
    let totalAmountMinor = 0;
    for (const payment of payments) {
      totalAmountMinor += payment.amountMinor;
      if (payment.status === 'verified') verifiedCount += 1;
      if (payment.status === 'pending' || payment.status === 'pending_verification') {
        pendingCount += 1;
      }
    }
    return {
      totalCount: payments.length,
      verifiedCount,
      pendingCount,
      totalAmountMinor,
    };
  }, [payments]);

  return (
    <>
      <div className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className={ACADEMIC_UI.sectionLabel}>Register</p>
            <p className="text-[14px] font-bold text-neutral-900">
              {metrics.totalCount} payment{metrics.totalCount === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={channel}
              onValueChange={(value) => setChannel(value as PaymentChannel | 'all')}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as PaymentStatus | 'all')}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending_verification">Pending verification</SelectItem>
                <SelectItem value="pending">Pending (online)</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {paymentsQuery.isLoading ? (
          <div className="p-5">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : paymentsQuery.isError ? (
          <div className="p-5">
            <Alert variant="destructive">
              <AlertDescription>Failed to load payments.</AlertDescription>
            </Alert>
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-neutral-500">
            No payments match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className={ACADEMIC_UI.tableHeader}>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">
                      {formatStudentRef(payment.studentId)}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {formatKobo(payment.amountMinor)}
                    </TableCell>
                    <TableCell>{formatPaymentChannel(payment.channel)}</TableCell>
                    <TableCell>{formatPaymentMethod(payment.channel, payment.method)}</TableCell>
                    <TableCell>{payment.paymentDate}</TableCell>
                    <TableCell>
                      <PaymentStatusChip status={payment.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelected(payment)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Payment detail</SheetTitle>
            <SheetDescription>Receipt and settlement status.</SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="mt-6 space-y-4">
              <PaymentStatusChip status={selected.status} />
              <PaymentReceiptPanel payment={selected} />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
