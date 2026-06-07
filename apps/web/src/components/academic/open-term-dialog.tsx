'use client';

import type { AcademicTermResponse } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@loomis/ui-web';
import { useState } from 'react';

import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { formatCalendarDate } from '@/lib/academic/term-labels';

interface OpenTermDialogProps {
  term: AcademicTermResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: () => Promise<void>;
}

export function OpenTermDialog({
  term,
  open,
  onOpenChange,
  isPending,
  onConfirm,
}: OpenTermDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      await onConfirm();
      setAcknowledged(false);
    } catch (err) {
      setError(academicErrorMessage(err));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setAcknowledged(false);
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Open {term.name}?</DialogTitle>
          <DialogDescription>
            Census lock: {formatCalendarDate(term.censusLockDate)} · Only one term may be open per
            year.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="warning">
          <AlertTitle>Operational go-live</AlertTitle>
          <AlertDescription>
            Opening a term enables enrollments, attendance, and gradebook activity for this period.
            Ensure dates and enrollment windows are correct before proceeding.
          </AlertDescription>
        </Alert>

        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3">
          <Checkbox
            checked={acknowledged}
            onCheckedChange={(v) => setAcknowledged(v === true)}
          />
          <span className="text-sm text-muted-foreground">
            I confirm this term is configured correctly and ready for school operations.
          </span>
        </label>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!acknowledged || isPending} onClick={() => void handleConfirm()}>
            {isPending ? 'Opening…' : 'Open term'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
