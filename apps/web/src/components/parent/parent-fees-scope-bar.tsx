'use client';

import type { ParentChildCardResponse } from '@loomis/contracts';
import { cn } from '@loomis/ui-web';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { parentChildSelectorLabel } from '@/lib/student/parent-child-labels';

interface ParentFeesScopeBarProps {
  cards: ParentChildCardResponse[];
  activeStudentId: string | null;
  onSelectChild: (studentId: string) => void;
  terms: { id: string; name: string }[];
  termId: string | null;
  onSelectTerm: (termId: string) => void;
}

export function ParentFeesScopeBar({
  cards,
  activeStudentId,
  onSelectChild,
  terms,
  termId,
  onSelectTerm,
}: ParentFeesScopeBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
          You are viewing
        </p>
        <div className={ACADEMIC_UI.chipBar}>
          {cards.map((card) => {
            const active = card.studentId === activeStudentId;
            return (
              <button
                key={card.studentId}
                type="button"
                className={cn(
                  'shrink-0 whitespace-nowrap transition-all duration-200',
                  active ? ACADEMIC_UI.chipActive : ACADEMIC_UI.chipInactive,
                )}
                onClick={() => onSelectChild(card.studentId)}
              >
                {parentChildSelectorLabel(card)}
              </button>
            );
          })}
        </div>
      </div>

      {terms.length > 0 ? (
        <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Term</span>
          <select
            value={termId ?? ''}
            onChange={(e) => onSelectTerm(e.target.value)}
            className="h-10 min-w-[10rem] rounded-xl bg-muted/40 px-3 text-[13px] font-semibold text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-transparent focus:outline-none focus:ring-brand-200/80"
          >
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
