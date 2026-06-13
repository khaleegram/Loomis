function decodeBase64Url(part: string): string {
  const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
  const padding =
    normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const base64 = normalized + padding;

  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  return Buffer.from(base64, 'base64').toString('utf8');
}

/** Decodes `sub` (user id) from an access token JWT without verifying signature. */
export function getUserIdFromAccessToken(accessToken: string): string | null {
  const parts = accessToken.split('.');
  if (parts.length !== 3) return null;
  try {
    const payloadPart = parts[1];
    if (!payloadPart) return null;
    const claims = JSON.parse(decodeBase64Url(payloadPart)) as { sub?: unknown };
    return typeof claims.sub === 'string' ? claims.sub : null;
  } catch {
    return null;
  }
}
