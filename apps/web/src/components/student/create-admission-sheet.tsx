'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateAdmission, useClassLevels } from '@loomis/api-client';
import { createAdmissionRequest, type AdmissionResponse, type CreateAdmissionRequest } from '@loomis/contracts';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  Sheet,
  SheetContent,
  cn,
} from '@loomis/ui-web';
import { Calendar, Mail, Phone, User } from 'lucide-react';
import Link from 'next/link';
import { useForm, type Resolver } from 'react-hook-form';

import {
  CardOptionPicker,
  ChipOptionPicker,
  FormContextCard,
  SmartFieldLabel,
  SmartFormFooter,
  SmartFormHeader,
  SmartHint,
  smartInputClass,
} from '@/components/shared/smart-form';
import { genderLabel, relationshipLabel } from '@/lib/student/student-labels';
import { studentErrorMessage } from '@/lib/student/student-errors';

interface CreateAdmissionSheetProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (admission: AdmissionResponse) => void;
}

const GENDER_OPTIONS = (['male', 'female', 'other', 'unknown'] as const).map((g) => ({
  value: g,
  label: genderLabel(g),
}));

const RELATIONSHIP_OPTIONS = (['mother', 'father', 'guardian', 'sponsor', 'other'] as const).map(
  (r) => ({ value: r, label: relationshipLabel(r) }),
);

export function CreateAdmissionSheet({
  tenantId,
  open,
  onOpenChange,
  onCreated,
}: CreateAdmissionSheetProps) {
  const createAdmission = useCreateAdmission(tenantId);
  const classLevelsQuery = useClassLevels(tenantId);
  const levels = classLevelsQuery.data?.levels ?? [];

  const levelOptions = levels.map((level) => ({
    id: level.id,
    label: level.name,
    hint: level.code,
  }));

  const form = useForm<CreateAdmissionRequest>({
    resolver: zodResolver(createAdmissionRequest) as Resolver<CreateAdmissionRequest>,
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'unknown',
      intendedClassLevelId: '',
      guardianName: '',
      guardianEmail: '',
      guardianPhone: '',
      guardianRelationship: 'guardian',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const admission = await createAdmission.mutateAsync(values);
      form.reset();
      onOpenChange(false);
      onCreated?.(admission);
    } catch (err) {
      form.setError('root', { message: studentErrorMessage(err) });
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SmartFormHeader
          eyebrow="Admissions"
          title="Register new applicant"
          description="Capture the student and a guardian contact. A reference number is generated when you submit."
        />

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <FormContextCard
            badge="Step 1 of 2"
            title="Who is applying?"
            subtitle="Basic details for the admissions register"
          />

          <Form {...form}>
            <form id="create-admission-form" onSubmit={onSubmit} className="mt-6 space-y-6">
              <section className="space-y-3">
                <SmartFieldLabel>Student name</SmartFieldLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
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
                              autoComplete="off"
                              placeholder="First name"
                              className={cn(smartInputClass, 'pl-9')}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} autoComplete="off" placeholder="Last name" className={smartInputClass} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <SmartFieldLabel>Date of birth</SmartFieldLabel>
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Calendar
                            aria-hidden
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                          />
                          <Input {...field} type="date" className={cn(smartInputClass, 'pl-9')} />
                        </div>
                      </FormControl>
                      <SmartHint>Used for class placement and age checks</SmartHint>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <section className="space-y-3">
                <SmartFieldLabel>Gender</SmartFieldLabel>
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <ChipOptionPicker
                        options={GENDER_OPTIONS}
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <section className="space-y-3">
                <SmartFieldLabel>Applying for class</SmartFieldLabel>
                <FormField
                  control={form.control}
                  name="intendedClassLevelId"
                  render={({ field }) => (
                    <FormItem>
                      {classLevelsQuery.isLoading ? (
                        <p className="text-[13px] text-neutral-500">Loading class levels…</p>
                      ) : (
                        <CardOptionPicker
                          options={levelOptions}
                          value={field.value}
                          onChange={field.onChange}
                          searchPlaceholder="Search class level…"
                          emptyMessage="No class levels yet. Set up your school structure first."
                          showSearchMin={4}
                        />
                      )}
                      {!classLevelsQuery.isLoading && levels.length === 0 ? (
                        <Link
                          href="/school/academic/structure"
                          className="mt-2 inline-flex text-[12px] font-semibold text-brand-700 hover:underline"
                        >
                          Go to class structure →
                        </Link>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <div className="border-t border-neutral-100 pt-6">
                <FormContextCard
                  badge="Step 2 of 2"
                  title="Guardian contact"
                  subtitle="Who should we reach about this application?"
                />
              </div>

              <section className="space-y-3">
                <SmartFieldLabel>Guardian full name</SmartFieldLabel>
                <FormField
                  control={form.control}
                  name="guardianName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Adaeze Okonkwo" className={smartInputClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                <section className="space-y-3">
                  <SmartFieldLabel>Email</SmartFieldLabel>
                  <FormField
                    control={form.control}
                    name="guardianEmail"
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
                              placeholder="name@email.com"
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
                    name="guardianPhone"
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </section>
              </div>

              <section className="space-y-3">
                <SmartFieldLabel>Relationship to student</SmartFieldLabel>
                <FormField
                  control={form.control}
                  name="guardianRelationship"
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
          formId="create-admission-form"
          submitLabel="Submit application"
          pending={createAdmission.isPending}
          disabled={levels.length === 0}
          onCancel={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
