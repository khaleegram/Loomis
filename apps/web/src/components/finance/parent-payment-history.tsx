'use client';

import type { PaymentResponse } from '@loomis/contracts';
import { formatKobo } from '@loomis/core';
import { Button, Skeleton } from '@loomis/ui-web';
import { History } from 'lucide-react';
import { useState } from 'react';

import { ParentPaymentReceiptSheet } from '@/components/finance/parent-payment-receipt-sheet';
import { PaymentStatusChip } from '@/components/finance/payment-status-chip';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatPaymentChannel, formatPaymentMethod } from '@/lib/finance/finance-labels';

interface ParentPaymentHistoryProps {
  tenantId: string;
  payments: PaymentResponse[];
  isLoading?: boolean;
}

export function ParentPaymentHistory({ tenantId, payments, isLoading }: ParentPaymentHistoryProps) {
  const [selected, setSelected] = useState<PaymentResponse | null>(null);

  return (
    <>
      <section className="space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Activity</p>
          <h2 className="mt-1 flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-neutral-900">
            <History className="size-4 text-brand-600" aria-hidden />
            Payment history
          </h2>
        </div>

        <div className={ACADEMIC_UI.dataPanel}>
          {isLoading ? (
            <div className="p-5">
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : payments.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-[14px] font-semibold text-neutral-800">No payments yet</p>
              <p className="mt-1 text-[13px] text-neutral-500">
                Transfers and online payments for this term will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100/80">
              {payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="hidden h-10 w-1 shrink-0 rounded-full bg-brand-400/80 sm:block" aria-hidden />
                    <div>
                      <p className="font-mono text-[15px] font-bold tabular-nums text-neutral-900">
                        {formatKobo(payment.amountMinor)}
                      </p>
                      <p className="mt-0.5 text-[12px] text-neutral-500">
                        {payment.paymentDate} · {formatPaymentChannel(payment.channel)} ·{' '}
                        {formatPaymentMethod(payment.channel, payment.method)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PaymentStatusChip status={payment.status} />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[12px] font-semibold text-brand-700 hover:bg-brand-50"
                      onClick={() => setSelected(payment)}
                    >
                      Receipt
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ParentPaymentReceiptSheet
        payment={selected}
        tenantId={tenantId}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
