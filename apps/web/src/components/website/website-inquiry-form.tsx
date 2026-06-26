'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { submitWebsiteInquiryRequest, type WebsiteInquiryType } from '@loomis/contracts';
import { Alert, AlertDescription, Button, Input, Label, Textarea } from '@loomis/ui-web';
import { useSubmitWebsiteInquiry } from '@loomis/api-client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const inquiryFormSchema = submitWebsiteInquiryRequest.superRefine((value, ctx) => {
  if (value.type === 'admission_interest' && !value.childFirstName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['childFirstName'],
      message: 'Child first name is required',
    });
  }
});

type InquiryFormInput = z.input<typeof inquiryFormSchema>;
type InquiryFormValues = z.output<typeof inquiryFormSchema>;

function defaultValues(type: WebsiteInquiryType): InquiryFormInput {
  return {
    type,
    submitterName: '',
    submitterEmail: '',
    submitterPhone: '',
    message: '',
    website: '',
    ...(type === 'admission_interest'
      ? {
          childFirstName: '',
          classInterest: '',
        }
      : {}),
  };
}

interface WebsiteInquiryFormProps {
  slug: string;
  type: WebsiteInquiryType;
  accentColor?: string;
  className?: string;
}

export function WebsiteInquiryForm({ slug, type, accentColor, className }: WebsiteInquiryFormProps) {
  const mutation = useSubmitWebsiteInquiry(slug);
  const isAdmission = type === 'admission_interest';

  const form = useForm<InquiryFormInput, unknown, InquiryFormValues>({
    resolver: zodResolver(inquiryFormSchema),
    defaultValues: defaultValues(type),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = form;

  async function onSubmit(values: InquiryFormValues) {
    await mutation.mutateAsync(values);
    reset();
  }

  if (mutation.isSuccess) {
    return (
      <Alert className={className}>
        <AlertDescription>
          {mutation.data?.message ?? 'Thank you. The school will be in touch shortly.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`space-y-4 ${className ?? ''}`}>
      {/* Honeypot — hidden from users */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        {...register('website')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${type}-name`}>Your name</Label>
          <Input
            id={`${type}-name`}
            className="mt-1 min-h-[44px]"
            {...register('submitterName')}
          />
          {errors.submitterName ? (
            <p className="mt-1 text-xs text-danger">{errors.submitterName.message}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor={`${type}-email`}>Email</Label>
          <Input
            id={`${type}-email`}
            type="email"
            className="mt-1 min-h-[44px]"
            {...register('submitterEmail')}
          />
          {errors.submitterEmail ? (
            <p className="mt-1 text-xs text-danger">{errors.submitterEmail.message}</p>
          ) : null}
        </div>
      </div>

      <div>
        <Label htmlFor={`${type}-phone`}>Phone (optional)</Label>
        <Input
          id={`${type}-phone`}
          type="tel"
          className="mt-1 min-h-[44px]"
          {...register('submitterPhone')}
        />
      </div>

      {isAdmission ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${type}-child`}>Child&apos;s first name</Label>
            <Input
              id={`${type}-child`}
              className="mt-1 min-h-[44px]"
              {...register('childFirstName')}
            />
            {'childFirstName' in errors && errors.childFirstName ? (
              <p className="mt-1 text-xs text-danger">{errors.childFirstName.message}</p>
            ) : null}
          </div>
          <div>
            <Label htmlFor={`${type}-class`}>Class of interest (optional)</Label>
            <Input
              id={`${type}-class`}
              className="mt-1 min-h-[44px]"
              placeholder="e.g. JSS 1"
              {...register('classInterest')}
            />
          </div>
        </div>
      ) : null}

      <div>
        <Label htmlFor={`${type}-message`}>Message</Label>
        <Textarea
          id={`${type}-message`}
          rows={4}
          className="mt-1"
          placeholder={
            isAdmission
              ? 'Tell us about your child and when you hope to enrol…'
              : 'How can we help you?'
          }
          {...register('message')}
        />
        {errors.message ? (
          <p className="mt-1 text-xs text-danger">{errors.message.message}</p>
        ) : null}
      </div>

      {mutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            Could not send your enquiry. Please try again or call the school directly.
          </AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="submit"
        disabled={mutation.isPending}
        className="min-h-[44px] w-full sm:w-auto"
        style={accentColor ? { backgroundColor: accentColor } : undefined}
      >
        {mutation.isPending ? 'Sending…' : isAdmission ? 'Submit enquiry' : 'Send message'}
      </Button>
    </form>
  );
}
