'use client';

import type { AttendanceStatus } from '@loomis/contracts';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AttendanceStatusToggle } from '@/components/academic/ops/attendance-status-toggle';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { ATTENDANCE_STATUS_META } from '@/lib/academic/attendance-labels';
import { SEMANTIC, SURFACES } from '@/lib/design/surfaces';
import { studentDisplayName } from '@/lib/student/student-labels';

const amendSchema = z.object({
  status: z.enum(['present', 'absent', 'late', 'excused']),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(500),
});

type AmendForm = z.infer<typeof amendSchema>;

interface AttendanceAmendSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firstName: string;
  lastName: string;
  admissionNo: string;
  currentStatus: AttendanceStatus;
  isSubmitting?: boolean;
  onSubmit: (values: AmendForm) => Promise<void>;
}

export function AttendanceAmendSheet({
  open,
  onOpenChange,
  firstName,
  lastName,
  admissionNo,
  currentStatus,
  isSubmitting,
  onSubmit,
}: AttendanceAmendSheetProps) {
  const form = useForm<AmendForm>({
    resolver: zodResolver(amendSchema),
    defaultValues: { status: currentStatus, reason: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ status: currentStatus, reason: '' });
    }
  }, [open, currentStatus, form]);

  const selectedStatus = form.watch('status');
  const statusMeta = ATTENDANCE_STATUS_META[selectedStatus];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <div className="border-b border-brand-100/40 px-6 py-5" style={{ background: SURFACES.hero }}>
          <SheetHeader className="space-y-2 text-left">
            <p className={ACADEMIC_UI.sectionLabel}>Audit logged amendment</p>
            <SheetTitle className="text-xl font-extrabold tracking-tight text-neutral-900">
              Correct attendance
            </SheetTitle>
            <SheetDescription className="text-[13px] text-neutral-600">
              {studentDisplayName(firstName, lastName)} · {admissionNo}
            </SheetDescription>
          </SheetHeader>
        </div>

        <Form {...form}>
          <form
            className="flex flex-1 flex-col"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
              form.reset({ status: values.status, reason: '' });
              onOpenChange(false);
            })}
          >
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
              <div className={`rounded-xl border px-4 py-3 ${SEMANTIC.warning.surfaceSubtle}`}>
                <div className="flex gap-2">
                  <ShieldCheck aria-hidden className={`mt-0.5 size-4 shrink-0 ${SEMANTIC.warning.text}`} />
                  <p className={`text-[12px] leading-relaxed ${SEMANTIC.warning.textStrong}`}>
                    Same-day corrections require a reason and are written to the audit trail.
                  </p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12px] font-bold uppercase tracking-wide text-neutral-400">
                      New status
                    </FormLabel>
                    <FormControl>
                      <AttendanceStatusToggle
                        value={field.value}
                        onChange={field.onChange}
                        aria-label="Amended attendance status"
                      />
                    </FormControl>
                    <p className={`text-[12px] font-medium ${statusMeta.textClass}`}>
                      Selected: {statusMeta.label}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12px] font-bold uppercase tracking-wide text-neutral-400">
                      Reason for change
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="e.g. Student arrived after register was submitted; verified with parent."
                        className="rounded-xl border-neutral-200 bg-white text-[13px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-2 border-t border-neutral-100 bg-white px-6 py-4">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <button type="submit" disabled={isSubmitting} className={`${ACADEMIC_UI.btnPrimary} flex-1 justify-center`}>
                {isSubmitting ? (
                  <>
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save amendment'
                )}
              </button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
