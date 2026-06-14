'use client';

import type { AcademicTermResponse, AcademicYearResponse } from '@loomis/contracts';
import { SmartSearchSelect } from '@loomis/ui-web';

import { GRADEBOOK_UI } from '@/lib/academic/gradebook-ui';
import { classArmOptions } from '@/lib/academic/use-academic-ops-context';

interface GradebookScopeBarProps {
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
  trailing?: React.ReactNode;
}

/** Searchable year / term / class scope — shared by gradebook and report cards. */
export function GradebookScopeBar({
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
  trailing,
}: GradebookScopeBarProps) {
  const trigger = GRADEBOOK_UI.scopeTrigger;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SmartSearchSelect
        value={yearId}
        onValueChange={(id) => id && onYearChange(id)}
        options={years.map((y) => ({ value: y.id, label: y.label, keywords: y.label }))}
        placeholder="Year"
        searchPlaceholder="Search year…"
        triggerClassName={trigger}
        contentClassName="z-[250]"
      />
      <SmartSearchSelect
        value={termId}
        onValueChange={(id) => id && onTermChange(id)}
        options={terms.map((t) => ({ value: t.id, label: t.name, keywords: t.name }))}
        placeholder="Term"
        searchPlaceholder="Search term…"
        disabled={terms.length === 0}
        triggerClassName={trigger}
        contentClassName="z-[250]"
      />
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
      {trailing ? <div className="ml-auto flex flex-wrap items-center gap-2">{trailing}</div> : null}
    </div>
  );
}
