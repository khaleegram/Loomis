'use client';

import type { PaymentResponse } from '@loomis/contracts';
import { useConfirmOnlinePayment, usePayment } from '@loomis/api-client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@loomis/ui-web';
import { useEffect } from 'react';

import { PaymentReceiptPanel } from '@/components/finance/payment-receipt-panel';

interface ParentPaymentReceiptSheetProps {
  payment: PaymentResponse | null;
  tenantId: string;
  onClose: () => void;
}

export function ParentPaymentReceiptSheet({
  payment,
  tenantId,
  onClose,
}: ParentPaymentReceiptSheetProps) {
  const confirmPayment = useConfirmOnlinePayment();
  const paymentQuery = usePayment(tenantId, payment?.id ?? '');
  const displayPayment = confirmPayment.data ?? paymentQuery.data ?? payment;

  useEffect(() => {
    if (!payment || !tenantId) return;
    if (payment.channel !== 'online' || payment.status !== 'pending') return;
    if (confirmPayment.isPending || confirmPayment.isSuccess) return;
    confirmPayment.mutate({ tenantId, paymentId: payment.id });
  }, [payment, tenantId, confirmPayment.isPending, confirmPayment.isSuccess, confirmPayment.mutate]);

  return (
    <Sheet open={Boolean(payment)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Payment receipt</SheetTitle>
          <SheetDescription>Official receipt for this fee payment.</SheetDescription>
        </SheetHeader>
        {displayPayment ? (
          <div className="mt-6">
            <PaymentReceiptPanel payment={displayPayment} />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
