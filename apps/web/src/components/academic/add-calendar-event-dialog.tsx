'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@loomis/ui-web';
import { useCreateCalendarEvent } from '@loomis/api-client';
import type { AcademicTermResponse, CalendarEventType } from '@loomis/contracts';

import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SEMANTIC } from '@/lib/design/surfaces';

const EVENT_TYPES: { value: CalendarEventType; label: string }[] = [
  { value: 'holiday', label: 'Holiday / break' },
  { value: 'meeting', label: 'Meeting / PTA' },
  { value: 'activity', label: 'Activity / event' },
  { value: 'exam', label: 'Exam' },
  { value: 'resumption', label: 'Resumption' },
  { value: 'other', label: 'Other' },
];

const inputClass =
  'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[14px] outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-200/50';

interface AddCalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  academicYearId: string;
  terms: AcademicTermResponse[];
  defaultTermId?: string | null;
}

/** School diary entry form: title, type, date(s), optional term, note. */
export function AddCalendarEventDialog({
  open,
  onOpenChange,
  tenantId,
  academicYearId,
  terms,
  defaultTermId,
}: AddCalendarEventDialogProps) {
  const createEvent = useCreateCalendarEvent(tenantId);

  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<CalendarEventType>('holiday');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [termId, setTermId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle('');
      setEventType('holiday');
      setStartDate('');
      setEndDate('');
      setTermId(defaultTermId ?? '');
      setDescription('');
      setError(null);
    }
  }, [open, defaultTermId]);

  async function handleSave() {
    setError(null);
    if (!title.trim()) {
      setError('Give the event a name.');
      return;
    }
    if (!startDate) {
      setError('Pick a date for the event.');
      return;
    }
    if (endDate && endDate < startDate) {
      setError('The end date cannot be before the start date.');
      return;
    }
    try {
      await createEvent.mutateAsync({
        academicYearId,
        termId: termId || null,
        title: title.trim(),
        description: description.trim() || null,
        eventType,
        startDate,
        endDate: endDate || null,
      });
      onOpenChange(false);
    } catch (err) {
      setError(academicErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a calendar event</DialogTitle>
          <DialogDescription>
            Add holidays, PTA meetings, sports day, or any school date. It shows on the calendar
            for everyone.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className={`rounded-xl border p-3 text-sm ${SEMANTIC.danger.surface}`}>{error}</div>
        ) : null}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-neutral-600">
              Event name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mid-term break"
              className={inputClass}
              maxLength={200}
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-neutral-600">Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as CalendarEventType)}
              className={inputClass}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-neutral-600">Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-neutral-600">
                Ends (optional)
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {terms.length > 0 ? (
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-neutral-600">
                Term (optional)
              </label>
              <select
                value={termId}
                onChange={(e) => setTermId(e.target.value)}
                className={inputClass}
              >
                <option value="">Whole year</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-neutral-600">
              Note (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything parents and staff should know"
              rows={2}
              maxLength={1000}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[14px] outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-200/50"
            />
          </div>
        </div>

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
            disabled={createEvent.isPending}
            onClick={() => void handleSave()}
            className={ACADEMIC_UI.btnPrimary}
          >
            {createEvent.isPending ? 'Saving...' : 'Add event'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
