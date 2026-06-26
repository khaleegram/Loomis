'use client';

import { useState } from 'react';
import { Users, ArrowRight, AlertTriangle } from 'lucide-react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { cn } from '@loomis/ui-web';

interface PromotionAutoStagePanelProps {
  studentCount: number;
  fromYearLabel: string;
  toYearLabel: string;
  onAutoStage: () => Promise<void>;
  onReviewExceptions: () => void;
  disabled?: boolean;
  pending?: boolean;
}

/**
 * Exception-based promotion: default is "everyone moves up".
 * Admin only handles repeat / graduate exceptions.
 */
export function PromotionAutoStagePanel({
  studentCount,
  fromYearLabel,
  toYearLabel,
  onAutoStage,
  onReviewExceptions,
  disabled,
  pending,
}: PromotionAutoStagePanelProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleAutoStage() {
    setError(null);
    try {
      await onAutoStage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not stage promotions.');
    }
  }

  return (
    <div className="card space-y-4 rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-200/60">
          <Users aria-hidden className="size-6" />
        </span>
        <div>
          <p className={ACADEMIC_UI.sectionLabel}>Year-end movement</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-neutral-900">
            Move everyone up one class
          </h2>
          <p className="mt-1.5 text-[14px] text-neutral-500">
            {studentCount} enrolled students move from {fromYearLabel} to {toYearLabel} based on your
            class ladder. You only need to mark exceptions — repeat class or graduation.
          </p>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={disabled || pending || studentCount === 0}
          onClick={() => void handleAutoStage()}
          className={cn(ACADEMIC_UI.btnPrimary, 'justify-center')}
        >
          {pending ? 'Staging…' : `Promote all ${studentCount} students`}
          <ArrowRight aria-hidden className="size-4" />
        </button>
        <button
          type="button"
          onClick={onReviewExceptions}
          disabled={disabled}
          className={cn(ACADEMIC_UI.btnSecondary, 'justify-center')}
        >
          Review exceptions only
        </button>
      </div>
    </div>
  );
}
