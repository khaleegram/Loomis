'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  cn,
} from '@loomis/ui-web';
import { Check } from 'lucide-react';

import { ARM_LETTERS } from '@/lib/academic/default-class-ladder';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

interface ArmLetterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  levelName: string;
  /** Arm names that already exist for this class (cannot be unticked here). */
  existing: string[];
  pending?: boolean;
  onSave: (letters: string[]) => void;
}

/**
 * The "how many arms?" popup. Letters are shown as big tap targets (A B C D…),
 * the school taps the ones they run, then saves. Arms that already exist are locked
 * on so we never silently drop a class that may have students.
 */
export function ArmLetterDialog({
  open,
  onOpenChange,
  levelName,
  existing,
  pending,
  onSave,
}: ArmLetterDialogProps) {
  const existingSet = new Set(existing);
  const [selected, setSelected] = useState<Set<string>>(new Set(existing));

  useEffect(() => {
    if (open) setSelected(new Set(existing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, levelName]);

  function toggle(letter: string) {
    if (existingSet.has(letter)) return; // locked
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(ARM_LETTERS));
  }

  const count = selected.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Arms for {levelName}</DialogTitle>
          <DialogDescription>
            Tap each arm this class is split into. For example A and B make {levelName} A and{' '}
            {levelName} B.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold text-neutral-500">
            {count === 0 ? 'No arms selected' : `${count} arm${count > 1 ? 's' : ''} selected`}
          </p>
          <button
            type="button"
            onClick={selectAll}
            className="text-[12px] font-semibold text-brand-700 hover:underline"
          >
            Select all
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {ARM_LETTERS.map((letter) => {
            const isSelected = selected.has(letter);
            const isLocked = existingSet.has(letter);
            return (
              <button
                key={letter}
                type="button"
                onClick={() => toggle(letter)}
                aria-pressed={isSelected}
                className={cn(
                  'relative flex h-16 items-center justify-center rounded-2xl border text-xl font-extrabold transition duration-150',
                  isSelected
                    ? 'border-brand-400 bg-brand-50 text-brand-900 shadow-sm ring-1 ring-brand-200/60'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-brand-200 hover:bg-brand-50/40',
                  isLocked && 'cursor-default opacity-90',
                )}
              >
                {letter}
                {isSelected ? (
                  <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check aria-hidden className="size-2.5" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {existing.length > 0 ? (
          <p className="text-[11px] text-neutral-400">
            {existing.join(', ')} already exist and stay on.
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={ACADEMIC_UI.btnSecondary}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || count === 0}
            onClick={() => onSave([...selected])}
            className={ACADEMIC_UI.btnPrimary}
          >
            {pending ? 'Saving…' : 'Save arms'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
