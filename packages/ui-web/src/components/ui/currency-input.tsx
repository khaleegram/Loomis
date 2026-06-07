'use client';

import * as React from 'react';
import { koboToNaira, nairaToKobo } from '@loomis/core';

import { cn } from '../../lib/utils.js';

export interface CurrencyInputProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  /** Integer kobo amount (0 = empty). */
  valueKobo: number;
  onChangeKobo: (kobo: number) => void;
}

function formatNairaDisplay(kobo: number): string {
  if (!kobo) return '';
  return koboToNaira(kobo).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Parses a user-typed Naira string into integer kobo — never uses floats on the wire. */
function parseNairaToKobo(raw: string): number {
  const cleaned = raw.replace(/[^\d.]/g, '');
  if (!cleaned) return 0;

  const [whole = '', frac = ''] = cleaned.split('.');
  const naira = whole ? Number.parseInt(whole, 10) : 0;
  const fracPadded = frac.padEnd(2, '0').slice(0, 2);
  const koboFrac = fracPadded ? Number.parseInt(fracPadded, 10) : 0;

  if (Number.isNaN(naira) || Number.isNaN(koboFrac)) return 0;
  return naira * 100 + koboFrac;
}

/**
 * Regent Ledger Field — ₦ prefix pill, mono tabular-nums, blur formatting.
 * Displays Naira; parent stores integer kobo via `valueKobo` / `onChangeKobo`.
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ valueKobo, onChangeKobo, className, disabled, id, onBlur, onFocus, ...props }, ref) => {
    const [display, setDisplay] = React.useState(() => formatNairaDisplay(valueKobo));
    const [focused, setFocused] = React.useState(false);

    React.useEffect(() => {
      if (!focused) {
        setDisplay(formatNairaDisplay(valueKobo));
      }
    }, [valueKobo, focused]);

    return (
      <div
        className={cn(
          'flex h-10 w-full overflow-hidden rounded-md border border-input bg-card shadow-xs transition-colors',
          'focus-within:ring-2 focus-within:ring-ring',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        <span
          className={cn(
            'flex shrink-0 items-center px-3 text-sm font-semibold',
            'bg-brand-600 text-white dark:bg-mint-500 dark:text-forest-950',
          )}
          aria-hidden
        >
          ₦
        </span>
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={display}
          className={cn(
            'flex-1 border-0 bg-transparent px-3 py-2 text-sm text-foreground',
            'font-mono tabular-nums placeholder:text-muted-foreground',
            'focus-visible:outline-none disabled:cursor-not-allowed',
          )}
          placeholder="0.00"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            const kobo = parseNairaToKobo(display);
            onChangeKobo(kobo);
            setDisplay(formatNairaDisplay(kobo));
            onBlur?.(e);
          }}
          onChange={(e) => {
            const next = e.target.value.replace(/[^\d.,]/g, '').replace(/,/g, '');
            setDisplay(next);
            onChangeKobo(parseNairaToKobo(next));
          }}
          {...props}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = 'CurrencyInput';

/** Convenience helper for RHF transforms — Naira number → kobo integer. */
export { nairaToKobo, parseNairaToKobo };
