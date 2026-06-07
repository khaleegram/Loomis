import { X } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { Button } from './button.js';

export interface FilterChip {
  key: string;
  label: string;
  value: string;
}

export interface FilterChipBarProps {
  chips: FilterChip[];
  onRemove: (key: string) => void;
  onClearAll?: () => void;
  className?: string;
}

/** Active filter chips for investigator-style search bars. */
export function FilterChipBar({ chips, onRemove, onClearAll, className }: FilterChipBarProps) {
  if (chips.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Active:</span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-sm border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs text-brand-700 dark:border-forest-700 dark:bg-forest-800 dark:text-mint-400"
        >
          <span className="font-medium">{chip.label}:</span>
          <span>{chip.value}</span>
          <button
            type="button"
            onClick={() => onRemove(chip.key)}
            className="rounded-sm p-0.5 hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-forest-700"
            aria-label={`Remove ${chip.label} filter`}
          >
            <X aria-hidden className="size-3" />
          </button>
        </span>
      ))}
      {onClearAll ? (
        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClearAll}>
          Clear all
        </Button>
      ) : null}
    </div>
  );
}
