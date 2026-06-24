import { getEnv } from '../../../config/env.js';

/** True when ClamAV / Lambda scan pipeline is active and must gate downloads. */
export function isStorageMalwareScanEnabled(): boolean {
  return getEnv().STORAGE_MALWARE_SCAN_ENABLED;
}
