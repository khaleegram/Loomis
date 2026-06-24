import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useConfirmOnlinePayment, usePaymentStatusPoll } from '@loomis/api-client';
import { formatKobo } from '@loomis/core';
import { Alert, Button, Skeleton } from '@loomis/ui-mobile';
import { useEffect } from 'react';
import { parseChildKey, useActiveChildStore } from '@/lib/active-child-store';

export default function PaymentCompleteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ paymentId?: string; tenantId?: string }>();
  const paymentId = typeof params.paymentId === 'string' ? params.paymentId : null;
  const tenantFromQuery = typeof params.tenantId === 'string' ? params.tenantId : null;
  const activeChildKey = useActiveChildStore((s) => s.activeChildKey);
  const parsedChild = activeChildKey ? parseChildKey(activeChildKey) : null;
  const tenantId = tenantFromQuery ?? parsedChild?.tenantId ?? '';

  const confirmPayment = useConfirmOnlinePayment();
  const paymentQuery = usePaymentStatusPoll(tenantId, paymentId);
  const payment = confirmPayment.data ?? paymentQuery.data;
  const status = payment?.status;

  useEffect(() => {
    if (!tenantId || !paymentId) return;
    if (confirmPayment.isPending || confirmPayment.isSuccess) return;
    confirmPayment.mutate({ tenantId, paymentId });
  }, [tenantId, paymentId, confirmPayment.isPending, confirmPayment.isSuccess, confirmPayment.mutate]);

  if (!paymentId || !tenantId) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 px-6 dark:bg-forest-950">
        <Alert tone="danger">Invalid payment return link.</Alert>
        <Button className="mt-4" onPress={() => router.replace('/(parent)/(tabs)/fees')}>
          Back to fees
        </Button>
      </View>
    );
  }

  if (!payment && paymentQuery.isLoading) {
    return (
      <View className="flex-1 bg-neutral-50 px-6 pt-16 dark:bg-forest-950">
        <Skeleton className="h-40 w-full rounded-2xl" />
      </View>
    );
  }

  if (status === 'verified') {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 px-6 dark:bg-forest-950">
        <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Payment successful</Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-300">
          {payment ? formatKobo(payment.amountMinor) : 'Your payment'} is confirmed. Receipt is in your fee
          history.
        </Text>
        <Button className="mt-6" onPress={() => router.replace('/(parent)/(tabs)/fees')}>
          View fees
        </Button>
      </View>
    );
  }

  if (status === 'failed' || status === 'cancelled') {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 px-6 dark:bg-forest-950">
        <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Payment not completed</Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-300">
          Paystack did not confirm this payment. Try again from the fees tab.
        </Text>
        <Button className="mt-6" onPress={() => router.replace('/(parent)/(tabs)/fees')}>
          Back to fees
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-neutral-50 px-6 dark:bg-forest-950">
      <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Confirming payment</Text>
      <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-300">
        Checking with Paystack now. This usually takes a few seconds.
      </Text>
      {paymentQuery.isError ? (
        <Alert tone="danger" className="mt-4">
          Could not load payment status.
        </Alert>
      ) : null}
      <Button className="mt-6" variant="secondary" onPress={() => router.replace('/(parent)/(tabs)/fees')}>
        Return to fees
      </Button>
    </View>
  );
}
