'use client';

import type { ReactNode } from 'react';

interface AuthShellProps {
  children: ReactNode;
  step?: string;
}

/** Chancellor Navy — Deep Ocean backdrop with animated navy/sand/sky blobs. */
export function AuthShell({ children, step }: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center bg-[#0A0F1D] px-4 py-12 overflow-hidden select-none">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-[#0F1E36]/30 blur-[120px] animate-blob-1"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-1/4 -bottom-1/4 h-[600px] w-[600px] rounded-full bg-[#E6DFD3]/8 blur-[130px] animate-blob-2"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/3 top-1/3 h-[500px] w-[500px] rounded-full bg-[#38BDF8]/6 blur-[110px] animate-blob-3"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_75%,transparent_100%)]"
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-12 items-center justify-center border border-[#38BDF8]/30 bg-[#38BDF8]/10">
            <span className="font-serif text-2xl font-bold text-sky-400">L</span>
          </div>
          <span className="font-serif text-3xl font-semibold tracking-tight text-white">Loomis</span>
          {step ? (
            <span className="bg-white/10 px-3 py-0.5 text-[10px] font-medium uppercase tracking-wider text-sky-400 ring-1 ring-white/10">
              {step}
            </span>
          ) : null}
        </div>

        <div className="w-full">{children}</div>

        <p className="text-center text-xs text-neutral-500">
          © {new Date().getFullYear()} Loomis. All rights reserved.
        </p>
      </div>
    </main>
  );
}
