import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

/** Paystack return URL — must match API PAYMENT_REDIRECT_MOBILE_URL / callback_url. */
export function paystackMobileReturnUrl(): string {
  return Linking.createURL('payments/complete');
}

export function paystackPublicKey(): string | null {
  const extra = Constants.expoConfig?.extra as { paystackPublicKey?: string } | undefined;
  return process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ?? extra?.paystackPublicKey ?? null;
}

export function paystackOnlineEnabled(): boolean {
  return Boolean(paystackPublicKey());
}
