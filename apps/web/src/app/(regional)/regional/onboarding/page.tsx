'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { provisionTenantRequest } from '@loomis/contracts';
import type { z } from 'zod';
import {
  useMyReferralCode,
  usePlatformTiersForRegional,
  useRegionalProvisionTenant,
} from '@loomis/api-client';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@loomis/ui-web';
import { CheckCircle2, Lock } from 'lucide-react';
import { uuidv7 } from 'uuidv7';

import { RegionalConsoleHero } from '@/components/regional/regional-console-hero';
import { PageBody } from '@/components/regional/regional-shell';
import { REGIONAL_PAGE_CLASS, REGIONAL_UI } from '@/lib/regional/regional-ui';
import { useOnboardingStore } from '@/lib/regional/onboarding-store';
import { smartInputClass } from '@/components/shared/smart-form';

const STEPS = ['School Identity', 'Contact', 'Attribution', 'Tier', 'Review'] as const;

const SOCIAL_PROOF = [
  { stat: '142', line: 'schools trust Loomis across Nigeria' },
  { stat: '₦2.1B+', line: 'in school fees processed last term' },
  { stat: '98.2%', line: 'platform uptime — NDPA compliant' },
  { stat: '36', line: 'states with active partner networks' },
  { stat: '4.8★', line: 'average partner satisfaction rating' },
] as const;

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

type ProvisionForm = z.infer<typeof provisionTenantRequest>;

