'use client';

import { useActivateAcademicYear } from '@loomis/api-client';
import type { AcademicYearResponse } from '@loomis/contracts';
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

interface ActivateYearDialogProps {
  tenantId: string;
  year: AcademicYearResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivateYearDialog({
  tenantId,
  year,
  open,
  onOpenChange,
}: ActivateYearDialogProps) {
  const activate = useActivateAcademicYear(tenantId, year.id);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleActivate() {
    setError(null);
    try {
      await activate.mutateAsync();
      setAcknowledged(false);
      onOpenChange(false);
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
          <DialogTitle>Activate {year.label}?</DialogTitle>
          <DialogDescription>
            {formatCalendarDate(year.startDate)} — {formatCalendarDate(year.endDate)} ·{' '}
            {year.termCount} term placeholders will be created.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTitle>Irreversible action</AlertTitle>
          <AlertDescription>
            Activating an academic year cannot be undone. Only one year may be active at a time.
            Draft term slots will be created for configuration.
          </AlertDescription>
        </Alert>

        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3">
          <Checkbox
            checked={acknowledged}
            onCheckedChange={(v) => setAcknowledged(v === true)}
            aria-describedby="activate-year-ack"
          />
          <span id="activate-year-ack" className="text-sm text-muted-foreground">
            I understand this activation is permanent and will be logged with my identity and timestamp.
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
          <Button
            variant="destructive"
            disabled={!acknowledged || activate.isPending}
            onClick={() => void handleActivate()}
          >
            {activate.isPending ? 'Activating…' : 'Activate year'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
