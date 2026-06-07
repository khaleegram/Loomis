'use client';

import * as React from 'react';

import { cn } from '../../lib/utils.js';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  /** Keyboard shortcut hint shown in the UI */
  shortcut?: string;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedControlOption<T>[];
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

/**
 * Accessible segmented control for mutually exclusive choices (e.g. P/A/L attendance).
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  disabled = false,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  const groupRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!groupRef.current?.contains(document.activeElement)) return;
      const shortcutMap = new Map(
        options
          .filter((o) => o.shortcut)
          .map((o) => [o.shortcut!.toLowerCase(), o.value] as const),
      );
      const match = shortcutMap.get(event.key);
      if (match) {
        event.preventDefault();
        onValueChange(match);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onValueChange, options]);

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex rounded-sm border bg-muted/40 p-0.5',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'rounded-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              selected
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {option.label}
            {option.shortcut ? (
              <span className="ml-1 hidden font-mono text-[10px] opacity-70 sm:inline">
                {option.shortcut}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