export default function RegionalOnboardingPage() {
  const { draft, setField, setStep, reset: resetDraft } = useOnboardingStore();
  const [success, setSuccess] = useState<{ tenantId: string; name: string } | null>(null);
  const idempotencyKeyRef = useRef(uuidv7());
  const [proofIndex, setProofIndex] = useState(0);

  const { data: codeSummary } = useMyReferralCode();
  const { data: tiersData, isLoading: tiersLoading } = usePlatformTiersForRegional();
  const provision = useRegionalProvisionTenant();

  const form = useForm<ProvisionForm>({
    resolver: zodResolver(provisionTenantRequest),
    defaultValues: {
      name: draft.name,
      region: draft.region,
      contactEmail: draft.contactEmail,
      address: draft.address,
      tierCode: draft.tierCode,
      referralCode: '',
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setProofIndex((i) => (i + 1) % SOCIAL_PROOF.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setProofIndex(draft.step % SOCIAL_PROOF.length);
  }, [draft.step]);

  async function handleNext() {
    const step = draft.step;
    let valid = false;
    if (step === 0) {
      valid = await form.trigger(['name', 'region']);
      if (valid) {
        setField('name', form.getValues('name'));
        setField('region', form.getValues('region'));
      }
    } else if (step === 1) {
      valid = await form.trigger(['contactEmail', 'address']);
      if (valid) {
        setField('contactEmail', form.getValues('contactEmail'));
        setField('address', form.getValues('address'));
      }
    } else if (step === 2) {
      valid = draft.conflictDeclared;
      if (!valid) form.setError('root', { message: 'Conflict-of-interest declaration is required' });
    } else if (step === 3) {
      valid = await form.trigger(['tierCode']);
      if (valid) setField('tierCode', form.getValues('tierCode'));
    }
    if (valid && step < 4) setStep((step + 1) as 0 | 1 | 2 | 3 | 4);
  }

  async function handleSubmit() {
    const values = form.getValues();
    try {
      const result = await provision.mutateAsync({
        body: {
          name: values.name,
          region: values.region,
          contactEmail: values.contactEmail,
          address: values.address,
          tierCode: values.tierCode,
          referralCode: values.referralCode || undefined,
        },
        idempotencyKey: idempotencyKeyRef.current,
      });
      setSuccess({ tenantId: result.id, name: result.name });
      resetDraft();
      form.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Submission failed';
      form.setError('root', { message });
      idempotencyKeyRef.current = uuidv7();
    }
  }

  const proof = SOCIAL_PROOF[proofIndex];

  if (success) {
    return (
      <PageBody className={REGIONAL_PAGE_CLASS}>
        <div className="space-y-6">
          <RegionalConsoleHero
            title="School onboarded"
            description="Provisioning request submitted successfully"
          />
          <div className={`${REGIONAL_UI.dataPanel} mx-auto max-w-lg p-8 text-center`}>
            <CheckCircle2 aria-hidden className="mx-auto size-12 text-accent-green-600" />
            <p className="mt-4 text-xl font-extrabold text-neutral-900">{success.name}</p>
            <p className="mt-2 text-[13px] text-neutral-500">
              Tracking ID: <span className="font-mono">{success.tenantId.slice(0, 13)}…</span>
            </p>
            <p className="mt-4 text-[13px] text-neutral-500">
              Attribution pending KYC verification. You will be notified when the school goes live.
            </p>
            <button
              type="button"
              className={`mt-6 ${REGIONAL_UI.btnPrimary}`}
              onClick={() => {
                setSuccess(null);
                idempotencyKeyRef.current = uuidv7();
              }}
            >
              Onboard another school
            </button>
          </div>
        </div>
      </PageBody>
    );
  }

  return (
    <PageBody className={`${REGIONAL_PAGE_CLASS} !px-0`}>
      <div className="space-y-0">
        <div className="px-4 sm:px-6 lg:px-7">
          <RegionalConsoleHero
            title="Onboard a school"
            description="Submit a new school to your referral network — US-REG-002"
          />
        </div>
        <div className="-mt-2 flex min-h-[calc(100vh-12rem)] flex-col lg:flex-row">
          {/* Split Heritage brand panel */}
          <aside className="flex w-full flex-col justify-between bg-brand-700 px-8 py-10 text-white lg:w-[40%] lg:min-h-full dark:bg-forest-800">
            <div>
              <p className="font-serif text-2xl font-semibold tracking-tight text-gold-300">
                Loomis
              </p>
              <p className="mt-1 text-sm text-brand-100/80">Premium school management</p>
            </div>

            <div className="my-10 transition-opacity duration-500">
              <p className="font-serif text-4xl font-bold text-gold-400">{proof.stat}</p>
              <p className="mt-2 max-w-xs text-lg leading-snug text-brand-50/90">{proof.line}</p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                {STEPS.map((label, idx) => (
                  <div
                    key={label}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors',
                      idx <= draft.step ? 'bg-gold-400' : 'bg-brand-600/50',
                    )}
                    aria-hidden
                  />
                ))}
              </div>
              <p className="text-xs text-brand-100/60">
                Step {draft.step + 1} of {STEPS.length} · {STEPS[draft.step]}
              </p>
            </div>
          </aside>

          {/* Form panel */}
          <div className="flex flex-1 flex-col px-6 py-8 lg:px-10">
            <Form {...form}>
              <form
                className="mx-auto w-full max-w-lg flex-1 space-y-6"
                onSubmit={form.handleSubmit(handleSubmit)}
              >
                {form.formState.errors.root ? (
                  <Alert variant="destructive">
                    <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                  </Alert>
                ) : null}

                {draft.step === 0 ? (
                  <>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>School name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Grace Academy" className={smartInputClass} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {NIGERIAN_STATES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : null}

                {draft.step === 1 ? (
                  <>
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>School contact email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="admin@school.edu.ng" className={smartInputClass} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Physical address</FormLabel>
                          <FormControl>
                            <Input placeholder="Street, LGA, State" className={smartInputClass} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : null}

                {draft.step === 2 ? (
                  <div className="space-y-4">
                    <div className="rounded-md border border-gold-200 bg-gold-50 p-4 dark:border-gold-700/50 dark:bg-gold-900/20">
                      <div className="flex items-center gap-2">
                        <Lock aria-hidden className="size-4 text-gold-600" />
                        <span className="text-sm font-medium">Referral code (auto-attached)</span>
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          Locked
                        </Badge>
                      </div>
                      <p className="mt-2 font-mono text-sm text-muted-foreground">
                        {codeSummary?.status === 'active'
                          ? '•••••••••••• (active code on file)'
                          : 'Activate your referral code before onboarding'}
                      </p>
                    </div>
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border p-4">
                      <Checkbox
                        checked={draft.conflictDeclared}
                        onCheckedChange={(v) => setField('conflictDeclared', v === true)}
                      />
                      <span className="text-sm leading-snug">
                        I declare no conflict of interest with this school and confirm referral
                        attribution is accurate per platform policy.
                      </span>
                    </label>
                  </div>
                ) : null}

                {draft.step === 3 ? (
                  <FormField
                    control={form.control}
                    name="tierCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service tier</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger disabled={tiersLoading}>
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(tiersData?.tiers ?? []).map((tier) => (
                              <SelectItem key={tier.code} value={tier.code}>
                                {tier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Determines PSF rate and feature set</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}

                {draft.step === 4 ? (
                  <Card>
                    <CardContent className="space-y-3 pt-6 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">School</span>
                        <span className="font-medium">{form.getValues('name')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">State</span>
                        <span>{form.getValues('region')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contact</span>
                        <span>{form.getValues('contactEmail')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tier</span>
                        <span>{form.getValues('tierCode')}</span>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <div className="flex gap-3 pt-4">
                  {draft.step > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep((draft.step - 1) as 0 | 1 | 2 | 3 | 4)}
                    >
                      Back
                    </Button>
                  ) : null}
                  {draft.step < 4 ? (
                    <button type="button" className={`flex-1 ${REGIONAL_UI.btnPrimary}`} onClick={() => void handleNext()}>
                      Continue
                    </button>
                  ) : (
                    <button type="submit" className={`flex-1 ${REGIONAL_UI.btnPrimary}`} disabled={provision.isPending}>
                      {provision.isPending ? 'Submitting…' : 'Submit for provisioning'}
                    </button>
                  )}
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </PageBody>
  );
}
