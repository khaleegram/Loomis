'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRecordIdentityAttestation } from '@loomis/api-client';
import {
  recordIdentityAttestationRequest,
  type IdentityAttestationType,
  type RecordIdentityAttestationRequest,
} from '@loomis/contracts';
import {
  Dialog,
  DialogContent,
  Form,
  FormField,
  FormItem,
  FormMessage,
  cn,
} from '@loomis/ui-web';
import { Camera, FileText, ScrollText, Shield } from 'lucide-react';
import { useForm, type Resolver } from 'react-hook-form';

import {
  SmartFieldLabel,
  SmartFormFooter,
  SmartFormHeader,
  SmartHint,
} from '@/components/shared/smart-form';
import { SEMANTIC } from '@/lib/design/surfaces';
import { attestationTypeHint, attestationTypeLabel } from '@/lib/student/student-labels';
import { studentErrorMessage } from '@/lib/student/student-errors';

const ATTESTATION_TYPES = [
  'birth_certificate',
  'previous_school_record',
  'admission_photograph',
  'parent_consent',
] as const satisfies readonly IdentityAttestationType[];

const ATTESTATION_ICONS = {
  birth_certificate: FileText,
  previous_school_record: ScrollText,
  admission_photograph: Camera,
  parent_consent: Shield,
} as const;

interface RecordAttestationDialogProps {
  tenantId: string;
  studentId: string;
  studentName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded?: () => void;
}

export function RecordAttestationDialog({
  tenantId,
  studentId,
  studentName,
  open,
  onOpenChange,
  onRecorded,
}: RecordAttestationDialogProps) {
  const record = useRecordIdentityAttestation(tenantId, studentId);

  const form = useForm<RecordIdentityAttestationRequest>({
    resolver: zodResolver(recordIdentityAttestationRequest) as Resolver<RecordIdentityAttestationRequest>,
    defaultValues: {
      attestationType: 'birth_certificate',
    },
  });

  const selected = form.watch('attestationType');

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await record.mutateAsync(values);
      form.reset();
      onOpenChange(false);
      onRecorded?.();
    } catch (err) {
      form.setError('root', { message: studentErrorMessage(err) });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SmartFormHeader
          surface="dialog"
          eyebrow="Compliance"
          title="Record identity document"
          description={
            studentName
              ? `Log what you verified for ${studentName}. At least one record is required before billable enrollment.`
              : 'Log what you verified on file. At least one record is required before billable enrollment.'
          }
        />

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className={cn('mb-5 rounded-2xl border p-4', SEMANTIC.warning.surfaceSubtle)}>
            <p className={cn('text-[13px] font-bold', SEMANTIC.warning.title)}>Permanent audit record</p>
            <p className={cn('mt-1 text-[12px] leading-relaxed', SEMANTIC.warning.text)}>
              This cannot be removed after submission. Only record documents you have physically verified.
            </p>
          </div>

          <Form {...form}>
            <form id="record-attestation-form" onSubmit={onSubmit} className="space-y-4">
              <SmartFieldLabel>What did you verify?</SmartFieldLabel>
              <FormField
                control={form.control}
                name="attestationType"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {ATTESTATION_TYPES.map((type) => {
                        const Icon = ATTESTATION_ICONS[type];
                        const active = field.value === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => field.onChange(type)}
                            className={cn(
                              'flex flex-col items-start rounded-xl border px-3.5 py-3 text-left transition duration-200',
                              active
                                ? 'border-brand-400 bg-brand-50/80 shadow-sm ring-1 ring-brand-200/60'
                                : 'border-neutral-200 bg-white hover:border-brand-200 hover:bg-brand-50/30',
                            )}
                          >
                            <span
                              className={cn(
                                'mb-2 flex size-8 items-center justify-center rounded-lg',
                                active ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-neutral-500',
                              )}
                            >
                              <Icon aria-hidden className="size-4" />
                            </span>
                            <span className="text-[13px] font-bold text-neutral-900">
                              {attestationTypeLabel(type)}
                            </span>
                            <span className="mt-1 text-[11px] leading-snug text-neutral-500">
                              {attestationTypeHint(type)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {selected ? (
                      <SmartHint>You selected: {attestationTypeLabel(selected)}</SmartHint>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-800">
                  {form.formState.errors.root.message}
                </p>
              ) : null}
            </form>
          </Form>
        </div>

        <SmartFormFooter
          formId="record-attestation-form"
          submitLabel="Record attestation"
          pending={record.isPending}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
