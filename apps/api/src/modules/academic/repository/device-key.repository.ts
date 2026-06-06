import { and, asc, eq } from 'drizzle-orm';
import { attendanceDeviceKeys } from '../../../../drizzle/schema/academic.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

/**
 * Per-tenant attendance device signing keys (MOB-007). Stores the public half of
 * the device's ECDSA key pair; the private key never leaves the device keystore.
 */
export const deviceKeyRepository = {
  async create(
    tenantId: string,
    input: { deviceId: string; publicKeyPem: string; label: string | null; registeredByUserId: string },
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .insert(attendanceDeviceKeys)
        .values({
          tenantId,
          deviceId: input.deviceId,
          publicKeyPem: input.publicKeyPem,
          label: input.label,
          registeredByUserId: input.registeredByUserId,
        })
        .returning();
      if (!row) throw new Error('Failed to register device key');
      return row;
    });
  },

  async findActiveByDeviceId(tenantId: string, deviceId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(attendanceDeviceKeys)
        .where(
          and(
            eq(attendanceDeviceKeys.tenantId, tenantId),
            eq(attendanceDeviceKeys.deviceId, deviceId),
            eq(attendanceDeviceKeys.revoked, false),
          ),
        )
        .limit(1);
      return row ?? null;
    });
  },

  async list(tenantId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(attendanceDeviceKeys)
        .where(eq(attendanceDeviceKeys.tenantId, tenantId))
        .orderBy(asc(attendanceDeviceKeys.createdAt)),
    );
  },

  async revoke(tenantId: string, deviceId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [row] = await tx
        .update(attendanceDeviceKeys)
        .set({ revoked: true, revokedAt: now, updatedAt: now })
        .where(
          and(
            eq(attendanceDeviceKeys.tenantId, tenantId),
            eq(attendanceDeviceKeys.deviceId, deviceId),
            eq(attendanceDeviceKeys.revoked, false),
          ),
        )
        .returning();
      return row ?? null;
    });
  },
};
