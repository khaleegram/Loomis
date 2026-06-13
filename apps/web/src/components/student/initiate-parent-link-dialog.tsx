'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useInitiateParentLink } from '@loomis/api-client';
import { initiateParentLinkRequest, type InitiateParentLinkRequest } from '@loomis/contracts';
import {
  Dialog,
  DialogContent,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  cn,
} from '@loomis/ui-web';
import { Link2, Mail, Phone, User } from 'lucide-react';
import { useForm, type Resolver } from 'react-hook-form';

import {
  ChipOptionPicker,
  FormContextCard,
  SmartFieldLabel,
  SmartFormFooter,
  SmartFormHeader,
  SmartHint,
  smartInputClass,
} from '@/components/shared/smart-form';
import { SEMANTIC } from '@/lib/design/surfaces';
import { relationshipLabel } from '@/lib/student/student-labels';
import { studentErrorMessage } from '@/lib/student/student-errors';

const RELATIONSHIP_OPTIONS = (['mother', 'father', 'guardian', 'sponsor', 'other'] as const).map(
  (r) => ({ value: r, label: relationshipLabel(r) }),
);

interface InitiateParentLinkDialogProps {
  tenantId: string;
  studentId: string;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInitiated?: () => void;
}

export function InitiateParentLinkDialog({
  tenantId,
  studentId,
  studentName,
  open,
  onOpenChange,
  onInitiated,
}: InitiateParentLinkDialogProps) {
  const initiate = useInitiateParentLink(tenantId, studentId);

  const form = useForm<InitiateParentLinkRequest>({
    resolver: zodResolver(initiateParentLinkRequest) as Resolver<InitiateParentLinkRequest>,
    defaultValues: {
      parentFullName: '',
      parentEmail: '',
      parentPhone: '',
      relationship: 'guardian',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await initiate.mutateAsync(values);
      form.reset();
      onOpenChange(false);
      onInitiated?.();
    } catch (err) {
      form.setError('root', { message: studentErrorMessage(err) });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,680px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SmartFormHeader
          eyebrow="Parent portal"
          title="Invite a parent"
          description="We email a one-time code so the parent can link their account. You cannot verify on their behalf."
        />

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <FormContextCard
            badge="Linking to"
            title={studentName}
            subtitle="Parent receives an email with next steps"
          />

          <div className={cn('mb-5 mt-4 rounded-2xl border p-4', SEMANTIC.warning.surfaceSubtle)}>
            <p className={cn('flex items-center gap-1.5 text-[13px] font-bold', SEMANTIC.warning.title)}>
              <Link2 aria-hidden className="size-4" />
              How it works
            </p>
            <p className={cn('mt-1 text-[12px] leading-relaxed', SEMANTIC.warning.text)}>
              The parent must enter the OTP from their inbox. Links expire after 48 hours if not accepted.
            </p>
          </div>

          <Form {...form}>
            <form id="initiate-parent-link-form" onSubmit={onSubmit} className="space-y-5">
              <section className="space-y-3">
                <SmartFieldLabel>Parent full name</SmartFieldLabel>
                <FormField
                  control={form.control}
                  name="parentFullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <User
                            aria-hidden
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                          />
                          <Input
                            {...field}
                            placeholder="As on their ID"
                            className={cn(smartInputClass, 'pl-9')}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <section className="space-y-3">
                <SmartFieldLabel>Email</SmartFieldLabel>
                <FormField
                  control={form.control}
                  name="parentEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Mail
                            aria-hidden
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                          />
                          <Input
                            {...field}
                            type="email"
                            placeholder="Where we send the OTP"
                            className={cn(smartInputClass, 'pl-9')}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <section className="space-y-3">
                <SmartFieldLabel>Phone</SmartFieldLabel>
                <FormField
                  control={form.control}
                  name="parentPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Phone
                            aria-hidden
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                          />
                          <Input
                            {...field}
                            type="tel"
                            placeholder="080…"
                            className={cn(smartInputClass, 'pl-9')}
                          />
                        </div>
                      </FormControl>
                      <SmartHint>Optional backup contact — include country code if outside Nigeria</SmartHint>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <section className="space-y-3">
                <SmartFieldLabel>Relationship to student</SmartFieldLabel>
                <FormField
                  control={form.control}
                  name="relationship"
                  render={({ field }) => (
                    <FormItem>
                      <ChipOptionPicker
                        options={RELATIONSHIP_OPTIONS}
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              {form.formState.errors.root ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-800">
                  {form.formState.errors.root.message}
                </p>
              ) : null}
            </form>
          </Form>
        </div>

        <SmartFormFooter
          formId="initiate-parent-link-form"
          submitLabel="Send invitation"
          pending={initiate.isSubmitting}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
