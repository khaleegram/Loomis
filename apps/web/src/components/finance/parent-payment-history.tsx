'use client';

import type { PaymentResponse } from '@loomis/contracts';
import { formatKobo } from '@loomis/core';
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
} from '@loomis/ui-web';
import { History } from 'lucide-react';
import { useState } from 'react';

import { PaymentReceiptPanel } from '@/components/finance/payment-receipt-panel';
import { PaymentStatusChip } from '@/components/finance/payment-status-chip';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatPaymentChannel, formatPaymentMethod } from '@/lib/finance/finance-labels';

interface ParentPaymentHistoryProps {
  payments: PaymentResponse[];
  isLoading?: boolean;
}

export function ParentPaymentHistory({ payments, isLoading }: ParentPaymentHistoryProps) {
  const [selected, setSelected] = useState<PaymentResponse | null>(null);

  return (
    <>
      <div className={ACADEMIC_UI.dataPanel}>
        <div className="border-b border-border bg-gradient-to-r from-neutral-50 to-brand-50/30 px-4 py-4 sm:px-5">
          <p className="flex items-center gap-2 text-[14px] font-bold text-neutral-900">
            <History className="size-4 text-brand-600" aria-hidden />
            Payment history
          </p>
          <p className="mt-0.5 text-[12px] text-neutral-500">
            School-logged and online payments for this term.
          </p>
        </div>

        {isLoading ? (
          <div className="p-5">
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-neutral-500">No payments recorded yet.</div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
              >
                <div>
                  <p className="font-mono text-[14px] font-semibold tabular-nums text-neutral-900">
                    {formatKobo(payment.amountMinor)}
                  </p>
                  <p className="text-[12px] text-neutral-500">
                    {payment.paymentDate} · {formatPaymentChannel(payment.channel)} ·{' '}
                    {formatPaymentMethod(payment.channel, payment.method)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PaymentStatusChip status={payment.status} />
                  <Button variant="outline" size="sm" onClick={() => setSelected(payment)}>
                    Receipt
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Payment receipt</SheetTitle>
            <SheetDescription>Official receipt for this fee payment.</SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="mt-6">
              <PaymentReceiptPanel payment={selected} />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
