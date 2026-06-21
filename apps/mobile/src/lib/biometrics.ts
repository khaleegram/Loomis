import * as LocalAuthentication from 'expo-local-authentication';
import { secureGet, secureSet } from './secure-store.js';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

export async function isBiometricEnabled(): Promise<boolean> {
  const value = await secureGet(BIOMETRIC_ENABLED_KEY);
  return value === '1';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await secureSet(BIOMETRIC_ENABLED_KEY, enabled ? '1' : '0');
}

export async function authenticateWithBiometrics(reason: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Use password',
    disableDeviceFallback: false,
  });
  return result.success;
}
