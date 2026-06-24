import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { useInitializeOnlinePayment, useMyProfile, useParentFees } from '@loomis/api-client';
import { formatKobo } from '@loomis/core';
import { SummaryDetail, Button, Alert } from '@loomis/ui-mobile';
import { ParentScopedScreen } from '@/components/parent/parent-scoped-screen';
import { paystackMobileReturnUrl } from '@/lib/paystack';

export default function ParentFeesScreen() {
  const profileQuery = useMyProfile();
  const [payError, setPayError] = useState<string | null>(null);

  return (
    <ParentScopedScreen>
      {({ tenantId, studentId, termId, termLabel, termLoading }) => (
        <FeesPanel
          tenantId={tenantId}
          studentId={studentId}
          termId={termId}
          termLabel={termLabel}
          termLoading={termLoading}
          payerEmail={profileQuery.data?.email ?? ''}
          payError={payError}
          setPayError={setPayError}
        />
      )}
    </ParentScopedScreen>
  );
}

function FeesPanel({
  tenantId,
  studentId,
  termId,
  termLabel,
  termLoading,
  payerEmail,
  payError,
  setPayError,
}: {
  tenantId: string;
  studentId: string;
  termId: string | null;
  termLabel: string | null;
  termLoading: boolean;
  payerEmail: string;
  payError: string | null;
  setPayError: (msg: string | null) => void;
}) {
  const feesQuery = useParentFees(tenantId, studentId, termId);
  const initializePayment = useInitializeOnlinePayment(
    tenantId,
    termId ?? '',
    studentId,
  );

  const fees = feesQuery.data;
  const totalOwed = fees?.totalBalanceMinor ?? fees?.balanceMinor ?? 0;
  const creditBalanceMinor = fees?.creditBalanceMinor ?? 0;
  const arrearsBalanceMinor = fees?.arrearsBalanceMinor ?? 0;

  async function handlePay() {
    if (!payerEmail || totalOwed <= 0) {
      setPayError('Cannot start payment — missing payer email or nothing owed.');
      return;
    }
    if (!fees?.onlinePaymentEnabled) {
      setPayError(
        'Online payment is not configured for this school yet. Pay at the school office.',
      );
      return;
    }
    setPayError(null);
    try {
      const result = await initializePayment.mutateAsync({
        studentId,
        payAllOwed: true,
        amountMinor: totalOwed,
        payerEmail,
        provider: 'paystack',
        method: 'card',
        clientPlatform: 'mobile',
      });

      const returnUrl = paystackMobileReturnUrl();
      const authResult = await WebBrowser.openAuthSessionAsync(
        result.authorizationUrl,
        returnUrl,
      );

      if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
        setPayError('Payment was cancelled before completion.');
      }
    } catch {
      setPayError('Payment could not be started. Try again later.');
    }
  }

  const rows =
    fees?.lineItems.map((item) => ({
      id: item.id,
      label: item.name,
      value: formatKobo(item.balanceMinor),
      subValue: `Paid ${formatKobo(item.paidMinor)} of ${formatKobo(item.amountMinor)}`,
    })) ?? [];

  return (
    <SummaryDetail
      title={termLabel ? `Fees · ${termLabel}` : 'Fee status'}
      summaryLabel="Total owed"
      summaryValue={fees && totalOwed <= 0 ? 'None' : '—'}
      summaryMinor={fees && totalOwed > 0 ? totalOwed : undefined}
      rows={rows}
      loading={termLoading || feesQuery.isLoading}
      errorMessage={feesQuery.isError ? 'Could not load fee status.' : undefined}
      emptyTitle={
        !fees?.invoiceId && totalOwed <= 0 ? 'No fee invoice for this term' : undefined
      }
      footer={
        <>
          {arrearsBalanceMinor > 0 ? (
            <Alert tone="warning" className="mb-3">
              {formatKobo(arrearsBalanceMinor)} is from earlier terms. One payment clears oldest
              balances first.
            </Alert>
          ) : null}
          {creditBalanceMinor > 0 ? (
            <Alert tone="info" className="mb-3">
              {formatKobo(creditBalanceMinor)} credit on account for future invoices.
            </Alert>
          ) : null}
          {fees && fees.amountPaidMinor > 0 ? (
            <Alert tone="info" className="mb-3">
              {formatKobo(fees.amountPaidMinor)} paid this term
              {fees.dueDate ? ` · Due ${fees.dueDate}` : ''}
            </Alert>
          ) : null}
          {payError ? (
            <Alert tone="danger" className="mb-3">
              {payError}
            </Alert>
          ) : null}
          <Button
            loading={initializePayment.isPending}
            disabled={!fees || totalOwed <= 0 || !fees.onlinePaymentEnabled}
            onPress={() => void handlePay()}
          >
            {fees && totalOwed > 0
              ? `Pay ${formatKobo(totalOwed)} with Paystack`
              : 'Nothing due'}
          </Button>
        </>
      }
    />
  );
}
