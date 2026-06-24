'use client';

import Link from 'next/link';
import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  useConfirmOnlinePayment,
  usePaymentStatusPoll,
  queryKeys,
} from '@loomis/api-client';
import { formatKobo } from '@loomis/core';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription, Button, Skeleton } from '@loomis/ui-web';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

import { PaymentReceiptPanel } from '@/components/finance/payment-receipt-panel';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useActiveTenantStore } from '@/lib/tenant/active-tenant-store';

function PaymentCompleteContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const paymentId = searchParams.get('paymentId');
  const tenantFromQuery = searchParams.get('tenantId');
  const storeTenantId = useActiveTenantStore((s) => s.activeTenantId);
  const tenantId = tenantFromQuery ?? storeTenantId ?? '';

  const confirmPayment = useConfirmOnlinePayment();
  const paymentQuery = usePaymentStatusPoll(tenantId, paymentId);
  const payment = confirmPayment.data ?? paymentQuery.data;
  const status = payment?.status;

  useEffect(() => {
    if (!tenantId || !paymentId) return;
    if (confirmPayment.isPending || confirmPayment.isSuccess) return;
    confirmPayment.mutate({ tenantId, paymentId });
  }, [tenantId, paymentId, confirmPayment.isPending, confirmPayment.isSuccess, confirmPayment.mutate]);

  useEffect(() => {
    if (status !== 'verified' || !tenantId || !payment) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.parent.dashboard() });
    if (payment.studentId && payment.termId) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.parent.fees(tenantId, payment.studentId, payment.termId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.parent.payments(tenantId, payment.studentId, payment.termId),
      });
    }
  }, [status, tenantId, payment, queryClient]);

  const isLoading = !payment && paymentQuery.isLoading;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <div className={`${ACADEMIC_UI.dataPanel} p-8 text-center`}>
        {!paymentId || !tenantId ? (
          <>
            <XCircle aria-hidden className="mx-auto size-10 text-red-500" />
            <h1 className="mt-4 text-xl font-bold text-neutral-900">Invalid payment link</h1>
            <p className="mt-2 text-[13px] text-neutral-500">
              This return URL is missing payment details. Go back to fees and try again.
            </p>
            <Button asChild className={`${ACADEMIC_UI.btnPrimary} mt-6`}>
              <Link href="/parent/fees">Back to fees</Link>
            </Button>
          </>
        ) : isLoading ? (
          <Skeleton className="mx-auto h-32 w-full rounded-xl" />
        ) : status === 'verified' ? (
          <>
            <CheckCircle2 aria-hidden className="mx-auto size-12 text-emerald-600" />
            <h1 className="mt-4 text-xl font-bold text-neutral-900">Payment successful</h1>
            <p className="mt-2 text-[13px] text-neutral-500">
              {payment ? formatKobo(payment.amountMinor) : 'Your payment'} has been confirmed.
            </p>
            {payment ? (
              <div className="mt-6 text-left">
                <PaymentReceiptPanel payment={payment} />
              </div>
            ) : null}
            <Button asChild className={`${ACADEMIC_UI.btnPrimary} mt-6 w-full`}>
              <Link href="/parent/fees">View fee status</Link>
            </Button>
          </>
        ) : status === 'failed' || status === 'cancelled' ? (
          <>
            <XCircle aria-hidden className="mx-auto size-10 text-red-500" />
            <h1 className="mt-4 text-xl font-bold text-neutral-900">Payment not completed</h1>
            <p className="mt-2 text-[13px] text-neutral-500">
              Paystack did not confirm this payment. You can try again from the fees page.
            </p>
            <Button asChild className={`${ACADEMIC_UI.btnPrimary} mt-6`}>
              <Link href="/parent/fees">Back to fees</Link>
            </Button>
          </>
        ) : (
          <>
            <Clock aria-hidden className="mx-auto size-10 text-brand-600" />
            <h1 className="mt-4 text-xl font-bold text-neutral-900">Confirming payment</h1>
            <p className="mt-2 text-[13px] text-neutral-500">
              Checking with Paystack now. This usually takes a few seconds.
            </p>
            {paymentQuery.isError ? (
              <Alert variant="destructive" className="mt-4 text-left">
                <AlertDescription>Could not load payment status. Refresh the page in a moment.</AlertDescription>
              </Alert>
            ) : null}
            <Button asChild variant="outline" className="mt-6">
              <Link href="/parent/fees">Return to fees</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}

export default function PaymentCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
          <Skeleton className="mx-auto h-32 w-full max-w-lg rounded-xl" />
        </main>
      }
    >
      <PaymentCompleteContent />
    </Suspense>
  );
}
