'use client';

import { Check, Circle, XCircle } from 'lucide-react';
import { cn } from '@loomis/ui-web';

interface ClosureCheckItem {
  id: string;
  label: string;
  passed: boolean;
  blocker?: boolean;
  detail?: string;
}

interface TermClosureChecklistProps {
  items: ClosureCheckItem[];
  loading?: boolean;
}

/** Blocker-first term closing - green checks and red blockers, plain language. */
export function TermClosureChecklist({ items, loading }: TermClosureChecklistProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-neutral-100" />
        ))}
      </div>
    );
  }

  const blockers = items.filter((i) => !i.passed && i.blocker);
  const warnings = items.filter((i) => !i.passed && !i.blocker);
  const passed = items.filter((i) => i.passed);

  return (
    <div className="space-y-4">
      <p className="text-[13px] font-semibold text-neutral-700">
        {blockers.length === 0
          ? warnings.length === 0
            ? 'All checks passed - you can close this term.'
            : `${warnings.length} item${warnings.length === 1 ? '' : 's'} may need attention.`
          : `${blockers.length} blocker${blockers.length === 1 ? '' : 's'} must be fixed first.`}
      </p>

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              'flex items-start gap-3 rounded-xl border px-4 py-3',
              item.passed && 'border-emerald-200/80 bg-emerald-50/50',
              !item.passed && item.blocker && 'border-red-200/80 bg-red-50/50',
              !item.passed && !item.blocker && 'border-amber-200/80 bg-amber-50/50',
            )}
          >
            {item.passed ? (
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            ) : item.blocker ? (
              <XCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-red-600" />
            ) : (
              <Circle aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-500" />
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-neutral-900">{item.label}</p>
              {item.detail ? (
                <p className="mt-0.5 text-[12px] text-neutral-500">{item.detail}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {passed.length > 0 && blockers.length === 0 ? (
        <p className="text-[12px] text-emerald-700">
          {passed.length} of {items.length} requirements met.
        </p>
      ) : null}
    </div>
  );
}

/** Build checklist items from term closure preview API response. */
export function buildClosureChecklistFromPreview(preview: {
  canCloseWithoutOverride: boolean;
  financialBlockers: string[];
  operationalBlockers: string[];
}): ClosureCheckItem[] {
  const items: ClosureCheckItem[] = [
    {
      id: 'results',
      label: 'Results published',
      passed: !preview.operationalBlockers.some((b) =>
        b.toLowerCase().includes('result') || b.toLowerCase().includes('gradebook'),
      ),
      blocker: true,
      detail: preview.operationalBlockers.find((b) =>
        b.toLowerCase().includes('result') || b.toLowerCase().includes('gradebook'),
      ),
    },
    {
      id: 'gradebook',
      label: 'Gradebook locked',
      passed: !preview.operationalBlockers.some((b) => b.toLowerCase().includes('gradebook')),
      blocker: true,
      detail: preview.operationalBlockers.find((b) => b.toLowerCase().includes('gradebook')),
    },
    {
      id: 'payments',
      label: 'Payments reconciled',
      passed: preview.financialBlockers.length === 0,
      blocker: true,
      detail: preview.financialBlockers[0],
    },
    {
      id: 'corrections',
      label: 'Grade corrections resolved',
      passed: !preview.operationalBlockers.some((b) => b.toLowerCase().includes('correction')),
      blocker: false,
      detail: preview.operationalBlockers.find((b) => b.toLowerCase().includes('correction')),
    },
  ];
  return items;
}
