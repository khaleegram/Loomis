'use client';

import { useEffect } from 'react';
import { useMyProfile, useRevokeSession, useSessions, useUpdateProfile } from '@loomis/api-client';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  Skeleton,
  cn,
} from '@loomis/ui-web';
import { Bell, Mail, Phone, Shield } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { ParentContactHero } from '@/components/parent/parent-contact-hero';
import { ParentPushNotificationSettings } from '@/components/parent/parent-push-notification-settings';
import { PageBody } from '@/components/parent/parent-shell';
import {
  FormContextCard,
  FormSubmitError,
  SmartFormPanel,
  SmartFormPanelHeader,
  SmartFormSection,
  SmartHint,
  smartInputClass,
} from '@/components/shared/smart-form';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

const contactSchema = z.object({
  email: z.string().email('Invalid email'),
});

type ContactForm = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const profileQuery = useMyProfile();
  const sessionsQuery = useSessions();
  const updateProfile = useUpdateProfile();
  const revokeSession = useRevokeSession();

  const profile = profileQuery.data;
  const sessions = sessionsQuery.data?.sessions ?? [];

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (profile?.email) {
      form.reset({ email: profile.email });
    }
  }, [profile?.email, form]);

  async function onSubmit(values: ContactForm) {
    if (values.email === profile?.email) return;
    try {
      await updateProfile.mutateAsync({ email: values.email });
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Update failed',
      });
    }
  }

  return (
    <PageBody className="max-w-[1200px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8">
      <div className="space-y-6">
        <ParentContactHero
          displayName={profile?.displayName ?? null}
          email={profile?.email ?? null}
          sessionCount={sessions.length}
          isLoading={profileQuery.isLoading || sessionsQuery.isLoading}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <SmartFormPanel
            header={
              <SmartFormPanelHeader
                icon={Mail}
                title="Contact details"
                subtitle="How schools and Loomis reach you about your children."
              />
            }
            footer={
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <SmartHint>
                  Email changes may require MFA and a 24-hour cooling-off period.
                </SmartHint>
                <button
                  type="submit"
                  form="parent-contact-form"
                  className={cn(ACADEMIC_UI.btnPrimary, 'w-full sm:w-auto')}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            }
          >
            {profileQuery.isLoading ? (
              <Skeleton className="h-40 w-full rounded-xl" />
            ) : (
              <Form {...form}>
                <form id="parent-contact-form" className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                  <FormSubmitError message={form.formState.errors.root?.message ?? null} />

                  <SmartFormSection title="Primary email" description="Used for receipts and school notices">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Mail
                                aria-hidden
                                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                              />
                              <Input
                                type="email"
                                autoComplete="email"
                                className={cn(smartInputClass, 'pl-9')}
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </SmartFormSection>

                  <SmartFormSection title="Phone number" description="Verified separately for security">
                    <div className="relative">
                      <Phone
                        aria-hidden
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                      />
                      <Input
                        type="tel"
                        disabled
                        placeholder="Verified via OTP at enrolment"
                        className={cn(smartInputClass, 'pl-9 opacity-70')}
                      />
                    </div>
                    <SmartHint>Contact your school admin to update your phone number.</SmartHint>
                  </SmartFormSection>
                </form>
              </Form>
            )}
          </SmartFormPanel>

          <div className="space-y-6">
            <SmartFormPanel
              header={
                <SmartFormPanelHeader
                  icon={Bell}
                  title="Notifications"
                  subtitle="Choose how you hear about attendance, fees, and results."
                />
              }
            >
              <ParentPushNotificationSettings />
              <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
                {[
                  { label: 'Email notifications', defaultChecked: true },
                  { label: 'SMS alerts', defaultChecked: false },
                ].map((pref) => (
                  <label
                    key={pref.label}
                    className="flex min-h-[44px] cursor-not-allowed items-center gap-3 rounded-xl border border-neutral-200/80 bg-neutral-50/80 px-4 py-3 text-[13px] font-medium text-neutral-600 opacity-80"
                  >
                    <input
                      type="checkbox"
                      defaultChecked={pref.defaultChecked}
                      disabled
                      className="size-4 rounded border-neutral-300"
                    />
                    {pref.label}
                  </label>
                ))}
                <SmartHint>Email and SMS preference saving is not available yet.</SmartHint>
              </div>
            </SmartFormPanel>

            <SmartFormPanel
              header={
                <SmartFormPanelHeader
                  icon={Shield}
                  title="Active sessions"
                  subtitle="Devices currently signed in to your account."
                />
              }
            >
              {sessionsQuery.isLoading ? (
                <Skeleton className="h-24 w-full rounded-xl" />
              ) : sessions.length === 0 ? (
                <p className="text-[13px] text-neutral-500">No active sessions.</p>
              ) : (
                <ul className="space-y-2">
                  {sessions.map((session) => (
                    <li
                      key={session.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200/80 bg-white px-4 py-3"
                    >
                      <div>
                        <p className="text-[13px] font-semibold text-neutral-900">
                          {session.platform ?? 'Unknown device'}
                          {session.isCurrent ? (
                            <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                              Current
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          Last active {new Date(session.lastActiveAt).toLocaleString()}
                        </p>
                      </div>
                      {!session.isCurrent ? (
                        <button
                          type="button"
                          className={ACADEMIC_UI.btnSecondarySm}
                          disabled={revokeSession.isPending}
                          onClick={() => void revokeSession.mutateAsync({ sessionId: session.id })}
                        >
                          Revoke
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </SmartFormPanel>
          </div>
        </div>

        <FormContextCard
          badge="Privacy"
          title="Your data stays yours"
          subtitle="Contact changes are audit-logged. Schools only see details needed for your linked children."
        />
      </div>
    </PageBody>
  );
}
