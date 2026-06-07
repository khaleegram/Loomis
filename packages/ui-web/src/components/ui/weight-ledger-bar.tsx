'use client';

import * as React from 'react';

import { cn } from '../../lib/utils.js';
import { Input } from './input.js';
import { Label } from './label.js';

export interface WeightLedgerBarProps {
  continuousAssessmentWeight: number;
  examWeight: number;
  onChange: (continuousAssessmentWeight: number, examWeight: number) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Regent Ledger Bar — stacked CA/Exam weight split with drag handle (Option 1).
 * Weights must sum to 100; visual segments use brand (CA) and gold (Exam).
 */
export function WeightLedgerBar({
  continuousAssessmentWeight,
  examWeight,
  onChange,
  disabled = false,
  className,
}: WeightLedgerBarProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const dragging = React.useRef(false);

  const total = continuousAssessmentWeight + examWeight;
  const isBalanced = total === 100;

  const setCaWeight = React.useCallback(
    (nextCa: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(nextCa)));
      onChange(clamped, 100 - clamped);
    },
    [onChange],
  );

  const onPointerMove = React.useCallback(
    (event: PointerEvent) => {
      if (!dragging.current || !trackRef.current || disabled) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;
      setCaWeight(ratio * 100);
    },
    [disabled, setCaWeight],
  );

  const onPointerUp = React.useCallback(() => {
    dragging.current = false;
  }, []);

  React.useEffect(() => {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>Weight ledger</span>
        <span
          className={cn(
            'font-mono tabular-nums normal-case',
            isBalanced
              ? 'text-brand-600 dark:text-mint-400'
              : total > 100
                ? 'text-destructive'
                : 'text-warning',
          )}
        >
          {total}% / 100%
          {isBalanced ? ' ✓' : total < 100 ? ` · need ${100 - total}%` : ` · over by ${total - 100}%`}
        </span>
      </div>

      <div
        ref={trackRef}
        className={cn(
          'relative h-10 overflow-hidden rounded-sm border bg-card shadow-xs',
          isBalanced ? 'border-brand-600/30 dark:border-mint-500/30' : 'border-warning/40',
          disabled && 'opacity-60',
        )}
        aria-label="Assessment weight split"
      >
        <div
          className="absolute inset-y-0 left-0 flex items-center justify-center bg-brand-600 text-[11px] font-semibold text-white transition-[width] dark:bg-mint-500 dark:text-forest-950"
          style={{ width: `${continuousAssessmentWeight}%` }}
        >
          {continuousAssessmentWeight >= 14 ? `CA ${continuousAssessmentWeight}%` : null}
        </div>
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-gold text-[11px] font-semibold text-gold-foreground dark:bg-gold-400 dark:text-forest-950"
          style={{ width: `${examWeight}%` }}
        >
          {examWeight >= 14 ? `Exam ${examWeight}%` : null}
        </div>

        {/* 100% target hairline */}
        <div
          className="pointer-events-none absolute inset-y-1 right-0 w-px bg-gold/80"
          aria-hidden
        />

        {/* Drag handle */}
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'absolute top-1/2 z-10 h-8 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-sm border-2 border-gold bg-card shadow-md',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            disabled && 'cursor-not-allowed',
          )}
          style={{ left: `${continuousAssessmentWeight}%` }}
          aria-label="Adjust CA and Exam weight split"
          onPointerDown={(e) => {
            if (disabled) return;
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ca-weight">Continuous assessment (%)</Label>
          <Input
            id="ca-weight"
            inputMode="numeric"
            disabled={disabled}
            value={continuousAssessmentWeight}
            className="font-mono tabular-nums"
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value.replace(/\D/g, ''), 10);
              setCaWeight(Number.isNaN(parsed) ? 0 : parsed);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exam-weight">Examination (%)</Label>
          <Input
            id="exam-weight"
            inputMode="numeric"
            disabled={disabled}
            value={examWeight}
            className="font-mono tabular-nums"
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value.replace(/\D/g, ''), 10);
              const clamped = Math.max(0, Math.min(100, Number.isNaN(parsed) ? 0 : parsed));
              onChange(100 - clamped, clamped);
            }}
          />
        </div>
      </div>
    </div>
  );
}
