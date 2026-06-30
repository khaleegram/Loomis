import { NextResponse, type NextRequest } from 'next/server';

import { extractSchoolSlugFromHost } from '@loomis/core';
import {
  groupForPath,
  landingPathForRole,
  roleCanAccessPath,
} from '@/lib/auth/route-groups';
import { SESSION_COOKIE, parseSession } from '@/lib/auth/session';

/**
 * Edge auth gate + role-based route-group protection (Frontend Architecture §7.2).
 *
 * Reads the httpOnly session cookie (role + tenant, NOT a token), then:
 *   - resolves per-school subdomains ({slug}.loomis.digital) to the public site,
 *   - sends unauthenticated users on a protected console to /login,
 *   - redirects a role to its own console if it requests another group,
 *   - keeps already-authenticated users out of the (auth) pages.
 *
 * This is UX-level defence in depth — the backend remains the real authority.
 */

const AUTH_PAGES = new Set(['/login', '/mfa', '/mfa-enrollment', '/reset-password', '/change-password', '/accept-invitation']);

const PUBLIC_SITE_APEX_DOMAIN =
  process.env.NEXT_PUBLIC_PUBLIC_SITE_APEX_DOMAIN || 'loomis.digital';

/**
 * If the request arrives on a school subdomain ({slug}.loomis.digital), serve
 * the public site renderer at /s/{slug}. Public sites carry NO auth UI and the
 * session cookie is host-only (never sent to subdomains), so this path is fully
 * unauthenticated.
 */
function resolveSchoolSubdomain(req: NextRequest): NextResponse | null {
  const host = req.headers.get('host');
  const slug = extractSchoolSlugFromHost(host, PUBLIC_SITE_APEX_DOMAIN);
  if (!slug) return null;

  const { pathname } = req.nextUrl;

  // Already pointing at the public renderer — let it through.
  if (pathname === `/s/${slug}` || pathname.startsWith(`/s/${slug}/`)) {
    return NextResponse.next();
  }

  // Only the site root is meaningful on a school subdomain; rewrite to renderer.
  const url = req.nextUrl.clone();
  url.pathname = `/s/${slug}`;
  return NextResponse.rewrite(url);
}

export function middleware(req: NextRequest): NextResponse {
  const subdomainResponse = resolveSchoolSubdomain(req);
  if (subdomainResponse) return subdomainResponse;

  const { pathname } = req.nextUrl;
  const session = parseSession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === '/change-password') {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (!session.mustChangePassword) {
      return NextResponse.redirect(new URL(landingPathForRole(session.role), req.url));
    }
    return NextResponse.next();
  }

  if (session?.mustChangePassword) {
    return NextResponse.redirect(new URL('/change-password', req.url));
  }

  if (pathname === '/') {
    if (session) {
      if (session.mustChangePassword) {
        return NextResponse.redirect(new URL('/change-password', req.url));
      }
      return NextResponse.redirect(new URL(landingPathForRole(session.role), req.url));
    }
    return NextResponse.next();
  }

  // Authenticated users should not sit on the login/MFA/reset screens.
  if (AUTH_PAGES.has(pathname)) {
    if (session && !session.mustChangePassword) {
      return NextResponse.redirect(new URL(landingPathForRole(session.role), req.url));
    }
    return NextResponse.next();
  }

  const group = groupForPath(pathname);
  if (group === null) {
    return NextResponse.next(); // public / non-console path
  }

  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!roleCanAccessPath(session.role, pathname)) {
    return NextResponse.redirect(new URL(landingPathForRole(session.role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on all pages except API routes, Next internals, and static assets.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
