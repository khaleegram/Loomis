'use client';

import { useSendAnnouncement } from '@loomis/api-client';
import { sendAnnouncementRequest } from '@loomis/contracts';
import { Form, FormControl, FormField, FormItem, FormMessage, Input, Textarea } from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { Megaphone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import {
  ChipOptionPicker,
  FormSubmitError,
  SmartFormPanel,
  SmartFormPanelHeader,
  SmartFormSection,
  smartInputClass,
} from '@/components/shared/smart-form';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';

const AUDIENCE_OPTIONS = [
  { value: 'all' as const, label: 'Everyone' },
  { value: 'staff_and_parents' as const, label: 'Staff & parents' },
];

interface CommsComposeAnnouncementProps {
  tenantId: string;
}

export function CommsComposeAnnouncement({ tenantId }: CommsComposeAnnouncementProps) {
  const sendAnnouncement = useSendAnnouncement(tenantId);

  const form = useForm<z.infer<typeof sendAnnouncementRequest>>({
    resolver: zodResolver(sendAnnouncementRequest),
    defaultValues: { subject: '', body: '', audience: 'all' },
  });

  async function onSubmit(values: z.infer<typeof sendAnnouncementRequest>) {
    try {
      await sendAnnouncement.mutateAsync(values);
      form.reset({ subject: '', body: '', audience: values.audience });
      form.clearErrors('root');
    } catch (err) {
      form.setError('root', { message: academicErrorMessage(err) });
    }
  }

  return (
    <SmartFormPanel
      header={
        <SmartFormPanelHeader
          icon={Megaphone}
          title="School-wide announcement"
          subtitle="Delivered as in-app notifications. Optionally email or SMS per recipient preferences."
        />
      }
      footer={
        <div className="flex justify-end px-5 py-4">
          <button type="submit" form="comms-announce-form" className={ACADEMIC_UI.btnPrimary} disabled={sendAnnouncement.isPending}>
            {sendAnnouncement.isPending ? 'Sending…' : 'Send announcement'}
          </button>
        </div>
      }
    >
      <Form {...form}>
        <form id="comms-announce-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormSubmitError message={form.formState.errors.root?.message ?? null} />

          <SmartFormSection title="Subject line">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="e.g. PTA meeting — Friday 3pm" className={smartInputClass} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SmartFormSection>

          <SmartFormSection title="Audience">
            <FormField
              control={form.control}
              name="audience"
              render={({ field }) => (
                <FormItem>
                  <ChipOptionPicker
                    options={AUDIENCE_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </SmartFormSection>

          <SmartFormSection title="Message">
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      rows={6}
                      placeholder="Write your announcement…"
                      className="rounded-xl border-neutral-200 bg-white text-[13px] leading-relaxed focus:border-brand-300 focus:ring-2 focus:ring-brand-200/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SmartFormSection>
        </form>
      </Form>
    </SmartFormPanel>
  );
}
