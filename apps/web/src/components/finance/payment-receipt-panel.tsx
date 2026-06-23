'use client';

import type { PaymentResponse, ReceiptResponse } from '@loomis/contracts';
import { formatKobo } from '@loomis/core';
import { Badge } from '@loomis/ui-web';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatFeeCategory } from '@/lib/finance/finance-labels';

interface PaymentReceiptPanelProps {
  payment: PaymentResponse;
  receipt?: ReceiptResponse | null;
}

export function PaymentReceiptPanel({ payment, receipt }: PaymentReceiptPanelProps) {
  const activeReceipt = receipt ?? payment.receipt;

  return (
    <div className="space-y-4 text-[13px]">
      <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4">
        <p className="font-mono text-xl font-bold tabular-nums text-neutral-900">
          {formatKobo(payment.amountMinor)}
        </p>
        <p className="mt-1 text-neutral-600">
          {payment.paymentDate}
          {payment.channelReference ? ` · Ref ${payment.channelReference}` : ''}
        </p>
      </div>

      {activeReceipt ? (
        <div className={ACADEMIC_UI.dataPanel}>
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <p className={ACADEMIC_UI.sectionLabel}>Receipt</p>
            <p className="mt-0.5 font-semibold text-neutral-900">
              #{activeReceipt.sequenceNumber}
              <Badge variant="outline" className="ml-2 align-middle">
                {activeReceipt.status}
              </Badge>
            </p>
          </div>
          <ul className="divide-y divide-neutral-100">
            {activeReceipt.lineItems.map((item, index) => (
              <li
                key={`${item.name}-${index}`}
                className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
              >
                <div>
                  <p className="font-medium text-neutral-900">{item.name}</p>
                  <p className="text-[11px] text-neutral-500">{formatFeeCategory(item.category)}</p>
                </div>
                <p className="font-mono tabular-nums text-neutral-900">
                  {formatKobo(item.amountMinor)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-neutral-500">
          Receipt will appear once the payment is verified.
        </p>
      )}
    </div>
  );
}
