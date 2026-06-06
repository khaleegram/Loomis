import { createPublicKey, verify } from 'node:crypto';
import type { OfflineAttendanceEntry } from '@loomis/contracts';

/**
 * Per-tenant device signature verification for offline attendance sync (MOB-007).
 *
 * The mobile client signs each offline entry with the device's ECDSA P-256
 * private key (held in the secure keystore) over a canonical message; the server
 * verifies the signature against the registered SPKI public key. The canonical
 * message binds every field that matters — including the origin tenant — so a
 * record cannot be replayed against a different tenant, student, or day.
 *
 * The signature is base64-encoded in the raw IEEE-P1363 (r||s) form produced by
 * WebCrypto / mobile crypto libraries, hashed with SHA-256.
 */

/**
 * Builds the deterministic message that the device signs. Field order and the
 * `v1` prefix are part of the contract — the mobile client MUST build the exact
 * same string. Any change here is a breaking signing-format change.
 */
export function buildAttendanceSigningMessage(entry: OfflineAttendanceEntry): string {
  return [
    'loomis.attendance.v1',
    entry.originTenantId,
    entry.termId,
    entry.classArmId,
    entry.studentId,
    entry.attendanceDate,
    entry.session,
    entry.status,
    entry.capturedAt,
  ].join('|');
}

/**
 * Verifies a single offline entry's signature against the device public key.
 * Returns false on any malformed key/signature rather than throwing, so the
 * caller can reject the whole batch with a single domain error (never partially
 * applied — MOB-007).
 */
export function verifyAttendanceSignature(
  entry: OfflineAttendanceEntry,
  publicKeyPem: string,
): boolean {
  try {
    const keyObject = createPublicKey({ key: publicKeyPem, format: 'pem', type: 'spki' });
    const message = Buffer.from(buildAttendanceSigningMessage(entry), 'utf8');
    const signature = Buffer.from(entry.signature, 'base64');
    if (signature.length === 0) return false;
    return verify('sha256', message, { key: keyObject, dsaEncoding: 'ieee-p1363' }, signature);
  } catch {
    return false;
  }
}
