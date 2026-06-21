import { p256 } from '@noble/curves/p256';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import type { OfflineAttendanceEntry } from '@loomis/contracts';
import { secureGet, secureSet } from '../lib/secure-store.js';
import { buildAttendanceSigningMessage } from './signing-message.js';

export { buildAttendanceSigningMessage };

const DEVICE_KEY_PREFIX = 'device_key_';

function storageKey(tenantId: string): string {
  return `${DEVICE_KEY_PREFIX}${tenantId}`;
}

export async function getOrCreateDeviceKeyPair(tenantId: string): Promise<{
  privateKey: Uint8Array;
  publicKeyPem: string;
}> {
  const existing = await secureGet(storageKey(tenantId));
  if (existing) {
    const parsed = JSON.parse(existing) as { privateKeyHex: string; publicKeyPem: string };
    return { privateKey: hexToBytes(parsed.privateKeyHex), publicKeyPem: parsed.publicKeyPem };
  }

  const privateKey = p256.utils.randomPrivateKey();
  const publicKey = p256.getPublicKey(privateKey, false);
  const publicKeyPem = spkiPemFromRawPublicKey(publicKey);

  await secureSet(
    storageKey(tenantId),
    JSON.stringify({
      privateKeyHex: bytesToHex(privateKey),
      publicKeyPem,
    }),
  );

  return { privateKey, publicKeyPem };
}

function spkiPemFromRawPublicKey(rawUncompressed: Uint8Array): string {
  const spki = createSpkiDer(rawUncompressed);
  const b64 = btoa(String.fromCharCode(...spki));
  const lines = b64.match(/.{1,64}/g) ?? [b64];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
}

function createSpkiDer(rawUncompressed: Uint8Array): Uint8Array {
  const algId = new Uint8Array([
    0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86,
    0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
  ]);
  const bitString = new Uint8Array(2 + rawUncompressed.length);
  bitString[0] = 0x03;
  bitString[1] = rawUncompressed.length + 1;
  bitString[2] = 0x00;
  bitString.set(rawUncompressed, 3);
  const spkiBody = new Uint8Array(algId.length + bitString.length);
  spkiBody.set(algId, 0);
  spkiBody.set(bitString, algId.length);
  const spki = new Uint8Array(2 + spkiBody.length);
  spki[0] = 0x30;
  spki[1] = spkiBody.length;
  spki.set(spkiBody, 2);
  return spki;
}

export async function signAttendanceEntry(
  tenantId: string,
  entry: Omit<OfflineAttendanceEntry, 'signature'>,
): Promise<string> {
  const { privateKey } = await getOrCreateDeviceKeyPair(tenantId);
  const message = buildAttendanceSigningMessage(entry);
  const digest = sha256(new TextEncoder().encode(message));
  const sig = p256.sign(digest, privateKey);
  const compact = sig.toCompactRawBytes();
  return btoa(String.fromCharCode(...compact));
}

export async function getDevicePublicKeyPem(tenantId: string): Promise<string> {
  const { publicKeyPem } = await getOrCreateDeviceKeyPair(tenantId);
  return publicKeyPem;
}
