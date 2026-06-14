'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { GradebookEntryResponse } from '@loomis/contracts';
import { requestGradeCorrectionRequest, type RequestGradeCorrectionRequest } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@loomis/ui-web';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

interface GradeCorrectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: GradebookEntryResponse | null;
  caWeight: number;
  examWeight: number;
  onSubmit: (values: RequestGradeCorrectionRequest) => Promise<void>;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export function GradeCorrectionSheet({
  open,
  onOpenChange,
  entry,
  caWeight,
  examWeight,
  onSubmit,
  isSubmitting,
  errorMessage,
}: GradeCorrectionSheetProps) {
  const form = useForm<RequestGradeCorrectionRequest>({
    resolver: zodResolver(requestGradeCorrectionRequest),
    defaultValues: {
      continuousAssessmentScore: 0,
      examScore: 0,
      reason: '',
    },
  });

  useEffect(() => {
    if (entry && open) {
      form.reset({
        continuousAssessmentScore: entry.continuousAssessmentScore,
        examScore: entry.examScore,
        reason: '',
      });
    }
  }, [entry, open, form]);

  if (!entry) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Request grade correction</SheetTitle>
          <SheetDescription>
            Submit corrected scores for exam officer review (US-ACA-003). Original values are preserved in the audit log.
          </SheetDescription>
        </SheetHeader>

        <div className="my-4 rounded-sm border bg-muted/30 p-3 text-sm">
          <p className="text-muted-foreground">Current record</p>
          <dl className="mt-2 grid grid-cols-3 gap-2 font-mono tabular-nums">
            <div>
              <dt className="text-xs text-muted-foreground">CA</dt>
              <dd>{entry.continuousAssessmentScore}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Exam</dt>
              <dd>{entry.examScore}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Total</dt>
              <dd>{entry.totalScore}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            Max scores: CA /{caWeight} · Exam /{examWeight} · Total /100
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
              onOpenChange(false);
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="continuousAssessmentScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Corrected CA score</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      inputMode="numeric"
                      onChange={(e) =>
                        field.onChange(Number.parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="examScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Corrected exam score</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      inputMode="numeric"
                      onChange={(e) =>
                        field.onChange(Number.parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for correction</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} placeholder="Describe the error and supporting context." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {errorMessage ? (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}

            <SheetFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Submit correction request'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
