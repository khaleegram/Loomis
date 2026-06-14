'use client';

import type { AcademicTermResponse, AcademicYearResponse } from '@loomis/contracts';
import { Lock, Unlock } from 'lucide-react';

import { GradebookScopeBar } from '@/components/academic/ops/gradebook-scope-bar';
import type { GradebookSubjectTab } from '@/components/academic/ops/gradebook-types';
import { GRADEBOOK_UI } from '@/lib/academic/gradebook-ui';
import type { classArmOptions } from '@/lib/academic/use-academic-ops-context';
import { SEMANTIC } from '@/lib/design/surfaces';

export type { GradebookSubjectTab };

interface GradebookToolbarProps {
  years: AcademicYearResponse[];
  terms: AcademicTermResponse[];
  classArmOptions: ReturnType<typeof classArmOptions>;
  yearId: string | null;
  termId: string | null;
  classArmId: string | null;
  onYearChange: (id: string) => void;
  onTermChange: (id: string) => void;
  onClassArmChange: (id: string) => void;
  hideClassSelection?: boolean;
  subjectTabs?: GradebookSubjectTab[];
  activeSubjectId?: string | null;
  onSubjectChange?: (subjectId: string) => void;
  schemeLabel?: string | null;
  canLock?: boolean;
  isFullyLocked?: boolean;
  canSubmitLock?: boolean;
  isLocking?: boolean;
  onLock?: () => void;
}

/** Teacher score-entry chrome — scope bar + Excel-style subject sheet tabs. */
export function GradebookToolbar({
  years,
  terms,
  classArmOptions: arms,
  yearId,
  termId,
  classArmId,
  onYearChange,
  onTermChange,
  onClassArmChange,
  hideClassSelection,
  subjectTabs = [],
  activeSubjectId,
  onSubjectChange,
  schemeLabel,
  canLock,
  isFullyLocked,
  canSubmitLock,
  isLocking,
  onLock,
}: GradebookToolbarProps) {
  return (
    <div className="flex w-full flex-col gap-2">
      <GradebookScopeBar
        years={years}
        terms={terms}
        classArmOptions={arms}
        yearId={yearId}
        termId={termId}
        classArmId={classArmId}
        onYearChange={onYearChange}
        onTermChange={onTermChange}
        onClassArmChange={onClassArmChange}
        hideClassSelection={hideClassSelection}
        trailing={
          <>
            {schemeLabel ? (
              <span className="hidden text-[11px] text-neutral-500 xl:inline">{schemeLabel}</span>
            ) : null}
            {canLock && onLock ? (
              <button
                type="button"
                disabled={isFullyLocked || !canSubmitLock || isLocking}
                onClick={onLock}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isFullyLocked
                    ? 'border-accent-green-300 bg-accent-green-50 text-accent-green-800'
                    : `${SEMANTIC.cta.primary} border-transparent`
                }`}
              >
                {isFullyLocked ? (
                  <>
                    <Lock aria-hidden className="size-3.5" />
                    Locked
                  </>
                ) : (
                  <>
                    <Unlock aria-hidden className="size-3.5" />
                    {isLocking ? 'Locking…' : 'Lock sheet'}
                  </>
                )}
              </button>
            ) : null}
          </>
        }
      />

      {subjectTabs.length > 0 && onSubjectChange ? (
        <div
          className="flex gap-0.5 overflow-x-auto border-t border-neutral-200/80 pt-1.5 scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Subject sheets"
        >
          {subjectTabs.map((tab) => {
            const active = tab.subjectId === activeSubjectId;
            return (
              <button
                key={tab.subjectId}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSubjectChange(tab.subjectId)}
                className={active ? GRADEBOOK_UI.tabActive : GRADEBOOK_UI.tabInactive}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
