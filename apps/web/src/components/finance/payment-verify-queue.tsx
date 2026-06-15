'use client';

import { useVerifyOfflinePayment, usePayments } from '@loomis/api-client';
import type { PaymentResponse } from '@loomis/contracts';
import { formatKobo } from '@loomis/core';
import {
  Alert,
  AlertDescription,
  Button,
  JournalVoucherCard,
  LedgerEntryTable,
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
  Textarea,
} from '@loomis/ui-web';
import { useState } from 'react';

import { PaymentStatusChip } from '@/components/finance/payment-status-chip';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { financeErrorMessage } from '@/lib/finance/finance-errors';
import {
  buildPaymentSettlementLegs,
  formatOfflinePaymentMethod,
  formatStudentRef,
} from '@/lib/finance/finance-labels';

interface PaymentVerifyQueueProps {
  tenantId: string;
  termId: string;
  currentUserId: string | null;
}

export function PaymentVerifyQueue({ tenantId, termId, currentUserId }: PaymentVerifyQueueProps) {
  const [selected, setSelected] = useState<PaymentResponse | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showLedgerDrillDown, setShowLedgerDrillDown] = useState(false);

  const paymentsQuery = usePayments(tenantId, {
    termId,
    status: 'pending_verification',
    channel: 'offline',
  });

  const verifyMutation = useVerifyOfflinePayment(
    tenantId,
    termId,
    selected?.id ?? '00000000-0000-0000-0000-000000000000',
  );

  const payments = paymentsQuery.data?.payments ?? [];

  async function handleVerify() {
    if (!selected) return;
    setError(null);
    try {
      await verifyMutation.mutateAsync({ notes: notes.trim() || undefined });
      setSelected(null);
      setNotes('');
      verifyMutation.regenerateIdempotencyKey();
    } catch (err) {
      setError(financeErrorMessage(err));
    }
  }

  const ledgerRows =
    selected?.status === 'verified'
      ? buildPaymentSettlementLegs(selected.amountMinor).map((leg, index) => ({
          id: `${selected.id}-${index}`,
          transactionId: selected.id,
          account: leg.account,
          narration: leg.narration,
          direction: leg.direction,
          amountMinor: leg.amountMinor,
        }))
      : selected
        ? buildPaymentSettlementLegs(selected.amountMinor).map((leg, index) => ({
            id: `${selected.id}-preview-${index}`,
            transactionId: selected.id,
            account: leg.account,
            narration: leg.narration,
            direction: leg.direction,
            amountMinor: leg.amountMinor,
          }))
        : [];

  return (
    <>
      <div className={ACADEMIC_UI.dataPanel}>
        <div className="border-b border-brand-50 bg-gradient-to-r from-neutral-50 to-brand-50/30 px-4 py-4 sm:px-5">
          <p className="text-[14px] font-bold text-neutral-900">Verification queue</p>
          <p className="mt-0.5 text-[12px] text-neutral-500">
            Offline payments awaiting accountant sign-off. You cannot verify payments you logged.
          </p>
        </div>
        <div className="overflow-x-auto p-0">
          {paymentsQuery.isLoading ? (
            <div className="p-5">
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : null}
          {paymentsQuery.isError ? (
            <div className="p-5">
              <Alert variant="destructive">
                <AlertDescription>Failed to load payments.</AlertDescription>
              </Alert>
            </div>
          ) : null}

          {!paymentsQuery.isLoading && payments.length === 0 ? (
            <div className="py-16 text-center">
              <PaymentStatusChip status="verified" className="mb-3" />
              <p className="text-[13px] text-neutral-500">No payments pending verification.</p>
            </div>
          ) : null}

          {payments.length > 0 ? (
            <Table>
              <TableHeader className={ACADEMIC_UI.tableHeader}>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => {
                  const loggedBySelf = currentUserId !== null && payment.loggedById === currentUserId;
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">
                        {formatStudentRef(payment.studentId)}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {formatKobo(payment.amountMinor)}
                      </TableCell>
                      <TableCell>{formatOfflinePaymentMethod(payment.method as 'cash')}</TableCell>
                      <TableCell>{payment.paymentDate}</TableCell>
                      <TableCell>
                        {loggedBySelf ? (
                          <PaymentStatusChip status="pending_verification" />
                        ) : (
                          <PaymentStatusChip status={payment.status} />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelected(payment)}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : null}
        </div>
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Verify payment</SheetTitle>
            <SheetDescription>
              Confirm against bank records before marking settled.
            </SheetDescription>
          </SheetHeader>

          {selected ? (
            <div className="mt-6 space-y-4">
              <div className="space-y-1 text-sm">
                <p>
                  Student <span className="font-mono">{formatStudentRef(selected.studentId)}</span>
                </p>
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {formatKobo(selected.amountMinor)}
                </p>
                <p className="text-muted-foreground">
                  {formatOfflinePaymentMethod(selected.method as 'cash')} · {selected.paymentDate}
                </p>
                {selected.channelReference ? (
                  <p className="text-muted-foreground">Ref: {selected.channelReference}</p>
                ) : null}
              </div>

              <JournalVoucherCard
                voucherLabel="Settlement voucher"
                date={selected.paymentDate}
                legs={buildPaymentSettlementLegs(selected.amountMinor)}
              />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowLedgerDrillDown((v) => !v)}
              >
                {showLedgerDrillDown ? 'Hide ledger drill-down' : 'Show ledger drill-down'}
              </Button>
              {showLedgerDrillDown ? <LedgerEntryTable entries={ledgerRows} /> : null}

              {currentUserId && selected.loggedById === currentUserId ? (
                <Alert variant="warning">
                  <AlertDescription>
                    You logged this payment. Segregation of duties requires another accountant to
                    verify it.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Textarea
                    placeholder="Verification notes (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                  {error ? (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : null}
                  <Button
                    onClick={() => void handleVerify()}
                    disabled={verifyMutation.isSubmitting}
                    className={`${ACADEMIC_UI.btnPrimary} w-full`}
                  >
                    {verifyMutation.isSubmitting ? 'Verifying…' : 'Verify payment'}
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
