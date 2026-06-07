'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  useAcademicTerms,
  useAcademicYears,
  useClassStructure,
  useCreateEnrollment,
} from '@loomis/api-client';
import { createEnrollmentRequest, type CreateEnrollmentRequest } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@loomis/ui-web';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';

import { defaultTermName } from '@/lib/academic/term-labels';
import { studentErrorMessage } from '@/lib/student/student-errors';
import { studentDisplayName } from '@/lib/student/student-labels';

interface EnrollStudentDialogProps {
  tenantId: string;
  studentId: string;
  studentName: string;
  hasAttestation: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnrolled?: () => void;
}

function pickActiveYearId(years: { id: string; status: string }[]): string | null {
  return years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null;
}

function pickOpenTermId(terms: { id: string; status: string }[]): string | null {
  return terms.find((t) => t.status === 'open')?.id ?? null;
}

export function EnrollStudentDialog({
  tenantId,
  studentId,
  studentName,
  hasAttestation,
  open,
  onOpenChange,
  onEnrolled,
}: EnrollStudentDialogProps) {
  const enroll = useCreateEnrollment(tenantId, studentId);
  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = pickActiveYearId(years);
  const termsQuery = useAcademicTerms(tenantId, activeYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const openTermId = pickOpenTermId(terms);
  const structureQuery = useClassStructure(tenantId, activeYearId ?? '');
  const arms = structureQuery.data?.arms ?? [];
  const levels = structureQuery.data?.levels ?? [];

  const armOptions = useMemo(
    () =>
      arms.map((arm) => {
        const level = levels.find((l) => l.id === arm.classLevelId);
        return {
          id: arm.id,
          label: level ? `${level.name} — ${arm.name}` : arm.name,
        };
      }),
    [arms, levels],
  );

  const form = useForm<CreateEnrollmentRequest>({
    resolver: zodResolver(createEnrollmentRequest) as Resolver<CreateEnrollmentRequest>,
    defaultValues: {
      termId: '',
      classArmId: '',
    },
  });

  useEffect(() => {
    if (open && openTermId) {
      form.setValue('termId', openTermId);
    }
  }, [open, openTermId, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await enroll.mutateAsync(values);
      form.reset();
      onOpenChange(false);
      onEnrolled?.();
    } catch (err) {
      form.setError('root', { message: studentErrorMessage(err) });
    }
  });

  const noOpenTerm = !yearsQuery.isLoading && !openTermId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enroll student</DialogTitle>
          <DialogDescription>
            Assign {studentName} to a class arm for the current term (US-SIS-003).
          </DialogDescription>
        </DialogHeader>

        {!hasAttestation ? (
          <Alert variant="warning">
            <AlertTitle>Identity attestation required</AlertTitle>
            <AlertDescription>
              Record identity attestation on the Documents tab before this student can become
              billable for PSF purposes.
            </AlertDescription>
          </Alert>
        ) : null}

        {noOpenTerm ? (
          <Alert variant="warning">
            <AlertTitle>No open term</AlertTitle>
            <AlertDescription>
              Open a term in{' '}
              <Link href="/school/sessions" className="font-medium underline underline-offset-2">
                Academic Sessions
              </Link>{' '}
              before enrolling students.
            </AlertDescription>
          </Alert>
        ) : null}

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="termId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Term</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || openTermId || ''}
                    disabled={noOpenTerm}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select term" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {terms
                        .filter((t) => t.status === 'open')
                        .map((term) => (
                          <SelectItem key={term.id} value={term.id}>
                            {defaultTermName(term.sequence)} ({term.status})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="classArmId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class arm</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={noOpenTerm}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class arm" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {armOptions.map((arm) => (
                        <SelectItem key={arm.id} value={arm.id}>
                          {arm.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.root.message}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={enroll.isSubmitting || noOpenTerm}>
                {enroll.isSubmitting ? 'Enrolling…' : 'Confirm enrollment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
