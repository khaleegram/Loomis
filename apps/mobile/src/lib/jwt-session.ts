import { role as roleSchema, type Role } from '@loomis/contracts';

export interface DecodedAccessSession {
  role: Role;
  tenantId: string | null;
  displayName?: string;
}

/** Decode role + tenant from JWT payload (same as web BFF — refresh body omits them). */
export function decodeSessionFromAccessToken(accessToken: string): DecodedAccessSession | null {
  const parts = accessToken.split('.');
  if (parts.length !== 3) return null;

  try {
    const payloadPart = parts[1];
    if (!payloadPart) return null;

    const padded = payloadPart + '='.repeat((4 - (payloadPart.length % 4)) % 4);
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const claims = JSON.parse(json) as {
      role?: unknown;
      tenant_id?: unknown;
      display_name?: unknown;
    };

    const parsedRole = roleSchema.safeParse(claims.role);
    if (!parsedRole.success) return null;

    const tenantId = typeof claims.tenant_id === 'string' ? claims.tenant_id : null;
    const displayName =
      typeof claims.display_name === 'string' && claims.display_name.length > 0
        ? claims.display_name
        : undefined;

    return {
      role: parsedRole.data,
      tenantId,
      ...(displayName ? { displayName } : {}),
    };
  } catch {
    return null;
  }
}
