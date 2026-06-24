'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { provisionTenantRequest } from '@loomis/contracts';
import type { z } from 'zod';
import {
  CurrencyInput,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
  Input,
  SmartSearchSelect,
  Textarea,
  cn,
} from '@loomis/ui-web';
import { usePlatformTiers, useProvisionTenant, usePlatformProvisionDraft, useUpsertPlatformProvisionDraft, useClearPlatformProvisionDraft } from '@loomis/api-client';
import { formatKobo } from '@loomis/core';
import {
  Building2,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Mail,
  MapPin,
  Percent,
  Phone,
} from 'lucide-react';
import { uuidv7 } from 'uuidv7';

import { BRONZE } from '@/components/dashboard/dashboard-primitives';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

const STEPS = [
  { id: 0, label: 'School Info', hint: 'Identity & contact' },
  { id: 1, label: 'Tier & Rate', hint: 'Billing configuration' },
  { id: 2, label: 'Review', hint: 'Confirm & provision' },
] as const;

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
] as const;

const STATE_OPTIONS = NIGERIAN_STATES.map((state) => ({
  value: state,
  label: state,
  keywords: state === 'FCT' ? 'Abuja Federal Capital Territory' : state,
}));

type ProvisionFormValues = {
  name: string;
  region: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  goLiveDate: string;
  tierCode: string;
  referralCode?: string;
  initialPsfRateMinor?: number;
};

const DEFAULT_VALUES: ProvisionFormValues = {
  name: '',
  region: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  goLiveDate: todayLocalIso(),
  tierCode: '',
  referralCode: undefined,
  initialPsfRateMinor: undefined,
};

function todayLocalIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function goLiveDateToIso(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function mapZodFieldToForm(field: string): keyof ProvisionFormValues | null {
  if (field === 'goLiveAt') return 'goLiveDate';
  if (field in DEFAULT_VALUES) return field as keyof ProvisionFormValues;
  return null;
}

function applyZodErrors(
  issues: z.ZodIssue[],
  setError: (name: keyof ProvisionFormValues, error: { message: string }) => void,
): string[] {
  const messages: string[] = [];
  for (const issue of issues) {
    const raw = issue.path[0];
    if (typeof raw !== 'string') continue;
    const mapped = mapZodFieldToForm(raw);
    if (mapped) {
      setError(mapped, { message: issue.message });
    }
    messages.push(issue.message);
  }
  return messages;
}

const inputClass =
  'h-10 rounded-lg border-neutral-200 bg-white text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-300 focus:ring-1 focus:ring-neutral-200';

function buildApiBody(values: ProvisionFormValues): z.infer<typeof provisionTenantRequest> {
  return {
    name: values.name.trim(),
    region: values.region.trim(),
    contactEmail: values.contactEmail.trim(),
    contactPhone: values.contactPhone.trim(),
    address: values.address.trim(),
    goLiveAt: goLiveDateToIso(values.goLiveDate),
    tierCode: values.tierCode,
    referralCode: values.referralCode?.trim() ? values.referralCode.trim() : undefined,
    initialPsfRateMinor:
      values.initialPsfRateMinor != null && values.initialPsfRateMinor > 0
        ? values.initialPsfRateMinor
        : undefined,
  };
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
      {children}
      {required ? <span className="text-brand-600"> *</span> : null}
    </p>
  );
}

function StepHeader({ step }: { step: 0 | 1 | 2 }) {
  const meta = STEPS[step];
  return (
    <div className="mb-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
        {meta.label}
      </p>
      <p className="mt-0.5 text-[12px] text-neutral-500">{meta.hint}</p>
    </div>
  );
}

