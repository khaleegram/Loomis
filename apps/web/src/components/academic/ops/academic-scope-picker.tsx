'use client';

import { Badge, cn } from '@loomis/ui-web';
import { CalendarDays, GraduationCap } from 'lucide-react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useSchoolAcademic } from '@/lib/academic/school-academic-context';
import { classArmOptions } from '@/lib/academic/use-academic-ops-context';

type WorkflowStep = 'class' | 'build' | 'publish';

interface AcademicScopePickerProps {
  classArmOptions: ReturnType<typeof classArmOptions>;
  classArmId: string | null;
  onClassArmChange: (id: string) => void;
  /** Builder workflow highlight (timetable, attendance, etc.) */
  workflowStep?: WorkflowStep;
  showWorkflow?: boolean;
  /** Optional stats shown on selected class pill area */
  selectedClassMeta?: string | null;
  hideClassSelection?: boolean;
}

const WORKFLOW: { key: WorkflowStep; label: string }[] = [
  { key: 'class', label: 'Choose class' },
  { key: 'build', label: 'Build schedule' },
  { key: 'publish', label: 'Publish' },
];

function termStatusLabel(status: string): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'census_locked':
      return 'Census locked';
    case 'closed':
      return 'Closed';
    default:
      return 'Draft';
  }
}

function termStatusClass(status: string): string {
  switch (status) {
    case 'open':
      return 'border-accent-green-100 bg-accent-green-50 text-accent-green-700';
    case 'census_locked':
      return 'border-gold-200 bg-gold-50 text-gold-800';
    case 'closed':
      return 'border-neutral-200 bg-neutral-100 text-neutral-600';
    default:
      return 'border-brand-200 bg-brand-50 text-brand-800';
  }
}

/** Class scope bar — session (year/term) is global in the app bar. */
export function AcademicScopePicker({
  classArmOptions: armOptions,
  classArmId,
  onClassArmChange,
  workflowStep = 'class',
  showWorkflow = false,
  selectedClassMeta,
  hideClassSelection = false,
}: AcademicScopePickerProps) {
  const { activeYear, activeTerm } = useSchoolAcademic();
  const activeArm = armOptions.find((a) => a.id === classArmId) ?? null;
  const workflowIndex = WORKFLOW.findIndex((s) => s.key === workflowStep);

  return (
    <div className={`mb-6 overflow-hidden ${ACADEMIC_UI.dataPanel}`}>
      {showWorkflow ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-brand-50 bg-brand-50/20 px-4 py-3 sm:px-5">
          {WORKFLOW.map((step, index) => {
            const isActive = index === workflowIndex;
            const isDone = index < workflowIndex;
            return (
              <div key={step.key} className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-[11px] font-bold',
                    isDone && 'bg-brand-600 text-neutral-900',
                    isActive && 'bg-brand-500 text-neutral-900 ring-2 ring-brand-300 ring-offset-1',
                    !isDone && !isActive && 'bg-neutral-200 text-neutral-500',
                  )}
                >
                  {isDone ? '✓' : index + 1}
                </span>
                <span
                  className={cn(
                    'text-[12px] font-semibold',
                    isActive ? 'text-neutral-900' : 'text-neutral-400',
                  )}
                >
                  {step.label}
                </span>
                {index < WORKFLOW.length - 1 ? (
                  <span className="mx-1 hidden text-neutral-300 sm:inline" aria-hidden>
                    →
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className={ACADEMIC_UI.sectionLabel}>You are viewing</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-brand-200/80 bg-white px-3 py-2 sm:min-h-0">
                <CalendarDays aria-hidden className="size-4 shrink-0 text-brand-600" />
                <span className="text-[13px] font-bold text-neutral-900">
                  {activeYear?.label ?? 'No year'}
                  {activeTerm ? ` · ${activeTerm.name}` : ''}
                </span>
                {activeTerm ? (
                  <Badge
                    variant="outline"
                    className={cn('ml-1 text-[10px] font-bold', termStatusClass(activeTerm.status))}
                  >
                    {termStatusLabel(activeTerm.status)}
                  </Badge>
                ) : null}
              </span>

              {!hideClassSelection ? (
                activeArm ? (
                  <span className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-brand-300 bg-brand-50/50 px-3 py-2 sm:min-h-0">
                    <GraduationCap aria-hidden className="size-4 text-brand-700" />
                    <span className="text-[13px] font-extrabold text-neutral-900">{activeArm.label}</span>
                    {selectedClassMeta ? (
                      <span className="text-[11px] font-medium text-neutral-500">{selectedClassMeta}</span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-[13px] text-neutral-400">Select a class below</span>
                )
              ) : null}
            </div>
          </div>
        </div>

        {!hideClassSelection && armOptions.length > 0 ? (
          <div className="mt-5">
            <p className={ACADEMIC_UI.sectionLabel}>Classes — tap to switch</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {armOptions.map((arm) => {
                const selected = arm.id === classArmId;
                return (
                  <button
                    key={arm.id}
                    type="button"
                    onClick={() => onClassArmChange(arm.id)}
                    className={cn(
                      'shrink-0 rounded-xl px-4 py-2.5 text-[12px] font-bold transition-all duration-200 min-h-[44px] sm:min-h-0',
                      selected ? ACADEMIC_UI.chipActive : ACADEMIC_UI.chipInactive,
                    )}
                  >
                    {arm.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
