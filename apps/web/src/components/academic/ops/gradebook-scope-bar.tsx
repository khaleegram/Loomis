'use client';

import { SmartSearchSelect } from '@loomis/ui-web';
import { Search, X } from 'lucide-react';

import { GRADEBOOK_UI } from '@/lib/academic/gradebook-ui';
import { classArmOptions } from '@/lib/academic/use-academic-ops-context';

interface GradebookScopeBarProps {
  classArmOptions: ReturnType<typeof classArmOptions>;
  classArmId: string | null;
  onClassArmChange: (id: string) => void;
  hideClassSelection?: boolean;
  studentSearch?: string;
  onStudentSearchChange?: (query: string) => void;
  trailing?: React.ReactNode;
}

/** Class scope only — year/term are enforced globally in the school app bar. */
export function GradebookScopeBar({
  classArmOptions: arms,
  classArmId,
  onClassArmChange,
  hideClassSelection,
  studentSearch = '',
  onStudentSearchChange,
  trailing,
}: GradebookScopeBarProps) {
  const trigger = GRADEBOOK_UI.scopeTrigger;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!hideClassSelection ? (
        <SmartSearchSelect
          value={classArmId}
          onValueChange={(id) => id && onClassArmChange(id)}
          options={arms.map((arm) => ({ value: arm.id, label: arm.label, keywords: arm.label }))}
          placeholder="Class"
          searchPlaceholder="Search class…"
          triggerClassName={`${trigger} max-w-[11rem]`}
          contentClassName="z-[250]"
        />
      ) : null}
      {onStudentSearchChange ? (
        <div className="relative min-w-0 flex-1 basis-36 sm:max-w-[14rem]">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="search"
            value={studentSearch}
            onChange={(e) => onStudentSearchChange(e.target.value)}
            placeholder="Search students…"
            className={`${trigger} h-8 w-full pl-7 pr-7 text-[11px] shadow-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15`}
            aria-label="Search students by name or admission number"
          />
          {studentSearch ? (
            <button
              type="button"
              onClick={() => onStudentSearchChange('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-neutral-400 hover:text-neutral-600"
              aria-label="Clear student search"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </div>
      ) : null}
      {trailing ? <div className="ml-auto flex flex-wrap items-center gap-2">{trailing}</div> : null}
    </div>
  );
}
