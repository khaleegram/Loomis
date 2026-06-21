import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import {
  useInitializeOnlinePayment,
  useMyProfile,
  useParentFees,
  useSendParentPaymentOtp,
} from '@loomis/api-client';
import { formatKobo } from '@loomis/core';
import { SummaryDetail, Button, Alert, Input } from '@loomis/ui-mobile';
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
  const sendPaymentOtp = useSendParentPaymentOtp(tenantId);
  const initializePayment = useInitializeOnlinePayment(
    tenantId,
    termId ?? '',
    studentId,
  );

  const fees = feesQuery.data;
  const [smsCode, setSmsCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpMeta, setOtpMeta] = useState<{ maskedPhone?: string; devBypass?: boolean }>({});

  async function handleSendOtp() {
    setPayError(null);
    try {
      const result = await sendPaymentOtp.mutateAsync();
      setOtpMeta({ maskedPhone: result.maskedPhone, devBypass: result.devBypass });
      setOtpSent(true);
    } catch {
      setPayError('Could not send SMS code. Check that your phone number is on file.');
    }
  }

  async function handlePay() {
    if (!fees?.invoiceId || fees.balanceMinor <= 0 || !payerEmail) {
      setPayError('Cannot start payment — missing invoice or payer email.');
      return;
    }
    if (!fees.onlinePaymentEnabled) {
      setPayError(
        'Online payment is not configured for this school yet. Pay at the school office.',
      );
      return;
    }
    if (smsCode.length !== 6) {
      setPayError('Enter the 6-digit SMS code sent to your phone.');
      return;
    }
    setPayError(null);
    try {
      const result = await initializePayment.mutateAsync({
        invoiceId: fees.invoiceId,
        amountMinor: fees.balanceMinor,
        payerEmail,
        provider: 'paystack',
        method: 'card',
        clientPlatform: 'mobile',
        smsOtpCode: smsCode,
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
      summaryLabel="Outstanding balance"
      summaryValue={fees && fees.balanceMinor <= 0 ? 'None' : '—'}
      summaryMinor={fees && fees.balanceMinor > 0 ? fees.balanceMinor : undefined}
      rows={rows}
      loading={termLoading || feesQuery.isLoading}
      errorMessage={feesQuery.isError ? 'Could not load fee status.' : undefined}
      emptyTitle={!fees?.invoiceId ? 'No fee invoice for this term' : undefined}
      footer={
        <>
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
          {fees && fees.balanceMinor > 0 && fees.onlinePaymentEnabled ? (
            <>
              <Button
                variant="secondary"
                loading={sendPaymentOtp.isPending}
                className="mb-3"
                onPress={() => void handleSendOtp()}
              >
                {otpSent ? 'Resend SMS code' : 'Send SMS code to pay'}
              </Button>
              {otpSent && otpMeta.maskedPhone ? (
                <Alert tone="info" className="mb-3">
                  Code sent to {otpMeta.maskedPhone}
                  {otpMeta.devBypass ? ' · Dev: use 000000' : ''}
                </Alert>
              ) : null}
              <Input
                className="mb-3 font-mono"
                placeholder="SMS code"
                keyboardType="number-pad"
                maxLength={6}
                value={smsCode}
                onChangeText={(v) => setSmsCode(v.replace(/\D/g, '').slice(0, 6))}
              />
            </>
          ) : null}
          <Button
            loading={initializePayment.isPending}
            disabled={!fees || fees.balanceMinor <= 0 || !fees.onlinePaymentEnabled}
            onPress={() => void handlePay()}
          >
            {fees && fees.balanceMinor > 0
              ? `Pay ${formatKobo(fees.balanceMinor)} with Paystack`
              : 'Nothing due'}
          </Button>
        </>
      }
    />
  );
}
