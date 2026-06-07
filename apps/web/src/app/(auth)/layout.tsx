import type { ReactNode } from 'react';

import { AuthShellLayout } from '@/components/layout/auth-shell-layout';

/**
 * Static shell for the unauthenticated (auth) route group (Frontend Architecture
 * §7.1). Server Component wrapper — AuthShellLayout is client for step labels.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShellLayout>{children}</AuthShellLayout>;
}
