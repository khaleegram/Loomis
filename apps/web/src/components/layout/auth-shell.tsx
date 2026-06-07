'use client';

import type { ReactNode } from 'react';
import { Building2, ShieldCheck, Wallet } from 'lucide-react';

import { Separator } from '@loomis/ui-web';

const TRUST_BULLETS = [
  {
    icon: Building2,
    title: 'Built for Nigerian schools',
    description: 'Admissions, fees, attendance, and results in one trusted platform.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by design',
    description: 'Multi-factor authentication and tenant isolation on every request.',
  },
  {
    icon: Wallet,
    title: 'Financial integrity',
    description: 'Audit trails, idempotent payments, and immutable ledger records.',
  },
] as const;

interface AuthShellProps {
  children: ReactNode;
  /** Optional step label shown on the product panel (e.g. "Step 2 of 2"). */
  step?: string;
}

/** Regent Split — branded product panel + form column (Option 1). */
export function AuthShell({ children, step }: AuthShellProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Product panel */}
      <aside className="relative flex min-h-[280px] flex-col justify-between bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 px-8 py-10 text-white lg:min-h-screen lg:px-12 lg:py-14 dark:from-forest-900 dark:via-forest-950 dark:to-forest-900">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgb(212_175_55/0.12),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_bottom_left,rgb(74_222_128/0.08),transparent_50%)]"
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-sm border border-gold/40 bg-gold/10">
              <span className="font-serif text-lg font-bold text-gold-200">L</span>
            </div>
            <span className="font-serif text-2xl font-semibold tracking-tight">Loomis</span>
          </div>
          {step ? (
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gold-200/90">{step}</p>
          ) : null}
          <h1 className="mt-6 max-w-md font-serif text-3xl font-semibold leading-tight tracking-tight lg:text-4xl">
            School management, elevated.
          </h1>
          <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-brand-100 dark:text-neutral-400">
            The modern console for Nigerian private schools — from enrollment to end-of-term results.
          </p>
          <Separator className="my-8 w-16 border-gold/40 bg-gold/40" />
          <ul className="hidden max-w-md space-y-5 lg:block">
            {TRUST_BULLETS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex gap-3">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm bg-white/10">
                    <Icon aria-hidden className="size-4 text-gold-200" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-brand-100/90 dark:text-neutral-500">
                      {item.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="relative mt-8 hidden text-xs text-brand-200/70 lg:block">
          © {new Date().getFullYear()} Loomis. All rights reserved.
        </p>
      </aside>

      {/* Form column */}
      <div className="flex items-center justify-center bg-background px-6 py-10 lg:min-h-screen lg:px-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
