'use client';

import type { ReactNode } from 'react';

interface AuthShellProps {
  children: ReactNode;
  /** Optional step label shown on the product panel (e.g. "Step 2 of 2"). */
  step?: string;
}

/** 3D Glassmorphism Centered Layout with Dark Liquid Core. */
export function AuthShell({ children, step }: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center bg-[#0b1410] px-4 py-12 overflow-hidden select-none">
      {/* Dark Liquid Core background blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-[#0a4226]/30 blur-[120px] animate-blob-1"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-1/4 -bottom-1/4 h-[600px] w-[600px] rounded-full bg-[#d4af37]/8 blur-[130px] animate-blob-2"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/3 top-1/3 h-[500px] w-[500px] rounded-full bg-[#4ade80]/6 blur-[110px] animate-blob-3"
      />

      {/* Grid overlay for 3D technical texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_75%,transparent_100%)]"
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6">
        {/* Brand header */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-12 items-center justify-center rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
            <span className="font-serif text-2xl font-bold text-[#f2da88]">L</span>
          </div>
          <span className="font-serif text-3xl font-semibold tracking-tight text-white">Loomis</span>
          {step ? (
            <span className="rounded-full bg-white/10 px-3 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#f2da88] ring-1 ring-white/10">
              {step}
            </span>
          ) : null}
        </div>

        {/* Auth form card */}
        <div className="w-full">{children}</div>

        {/* Footer info */}
        <p className="text-center text-xs text-neutral-500">
          © {new Date().getFullYear()} Loomis. All rights reserved.
        </p>
      </div>
    </main>
  );
}

