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
  Dialog,
  DialogContent,
  Form,
  FormField,
  FormItem,
  FormMessage,
  cn,
} from '@loomis/ui-web';
import { GraduationCap, ShieldCheck, ShieldOff } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';

import {
  CardOptionPicker,
  FormContextCard,
  SmartFieldLabel,
  SmartFormFooter,
  SmartFormHeader,
  SmartHint,
} from '@/components/shared/smart-form';
import { formatClassArmLabel } from '@/lib/academic/ops-labels';
import { defaultTermName } from '@/lib/academic/term-labels';
import { studentErrorMessage } from '@/lib/student/student-errors';

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
  const activeYear = years.find((y) => y.id === activeYearId) ?? null;
  const termsQuery = useAcademicTerms(tenantId, activeYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const openTermId = pickOpenTermId(terms);
  const openTerm = terms.find((t) => t.id === openTermId) ?? null;
  const structureQuery = useClassStructure(tenantId, activeYearId ?? '');
  const arms = structureQuery.data?.arms ?? [];
  const levels = structureQuery.data?.levels ?? [];

  const armOptions = useMemo(
    () =>
      arms.map((arm) => ({
        id: arm.id,
        label: formatClassArmLabel(arm, levels),
      })),
    [arms, levels],
  );

  const form = useForm<CreateEnrollmentRequest>({
    resolver: zodResolver(createEnrollmentRequest) as Resolver<CreateEnrollmentRequest>,
    defaultValues: {
      termId: '',
      classArmId: '',
    },
  });

  const selectedArmId = form.watch('classArmId');
  const selectedArmLabel = armOptions.find((a) => a.id === selectedArmId)?.label;

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
      <DialogContent className="flex max-h-[min(92vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SmartFormHeader
          eyebrow="Enrollment"
          title="Place in class"
          description="Assign this student to a class for the current term. They become active in the register once confirmed."
        />

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <FormContextCard
            badge={hasAttestation ? 'Ready to enroll' : 'Attestation missing'}
            title={studentName}
            subtitle={
              openTerm
                ? `${activeYear?.label ?? 'Year'} · ${defaultTermName(openTerm.sequence)}`
                : 'No open term'
            }
          >
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                  hasAttestation
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-amber-200 bg-amber-50 text-amber-900',
                )}
              >
                {hasAttestation ? (
                  <ShieldCheck aria-hidden className="size-3" />
                ) : (
                  <ShieldOff aria-hidden className="size-3" />
                )}
                {hasAttestation ? 'Identity attested' : 'Needs attestation'}
              </span>
            </div>
          </FormContextCard>

          {!hasAttestation ? (
            <Alert variant="warning" className="mt-4 border-amber-200 bg-amber-50/80">
              <AlertDescription className="text-amber-900">
                Record at least one identity document on the student profile before billable enrollment.
              </AlertDescription>
            </Alert>
          ) : null}

          {noOpenTerm ? (
            <Alert variant="warning" className="mt-4 border-amber-200 bg-amber-50/80">
              <AlertDescription className="text-amber-900">
                Open a term in{' '}
                <Link href="/school/academic/sessions" className="font-semibold underline underline-offset-2">
                  Academic sessions
                </Link>{' '}
                before enrolling students.
              </AlertDescription>
            </Alert>
          ) : null}

          <Form {...form}>
            <form id="enroll-student-form" onSubmit={onSubmit} className="mt-6 space-y-5">
              {openTerm ? (
                <section className="space-y-2">
                  <SmartFieldLabel>Term</SmartFieldLabel>
                  <div className="rounded-xl border border-brand-100/60 bg-brand-50/30 px-3.5 py-3">
                    <p className="text-[14px] font-bold text-neutral-900">
                      {defaultTermName(openTerm.sequence)}
                    </p>
                    <SmartHint>Students enroll into the open term only</SmartHint>
                  </div>
                </section>
              ) : null}

              <section className="space-y-3">
                <SmartFieldLabel>Class</SmartFieldLabel>
                <FormField
                  control={form.control}
                  name="classArmId"
                  render={({ field }) => (
                    <FormItem>
                      {structureQuery.isLoading ? (
                        <p className="text-[13px] text-neutral-500">Loading classes…</p>
                      ) : (
                        <CardOptionPicker
                          options={armOptions}
                          value={field.value}
                          onChange={field.onChange}
                          disabled={noOpenTerm}
                          searchPlaceholder="Search class…"
                          emptyMessage="No classes for this year. Add class arms in structure."
                          showSearchMin={6}
                        />
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              {selectedArmLabel ? (
                <div className="rounded-xl border border-brand-100/60 bg-brand-50/40 px-3.5 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                    Ready to confirm
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-neutral-800">
                    <GraduationCap aria-hidden className="size-4 text-brand-600" />
                    {studentName} → {selectedArmLabel}
                  </p>
                </div>
              ) : null}

              {form.formState.errors.root ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-800">
                  {form.formState.errors.root.message}
                </p>
              ) : null}
            </form>
          </Form>
        </div>

        <SmartFormFooter
          formId="enroll-student-form"
          submitLabel="Confirm enrollment"
          pending={enroll.isSubmitting}
          disabled={noOpenTerm || !hasAttestation}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
