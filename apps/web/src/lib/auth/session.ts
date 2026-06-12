import { role as roleSchema, type Role } from '@loomis/contracts';

/**
 * Edge-safe session descriptor helpers (no Node APIs) so the middleware can
 * read them at the edge. The session cookie carries ONLY the role + tenant for
 * UX route-group gating — never a token (Frontend Architecture §7.2).
 */

/** httpOnly cookie carrying { role, tenantId } for edge route-group gating. */
export const SESSION_COOKIE = 'loomis_session';

export interface SessionInfo {
  role: Role;
  tenantId: string | null;
  mustChangePassword?: boolean;
  displayName?: string;
}

export function serializeSession(info: SessionInfo): string {
  return JSON.stringify(info);
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }
}

export function parseSession(raw: string | undefined | null): SessionInfo | null {
  if (!raw) return null;
  const parsed = safeJsonParse(raw) as { role?: unknown; tenantId?: unknown; mustChangePassword?: unknown; displayName?: unknown } | null;
  if (!parsed || typeof parsed !== 'object') return null;
  const parsedRole = roleSchema.safeParse(parsed.role);
  if (!parsedRole.success) return null;
  const tenantId = typeof parsed.tenantId === 'string' ? parsed.tenantId : null;
  const mustChangePassword = parsed.mustChangePassword === true;
  const displayName = typeof parsed.displayName === 'string' ? parsed.displayName : undefined;
  return { role: parsedRole.data, tenantId, ...(mustChangePassword ? { mustChangePassword: true } : {}), ...(displayName ? { displayName } : {}) };
}