export function TenantProvisionForm() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepHint, setStepHint] = useState<string | null>(null);
  const idempotencyKeyRef = useRef(uuidv7());
  const draftHydratedRef = useRef(false);

  const { data: tiersData, isLoading: tiersLoading, isError: tiersError } = usePlatformTiers();
  const provision = useProvisionTenant();
  const { data: savedDraft } = usePlatformProvisionDraft();
  const upsertDraft = useUpsertPlatformProvisionDraft();
  const clearDraft = useClearPlatformProvisionDraft();

  const form = useForm<ProvisionFormValues>({
    defaultValues: DEFAULT_VALUES,
    mode: 'onTouched',
  });

  const values = form.watch();

  useEffect(() => {
    if (!savedDraft?.payload || draftHydratedRef.current) return;
    draftHydratedRef.current = true;
    const payload = savedDraft.payload;
    form.reset({
      name: payload.name ?? '',
      region: payload.region ?? '',
      contactEmail: payload.contactEmail ?? '',
      contactPhone: payload.contactPhone ?? '',
      address: payload.address ?? '',
      goLiveDate: payload.goLiveAt
        ? payload.goLiveAt.slice(0, 10)
        : DEFAULT_VALUES.goLiveDate,
      tierCode: payload.tierCode ?? '',
      referralCode: payload.referralCode,
      initialPsfRateMinor: payload.initialPsfRateMinor,
    });
    if (savedDraft.stepIndex <= 2) {
      setStep(savedDraft.stepIndex as 0 | 1 | 2);
    }
  }, [savedDraft, form]);

  useEffect(() => {
    if (!draftHydratedRef.current) return;
    const timer = window.setTimeout(() => {
      const current = form.getValues();
      void upsertDraft.mutate({
        stepIndex: step,
        payload: {
          name: current.name,
          region: current.region,
          contactEmail: current.contactEmail,
          contactPhone: current.contactPhone,
          address: current.address,
          goLiveAt: current.goLiveDate ? goLiveDateToIso(current.goLiveDate) : undefined,
          tierCode: current.tierCode,
          referralCode: current.referralCode,
          initialPsfRateMinor: current.initialPsfRateMinor,
        },
      });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [values, step, upsertDraft, form]);

  const selectedTier = useMemo(
    () => (tiersData?.tiers ?? []).find((t) => t.code === values.tierCode),
    [tiersData?.tiers, values.tierCode],
  );

  const effectivePsfMinor =
    values.initialPsfRateMinor != null && values.initialPsfRateMinor > 0
      ? values.initialPsfRateMinor
      : selectedTier?.defaultPsfRateMinor;

  async function handleNext() {
    setSubmitError(null);
    setStepHint(null);
    if (step === 0) {
      const ok = await form.trigger([
        'name',
        'region',
        'contactEmail',
        'contactPhone',
        'address',
        'goLiveDate',
      ]);
      if (!ok) {
        setStepHint('Fix the highlighted fields below — state, phone (+234…), and go-live date are required.');
        return;
      }
      const partial = buildApiBody(form.getValues());
      const parsed = provisionTenantRequest
        .pick({
          name: true,
          region: true,
          contactEmail: true,
          contactPhone: true,
          address: true,
          goLiveAt: true,
        })
        .safeParse(partial);
      if (!parsed.success) {
        const messages = applyZodErrors(parsed.error.issues, form.setError);
        setStepHint(messages[0] ?? 'Check the highlighted fields and try again.');
        return;
      }
      setStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 1) {
      if (!form.getValues('tierCode')) {
        form.setError('tierCode', { message: 'Select a service tier' });
        setStepHint('Choose a commercial tier to continue.');
        return;
      }
      const partial = buildApiBody(form.getValues());
      const parsed = provisionTenantRequest.safeParse(partial);
      if (!parsed.success) {
        const messages = applyZodErrors(parsed.error.issues, form.setError);
        setStepHint(messages[0] ?? 'Check tier and billing fields.');
        return;
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function handleProvision() {
    setSubmitError(null);
    const body = buildApiBody(form.getValues());
    const parsed = provisionTenantRequest.safeParse(body);
    if (!parsed.success) {
      setSubmitError(parsed.error.issues[0]?.message ?? 'Check the form and try again.');
      return;
    }

    try {
      const tenant = await provision.mutateAsync({
        body: parsed.data,
        idempotencyKey: idempotencyKeyRef.current,
      });
      await clearDraft.mutateAsync();
      router.push(`/platform/tenants/${tenant.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Provisioning failed. Try again.';
      setSubmitError(message);
      idempotencyKeyRef.current = uuidv7();
    }
  }

  return (
    <div className={`${ACADEMIC_UI.dataPanel} overflow-visible`}>
      {/* Step rail */}
      <div
        className="border-b border-brand-100/30 px-5 py-4 sm:px-6"
        style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.12) 0%, rgba(255,255,255,0.95) 100%)' }}
      >
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            const isLast = i === STEPS.length - 1;
            return (
              <div key={s.id} className="flex min-w-0 flex-1 items-center">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
                      done && 'bg-brand-600 text-white',
                      active && !done && 'bg-black text-white',
                      !done && !active && 'bg-neutral-200 text-neutral-500',
                    )}
                  >
                    {done ? <Check aria-hidden className="size-3.5" /> : i + 1}
                  </span>
                  <div className="min-w-0 hidden sm:block">
                    <p
                      className={cn(
                        'truncate text-[11px] font-bold',
                        active ? 'text-neutral-900' : 'text-neutral-400',
                      )}
                    >
                      {s.label}
                    </p>
                    <p className="text-[10px] text-neutral-400">{s.hint}</p>
                  </div>
                </div>
                {!isLast ? (
                  <div className="mx-2 hidden flex-1 sm:block">
                    <div
                      className={cn('h-px w-full', done ? 'bg-brand-600/40' : 'bg-neutral-200')}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="overflow-visible p-5 sm:p-6">
        <StepHeader step={step} />

        {stepHint ? (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[13px] font-semibold text-amber-900">{stepHint}</p>
          </div>
        ) : null}

        {tiersError ? (
          <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="text-[13px] font-semibold text-red-700">
              Could not load tiers. Check that the API is running, then refresh.
            </p>
          </div>
        ) : null}

        {submitError ? (
          <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="text-[13px] font-semibold text-red-700">{submitError}</p>
          </div>
        ) : null}

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (step === 2) void handleProvision();
              else void handleNext();
            }}
          >
            {step === 0 ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: 'School name is required', minLength: { value: 2, message: 'Min 2 characters' } }}
                  render={({ field }) => (
                    <FormItem className="lg:col-span-2">
                      <FieldLabel required>School name</FieldLabel>
                      <FormControl>
                        <div className="relative">
                          <Building2
                            aria-hidden
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                          />
                          <Input
                            {...field}
                            className={cn(inputClass, 'pl-9')}
                            placeholder="e.g. Greenfield Academy"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="region"
                  rules={{ required: 'Select a state or region' }}
                  render={({ field }) => (
                    <FormItem className="lg:col-span-2">
                      <FieldLabel required>State / region</FieldLabel>
                      <FormControl>
                        <SmartSearchSelect
                          variant="field"
                          value={field.value || null}
                          onValueChange={(v) => {
                            field.onChange(v ?? '');
                            form.clearErrors('region');
                          }}
                          options={STATE_OPTIONS}
                          placeholder="Select state…"
                          searchPlaceholder="Search states (e.g. Lagos, FCT, Abuja)…"
                        />
                      </FormControl>
                      <FormDescription className="text-[11px] text-neutral-400">
                        Search all 37 states — used for regional reporting and PSF attribution.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  rules={{
                    required: 'Contact email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Enter a valid email (e.g. principal@school.ng)',
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel required>Primary contact email</FieldLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail
                            aria-hidden
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                          />
                          <Input
                            {...field}
                            type="email"
                            className={cn(inputClass, 'pl-9')}
                            placeholder="principal@school.ng"
                            autoComplete="email"
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="text-[11px] text-neutral-400">
                        School Owner account and welcome email are sent here after provisioning.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  rules={{
                    required: 'Mobile phone is required',
                    pattern: {
                      value: /^\+234[789]\d{9}$/,
                      message: 'Use Nigerian format: +2348012345678',
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel required>Mobile phone</FieldLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone
                            aria-hidden
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                          />
                          <Input
                            {...field}
                            type="tel"
                            className={cn(inputClass, 'pl-9')}
                            placeholder="+2348012345678"
                            autoComplete="tel"
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="text-[11px] text-neutral-400">
                        Primary mobile for the School Owner and urgent platform notices.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="goLiveDate"
                  rules={{
                    required: 'Go-live date is required',
                    validate: (value) => {
                      if (!value) return 'Go-live date is required';
                      return value >= todayLocalIso() || 'Go-live date cannot be in the past';
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel required>Go-live date</FieldLabel>
                      <FormControl>
                        <div className="relative">
                          <Calendar
                            aria-hidden
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                          />
                          <Input
                            {...field}
                            type="date"
                            min={todayLocalIso()}
                            className={cn(inputClass, 'pl-9')}
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="text-[11px] text-neutral-400">
                        School logins stay blocked until this date. Platform can activate early if needed.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  rules={{ required: 'Address is required', minLength: { value: 2, message: 'Min 2 characters' } }}
                  render={({ field }) => (
                    <FormItem className="lg:col-span-2">
                      <FieldLabel required>Physical address</FieldLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin
                            aria-hidden
                            className="pointer-events-none absolute left-3 top-3 size-4 text-neutral-400"
                          />
                          <Textarea
                            {...field}
                            rows={3}
                            className="min-h-[88px] resize-none rounded-lg border-neutral-200 bg-white pl-9 text-[13px] placeholder:text-neutral-400 focus-visible:ring-brand-600/30"
                            placeholder={
                              values.region
                                ? `Street, LGA, ${values.region}`
                                : 'Street, LGA, State'
                            }
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="tierCode"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel required>Service tier</FieldLabel>
                      {tiersLoading ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-100" />
                          ))}
                        </div>
                      ) : (
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          {(tiersData?.tiers ?? []).map((tier) => {
                            const selected = field.value === tier.code;
                            return (
                              <button
                                key={tier.id}
                                type="button"
                                onClick={() => {
                                  field.onChange(tier.code);
                                  form.clearErrors('tierCode');
                                  if (
                                    !form.getValues('initialPsfRateMinor') ||
                                    form.getValues('initialPsfRateMinor') === 0
                                  ) {
                                    form.setValue('initialPsfRateMinor', undefined, {
                                      shouldValidate: false,
                                    });
                                  }
                                }}
                                className={cn(
                                  'group rounded-xl border p-4 text-left transition-all',
                                  selected
                                    ? 'border-black bg-neutral-50/80 ring-1 ring-black/10'
                                    : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/60',
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p
                                      className={cn(
                                        'truncate text-[13px] font-bold transition-colors',
                                        selected ? 'text-neutral-900' : 'text-neutral-800 group-hover:text-neutral-900',
                                      )}
                                    >
                                      {tier.name}
                                    </p>
                                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-neutral-400">
                                      {tier.code}
                                    </p>
                                  </div>
                                  <span
                                    className={cn(
                                      'flex size-5 shrink-0 items-center justify-center rounded-full border transition-all',
                                      selected
                                        ? 'border-black bg-black text-white'
                                        : 'border-neutral-200 bg-white text-transparent group-hover:border-neutral-300',
                                    )}
                                  >
                                    <Check aria-hidden className="size-3" />
                                  </span>
                                </div>
                                {tier.description ? (
                                  <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-neutral-500">
                                    {tier.description}
                                  </p>
                                ) : null}
                                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-neutral-700">
                                    {formatKobo(tier.defaultPsfRateMinor)}
                                    <span className="font-normal text-neutral-400">/ student</span>
                                  </span>
                                  {tier.maxStudents != null ? (
                                    <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500">
                                      ≤{tier.maxStudents.toLocaleString()}
                                    </span>
                                  ) : null}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedTier ? (
                  <div
                    className="rounded-xl p-4 text-white"
                    style={{ background: BRONZE.gradients.g1 }}
                  >
                    <div className="flex items-center gap-2">
                      <Percent aria-hidden className="size-3.5 opacity-80" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-80">
                        Tier default
                      </p>
                    </div>
                    <p className="mt-1.5 text-[1.5rem] font-extrabold tabular-nums tracking-tight">
                      {formatKobo(selectedTier.defaultPsfRateMinor)}
                      <span className="ml-1.5 text-[12px] font-semibold opacity-70">
                        / student / term
                      </span>
                    </p>
                  </div>
                ) : null}

                <FormField
                  control={form.control}
                  name="initialPsfRateMinor"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel>PSF rate override</FieldLabel>
                      <FormControl>
                        <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
                          <p className="mb-3 text-[12px] leading-relaxed text-neutral-500">
                            Leave empty to start at the platform default of ₦1,000 per student.
                            Recalculated automatically when the school sets fee structures.
                          </p>
                          <div className="flex flex-wrap items-end gap-3">
                            <div className="min-w-[180px] flex-1">
                              <CurrencyInput
                                className="h-10 rounded-lg border-neutral-200 shadow-none"
                                valueKobo={field.value ?? 0}
                                onChangeKobo={(v) => field.onChange(v > 0 ? v : undefined)}
                              />
                            </div>
                            {effectivePsfMinor != null && effectivePsfMinor > 0 ? (
                              <div className="shrink-0 text-right">
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                                  Effective
                                </p>
                                <p className="mt-0.5 font-mono text-[14px] font-bold tabular-nums text-neutral-900">
                                  {formatKobo(effectivePsfMinor)}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription className="text-[11px] text-neutral-400">
                        CON-011: A rate of zero is permanently blocked.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referralCode"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel>Referral code</FieldLabel>
                      <FormControl>
                        <Input
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value.trim() || undefined)}
                          className={inputClass}
                          placeholder="Optional — regional partner code"
                          spellCheck={false}
                        />
                      </FormControl>
                      <FormDescription className="text-[11px] text-neutral-400">
                        Permanently links this school at onboarding (CON-009). Cannot be changed later.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}

            {step === 2 ? (
              <div className="rounded-xl border border-neutral-100 bg-neutral-50/40 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ background: BRONZE.gradients.card }}
                  >
                    <Building2 aria-hidden className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-neutral-900">{values.name || '—'}</p>
                    <p className="text-[12px] text-neutral-500">
                      {values.region || '—'}{values.tierCode ? ` · ${values.tierCode}` : ''}
                    </p>
                  </div>
                </div>
                <dl className="grid grid-cols-1 gap-3 border-t border-neutral-100 pt-4 sm:grid-cols-2">
                  {[
                    { label: 'Contact email', value: values.contactEmail || '—' },
                    { label: 'Mobile phone', value: values.contactPhone || '—' },
                    {
                      label: 'Go-live date',
                      value: values.goLiveDate
                        ? new Date(`${values.goLiveDate}T00:00:00.000Z`).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—',
                    },
                    { label: 'Address', value: values.address || '—' },
                    {
                      label: 'PSF rate',
                      value:
                        values.initialPsfRateMinor && values.initialPsfRateMinor > 0
                          ? `${formatKobo(values.initialPsfRateMinor)} (override)`
                          : '₦1,000.00 (platform default)',
                    },
                    { label: 'Referral', value: values.referralCode || 'None' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                        {label}
                      </dt>
                      <dd className="mt-1 truncate text-[13px] font-semibold text-neutral-900">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2.5">
                  <Info aria-hidden className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                  <p className="text-[11px] leading-relaxed text-amber-700">
                    Provisioning creates the tenant and sends welcome credentials. School access begins on
                    the go-live date unless you activate early from the tenant detail page.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-5">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as 0 | 1 | 2)}
                  disabled={provision.isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-[12px] font-semibold text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition disabled:opacity-50"
                >
                  <ChevronLeft aria-hidden className="size-3.5" />
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push('/platform/tenants')}
                  className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-[12px] font-semibold text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition"
                >
                  Cancel
                </button>
              )}

              {step < 2 ? (
                <button
                  type="submit"
                  className={ACADEMIC_UI.btnPrimary}
                >
                  Continue
                  <ChevronRight aria-hidden className="size-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={provision.isPending}
                  className={cn(ACADEMIC_UI.btnPrimary, 'disabled:cursor-not-allowed disabled:opacity-50')}
                >
                  {provision.isPending ? 'Provisioning…' : 'Provision school'}
                </button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
