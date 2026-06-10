'use client';

import type { ReactNode } from 'react';

import { AuthBrandPanel } from '@/components/layout/auth-brand-panel';

interface AuthShellProps {
  children: ReactNode;
  /** Optional step label shown above the form (e.g. "Step 2 of 2"). */
  step?: string;
}

/** Split-view auth shell — brand story left, form right. */
export function AuthShell({ children, step }: AuthShellProps) {
  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      <AuthBrandPanel />
      <section className="flex flex-1 flex-col items-center justify-center bg-background px-8 py-14">
        <div className="w-full max-w-md">
          {step ? (
            <p className="mb-4 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {step}
            </p>
          ) : null}
          {children}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Loomis. All rights reserved.
          </p>
        </div>
      </section>
    </main>
  );
}
