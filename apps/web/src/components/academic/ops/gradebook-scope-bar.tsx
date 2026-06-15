'use client';

import { SmartSearchSelect } from '@loomis/ui-web';

import { GRADEBOOK_UI } from '@/lib/academic/gradebook-ui';
import { classArmOptions } from '@/lib/academic/use-academic-ops-context';

interface GradebookScopeBarProps {
  classArmOptions: ReturnType<typeof classArmOptions>;
  classArmId: string | null;
  onClassArmChange: (id: string) => void;
  hideClassSelection?: boolean;
  trailing?: React.ReactNode;
}

/** Class scope only — year/term are enforced globally in the school app bar. */
export function GradebookScopeBar({
  classArmOptions: arms,
  classArmId,
  onClassArmChange,
  hideClassSelection,
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
      {trailing ? <div className="ml-auto flex flex-wrap items-center gap-2">{trailing}</div> : null}
    </div>
  );
}
