import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { secureGet, secureSet } from '../lib/secure-store.js';
import type { QueuedMutation, QueueStatus } from './types.js';

const DB_NAME = 'loomis-offline.db';
const DB_KEY_NAME = 'offline_db_key';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDbKey(): Promise<string> {
  let key = await secureGet(DB_KEY_NAME);
  if (!key) {
    const random = Crypto.getRandomBytes(32);
    key = Array.from(random)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    await secureSet(DB_KEY_NAME, key);
  }
  return key;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Application-level encryption — payload obfuscated with key held in SecureStore. */
async function encryptPayload(plain: string): Promise<string> {
  const key = await getDbKey();
  const bytes = new TextEncoder().encode(plain);
  const keyBytes = new TextEncoder().encode(key.slice(0, 32));
  const out = bytes.map((b, i) => b ^ keyBytes[i % keyBytes.length]!);
  return toHex(new Uint8Array(out));
}

async function decryptPayload(cipher: string): Promise<string> {
  const key = await getDbKey();
  const bytes = fromHex(cipher);
  const keyBytes = new TextEncoder().encode(key.slice(0, 32));
  const out = bytes.map((b, i) => b ^ keyBytes[i % keyBytes.length]!);
  return new TextDecoder().decode(out);
}

export async function openOfflineDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS offline_queue (
          id TEXT PRIMARY KEY NOT NULL,
          kind TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          payload_cipher TEXT NOT NULL,
          signature TEXT NOT NULL,
          device_id TEXT NOT NULL,
          captured_at TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          error_code TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_queue(status);
      `);
      return db;
    })();
  }
  return dbPromise;
}

export async function insertQueueItem(
  item: Omit<QueuedMutation, 'payloadJson'> & { payloadJson: string },
): Promise<void> {
  const db = await openOfflineDb();
  const cipher = await encryptPayload(item.payloadJson);
  await db.runAsync(
    `INSERT OR REPLACE INTO offline_queue
      (id, kind, tenant_id, payload_cipher, signature, device_id, captured_at, status, created_at, error_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    item.id,
    item.kind,
    item.tenantId,
    cipher,
    item.signature,
    item.deviceId,
    item.capturedAt,
    item.status,
    item.createdAt,
    item.errorCode ?? null,
  );
}

export async function listPendingQueueItems(): Promise<QueuedMutation[]> {
  const db = await openOfflineDb();
  const rows = await db.getAllAsync<{
    id: string;
    kind: string;
    tenant_id: string;
    payload_cipher: string;
    signature: string;
    device_id: string;
    captured_at: string;
    status: string;
    created_at: string;
    error_code: string | null;
  }>(`SELECT * FROM offline_queue WHERE status IN ('pending_sync', 'conflict') ORDER BY created_at ASC`);

  const items: QueuedMutation[] = [];
  for (const row of rows) {
    items.push({
      id: row.id,
      kind: row.kind as QueuedMutation['kind'],
      tenantId: row.tenant_id,
      payloadJson: await decryptPayload(row.payload_cipher),
      signature: row.signature,
      deviceId: row.device_id,
      capturedAt: row.captured_at,
      status: row.status as QueueStatus,
      createdAt: row.created_at,
      errorCode: row.error_code,
    });
  }
  return items;
}

export async function updateQueueStatus(id: string, status: QueueStatus, errorCode?: string): Promise<void> {
  const db = await openOfflineDb();
  await db.runAsync(`UPDATE offline_queue SET status = ?, error_code = ? WHERE id = ?`, status, errorCode ?? null, id);
}

export async function countPendingQueueItems(): Promise<number> {
  const db = await openOfflineDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM offline_queue WHERE status IN ('pending_sync', 'conflict')`,
  );
  return row?.count ?? 0;
}

export async function deleteSyncedOlderThan(days: number): Promise<number> {
  const db = await openOfflineDb();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const result = await db.runAsync(
    `DELETE FROM offline_queue WHERE status = 'synced' AND created_at < ?`,
    cutoff,
  );
  return result.changes;
}

export async function listStalePendingItems(maxAgeDays: number): Promise<QueuedMutation[]> {
  const db = await openOfflineDb();
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
  const rows = await db.getAllAsync<{
    id: string;
    kind: string;
    tenant_id: string;
    payload_cipher: string;
    signature: string;
    device_id: string;
    captured_at: string;
    status: string;
    created_at: string;
    error_code: string | null;
  }>(
    `SELECT * FROM offline_queue WHERE status = 'pending_sync' AND created_at < ? ORDER BY created_at ASC`,
    cutoff,
  );
  const items: QueuedMutation[] = [];
  for (const row of rows) {
    items.push({
      id: row.id,
      kind: row.kind as QueuedMutation['kind'],
      tenantId: row.tenant_id,
      payloadJson: await decryptPayload(row.payload_cipher),
      signature: row.signature,
      deviceId: row.device_id,
      capturedAt: row.captured_at,
      status: row.status as QueueStatus,
      createdAt: row.created_at,
      errorCode: row.error_code,
    });
  }
  return items;
}
