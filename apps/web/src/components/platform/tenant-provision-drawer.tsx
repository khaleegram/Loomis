'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CurrencyInput,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { provisionTenantRequest } from '@loomis/contracts';
import { usePlatformTiers, useProvisionTenant } from '@loomis/api-client';
import { uuidv7 } from 'uuidv7';

const STEPS = ['School Info', 'Tier & Rate', 'Review'] as const;

/** Form schema — empty optional fields become undefined before API validation. */
const provisionFormSchema = provisionTenantRequest
  .extend({
    referralCode: z.string().max(64).optional(),
    initialPsfRateMinor: z.number().int().nonnegative().optional(),
  })
  .transform((data) => ({
    ...data,
    referralCode: data.referralCode?.trim() ? data.referralCode.trim() : undefined,
    initialPsfRateMinor:
      data.initialPsfRateMinor != null && data.initialPsfRateMinor > 0
        ? data.initialPsfRateMinor
        : undefined,
  }));

type ProvisionFormInput = z.input<typeof provisionFormSchema>;
type ProvisionFormOutput = z.output<typeof provisionFormSchema>;

interface TenantProvisionDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function TenantProvisionDrawer({ open, onClose }: TenantProvisionDrawerProps) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [success, setSuccess] = useState(false);
  const idempotencyKeyRef = useRef(uuidv7());

  const { data: tiersData, isLoading: tiersLoading } = usePlatformTiers();
  const provision = useProvisionTenant();

  const form = useForm<ProvisionFormInput, unknown, ProvisionFormOutput>({
    resolver: zodResolver(provisionFormSchema),
    defaultValues: {
      name: '',
      region: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      tierCode: '',
      referralCode: undefined,
      initialPsfRateMinor: undefined,
    },
  });

  function handleClose() {
    form.reset();
    setStep(0);
    setSuccess(false);
    idempotencyKeyRef.current = uuidv7();
    onClose();
  }

  async function handleNextStep() {
    let valid = false;
    if (step === 0) {
      valid = await form.trigger(['name', 'region', 'contactEmail', 'contactPhone', 'address']);
    } else if (step === 1) {
      valid = await form.trigger(['tierCode']);
    }
    if (valid) setStep((s) => (s + 1) as 0 | 1 | 2);
  }

  async function handleSubmit(values: ProvisionFormOutput) {
    try {
      await provision.mutateAsync({ body: values, idempotencyKey: idempotencyKeyRef.current });
      setSuccess(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Provisioning failed. Try again.';
      form.setError('root', { message });
      idempotencyKeyRef.current = uuidv7();
    }
  }

  const values = form.watch();

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {success ? (
          <div className="flex flex-col items-center gap-6 py-8 text-center">
            <CheckCircle2 aria-hidden className="size-16 text-success" />
            <div>
              <p className="font-serif text-xl font-semibold">School provisioned</p>
              <p className="mt-2 text-sm text-muted-foreground">
                <strong>{values.name}</strong> is now active and ready for onboarding.
              </p>
            </div>
            <Button type="button" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-lg">Provision School</DialogTitle>
              <DialogDescription>
                Step {step + 1} of {STEPS.length} — {STEPS[step]}
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-1.5">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors',
                    i <= step ? 'bg-brand-600' : 'bg-neutral-200',
                  )}
                />
              ))}
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="mt-4 space-y-5"
                noValidate
              >
                {step === 0 ? (
                  <>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>School name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Greenfield Academy" />
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
                          <FormLabel>State / Region</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Lagos" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="principal@school.ng"
                              autoComplete="email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile phone</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="tel"
                              placeholder="+2348012345678"
                              autoComplete="tel"
                            />
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
                          <FormLabel>Full address</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Street, City, State" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : null}

                {step === 1 ? (
                  <>
                    <FormField
                      control={form.control}
                      name="tierCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tier</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger disabled={tiersLoading}>
                                <SelectValue placeholder="Select tier…" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(tiersData?.tiers ?? []).length === 0 ? (
                                <p className="px-3 py-2 text-sm text-muted-foreground">
                                  {tiersLoading ? 'Loading tiers…' : 'No tiers available'}
                                </p>
                              ) : (
                                (tiersData?.tiers ?? []).map((t) => (
                                  <SelectItem key={t.id} value={t.code}>
                                    {t.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="initialPsfRateMinor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PSF rate override (optional)</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              valueKobo={field.value ?? 0}
                              onChangeKobo={(v) => field.onChange(v > 0 ? v : undefined)}
                            />
                          </FormControl>
                          <FormDescription>
                            Leave blank to use the tier&apos;s default PSF rate. Rate of zero is
                            permanently blocked (CON-011).
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
                          <FormLabel>Referral code (optional)</FormLabel>
                          <FormControl>
                            <Input
                              value={field.value ?? ''}
                              onChange={(e) =>
                                field.onChange(e.target.value.trim() || undefined)
                              }
                              placeholder="Referral code from regional partner"
                              spellCheck={false}
                            />
                          </FormControl>
                          <FormDescription>
                            Permanently links this school to a referral participant (CON-009).
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : null}

                {step === 2 ? (
                  <Card className="shadow-none">
                    <CardContent className="space-y-3 p-4">
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        {[
                          { label: 'Name', value: values.name },
                          { label: 'Region', value: values.region },
                          { label: 'Contact', value: values.contactEmail },
                          { label: 'Address', value: values.address },
                          { label: 'Tier', value: values.tierCode },
                          {
                            label: 'PSF Rate',
                            value: values.initialPsfRateMinor
                              ? `₦${(values.initialPsfRateMinor / 100).toFixed(0)}/student`
                              : 'Tier default',
                          },
                          {
                            label: 'Referral',
                            value: values.referralCode || 'None',
                          },
                        ].map(({ label, value }) => (
                          <div key={label} className="col-span-1">
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {label}
                            </dt>
                            <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </CardContent>
                  </Card>
                ) : null}

                {form.formState.errors.root ? (
                  <Alert variant="destructive">
                    <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex items-center justify-between gap-3 pt-2">
                  {step > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStep((s) => (s - 1) as 0 | 1 | 2)}
                      disabled={provision.isPending}
                    >
                      <ChevronLeft aria-hidden className="mr-1 size-4" />
                      Back
                    </Button>
                  ) : (
                    <div />
                  )}

                  {step < 2 ? (
                    <Button type="button" size="sm" onClick={() => void handleNextStep()}>
                      Next
                      <ChevronRight aria-hidden className="ml-1 size-4" />
                    </Button>
                  ) : (
                    <Button type="submit" size="sm" disabled={provision.isPending}>
                      {provision.isPending ? 'Provisioning…' : 'Provision school'}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
