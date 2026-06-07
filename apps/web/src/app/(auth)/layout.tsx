import type { ReactNode } from 'react';

/**
 * Static shell for the unauthenticated (auth) route group (Frontend Architecture
 * §7.1). Server Component — needs no session token.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-neutral-50 p-6">
      <div className="text-center">
        <span className="text-2xl font-semibold tracking-tight text-brand-700">Loomis</span>
      </div>
      {children}
    </main>
  );
}
