import { NextResponse, type NextRequest } from 'next/server';

import {
  groupForPath,
  homePathForRole,
  roleCanAccessPath,
} from '@/lib/auth/route-groups';
import { SESSION_COOKIE, parseSession } from '@/lib/auth/session';

/**
 * Edge auth gate + role-based route-group protection (Frontend Architecture §7.2).
 *
 * Reads the httpOnly session cookie (role + tenant, NOT a token), then:
 *   - sends unauthenticated users on a protected console to /login,
 *   - redirects a role to its own console if it requests another group,
 *   - keeps already-authenticated users out of the (auth) pages.
 *
 * This is UX-level defence in depth — the backend remains the real authority.
 */

const AUTH_PAGES = new Set(['/login', '/mfa', '/mfa-enrollment', '/reset-password', '/change-password']);

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const session = parseSession(req.cookies.get(SESSION_COOKIE)?.value);

  if (session?.mustChangePassword && pathname !== '/change-password') {
    return NextResponse.redirect(new URL('/change-password', req.url));
  }

  if (pathname === '/change-password') {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (!session.mustChangePassword) {
      return NextResponse.redirect(new URL(homePathForRole(session.role), req.url));
    }
    return NextResponse.next();
  }

  if (pathname === '/') {
    if (session) {
      if (session.mustChangePassword) {
        return NextResponse.redirect(new URL('/change-password', req.url));
      }
      return NextResponse.redirect(new URL(homePathForRole(session.role), req.url));
    }
    return NextResponse.next();
  }

  // Authenticated users should not sit on the login/MFA/reset screens.
  if (AUTH_PAGES.has(pathname)) {
    if (session && !session.mustChangePassword) {
      return NextResponse.redirect(new URL(homePathForRole(session.role), req.url));
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
    return NextResponse.redirect(new URL(homePathForRole(session.role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on all pages except API routes, Next internals, and static assets.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
