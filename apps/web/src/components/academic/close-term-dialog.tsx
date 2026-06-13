'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoomisClientError, useCloseTerm } from '@loomis/api-client';
import { closeTermRequest, type AcademicTermResponse } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@loomis/ui-web';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

const closeFormSchema = closeTermRequest.extend({
  acknowledged: z.boolean().refine((v) => v, {
    message: 'Confirm you understand enrollment records will be locked.',
  }),
});

type CloseFormValues = z.infer<typeof closeFormSchema>;

interface CloseTermDialogProps {
  tenantId: string;
  yearId: string;
  term: AcademicTermResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CloseTermDialog({
  tenantId,
  yearId,
  term,
  open,
  onOpenChange,
}: CloseTermDialogProps) {
  const closeTerm = useCloseTerm(tenantId, yearId, term.id);
  const [serverBlockers, setServerBlockers] = useState<{
    financial?: string[];
    operational?: string[];
  } | null>(null);

  const form = useForm<CloseFormValues>({
    resolver: zodResolver(closeFormSchema),
    defaultValues: {
      overrideReason: '',
      acknowledged: false,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerBlockers(null);
    try {
      const body =
        values.overrideReason && values.overrideReason.length >= 3
          ? { overrideReason: values.overrideReason }
          : {};
      await closeTerm.mutateAsync(body);
      form.reset();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof LoomisClientError && err.details) {
        setServerBlockers({
          financial: Array.isArray(err.details.financialBlockers)
            ? (err.details.financialBlockers as string[])
            : undefined,
          operational: Array.isArray(err.details.operationalBlockers)
            ? (err.details.operationalBlockers as string[])
            : undefined,
        });
      }
      form.setError('root', { message: academicErrorMessage(err) });
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          form.reset();
          setServerBlockers(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Close {term.name}?</DialogTitle>
          <DialogDescription>
            Enrollments for this term will be locked permanently. Report cards become available after
            closure.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTitle>Immutable enrollment lock</AlertTitle>
          <AlertDescription>
            Closing a term cannot be reversed. Financial blockers (unsettled PSF, unverified payments)
            can never be overridden at the school level.
          </AlertDescription>
        </Alert>

        {serverBlockers?.financial?.length ? (
          <Alert variant="destructive">
            <AlertTitle>Financial blockers</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {serverBlockers.financial.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        {serverBlockers?.operational?.length ? (
          <Alert variant="warning">
            <AlertTitle>Operational blockers</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {serverBlockers.operational.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="mt-2">You may document an override reason below if your role permits.</p>
            </AlertDescription>
          </Alert>
        ) : null}

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="overrideReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Override reason (if required)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Document why non-financial blockers are acknowledged"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="acknowledged"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 rounded-md border border-border p-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value === true}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="font-normal">
                      I understand enrollments will be locked and this action is permanent.
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            {form.formState.errors.root ? (
              <Alert variant="destructive">
                <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter className="gap-2 sm:justify-end">
              <button type="button" onClick={() => onOpenChange(false)} className={ACADEMIC_UI.btnSecondary}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={closeTerm.isPending}
                className="inline-flex h-10 items-center rounded-lg border border-red-200 bg-red-50 px-5 text-[14px] font-medium text-red-800 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                {closeTerm.isPending ? 'Closing…' : 'Close term'}
              </button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
