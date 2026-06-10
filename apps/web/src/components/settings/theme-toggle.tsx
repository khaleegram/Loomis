'use client';

import { Sun } from 'lucide-react';

/** Loomis V2 uses a fixed light theme — no toggle. */
export function ThemeToggle() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
      <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Sun aria-hidden className="size-4" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">Light mode</p>
        <p className="text-sm text-muted-foreground">
          Loomis V2 uses a premium light interface. Dark mode is not available.
        </p>
      </div>
    </div>
  );
}
