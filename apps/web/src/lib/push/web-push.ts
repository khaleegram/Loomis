const FINGERPRINT_KEY = 'loomis_device_fingerprint';
const DEVICE_ID_KEY = 'loomis_web_device_id';
const PUSH_REGISTERED_KEY = 'loomis_push_registered';

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getOrCreateDeviceFingerprint(): string {
  let fingerprint = localStorage.getItem(FINGERPRINT_KEY);
  if (!fingerprint) {
    fingerprint = crypto.randomUUID();
    localStorage.setItem(FINGERPRINT_KEY, fingerprint);
  }
  return fingerprint;
}

export function getStoredWebDeviceId(): string | null {
  return localStorage.getItem(DEVICE_ID_KEY);
}

export function storeWebDeviceId(deviceId: string): void {
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
}

export function isPushRegistered(): boolean {
  return localStorage.getItem(PUSH_REGISTERED_KEY) === '1';
}

export function markPushRegistered(): void {
  localStorage.setItem(PUSH_REGISTERED_KEY, '1');
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToWebPush(vapidPublicKey: string): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });
  }
  return subscription;
}

export function serializePushSubscription(subscription: PushSubscription): string {
  return JSON.stringify(subscription.toJSON());
}
