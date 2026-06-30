'use client';

import Link from 'next/link';
import type { TenantResponse } from '@loomis/contracts';
import {
  AlertTriangle,
  Building2,
  Globe2,
  Lightbulb,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { Control, FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
  Input,
  SmartSearchSelect,
  cn,
} from '@loomis/ui-web';

import { ChipOptionPicker, SmartHint } from '@/components/shared/smart-form';
import { getLgaOptionsForState } from '@/lib/geo/nigerian-lgas';
import { NIGERIAN_STATE_OPTIONS } from '@/lib/geo/nigerian-states';
import {
  SCHOOL_NEED_OPTIONS,
  STUDENT_BAND_OPTIONS,
  composeTenantAddress,
  detectEmailDomainTypo,
  findSimilarTenants,
  formatNigerianPhoneInput,
  formatSchoolName,
  previewSchoolSlug,
  recommendTierCode,
  tierRecommendationCopy,
  type SchoolNeedProfile,
  type StudentBand,
} from '@/lib/provision/tenant-provision-smart';

export type AddressParts = {
  street: string;
  area: string;
  lga: string;
};

export function parseTenantAddress(address: string, state: string): AddressParts {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { street: '', area: '', lga: '' };
  }

  let working = [...parts];
  if (state && working[working.length - 1]?.toLowerCase() === state.toLowerCase()) {
    working = working.slice(0, -1);
  }

  const lgaOptions = getLgaOptionsForState(state).map((option) => option.value.toLowerCase());
  let lga = '';
  if (working.length > 0) {
    const candidate = working[working.length - 1] ?? '';
    if (lgaOptions.includes(candidate.toLowerCase())) {
      lga = candidate;
      working = working.slice(0, -1);
    }
  }

  const street = working[0] ?? '';
  const area = working.slice(1).join(', ');

  return { street, area, lga };
}

function SmartNotice({
  tone,
  children,
}: {
  tone: 'info' | 'warn';
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px] leading-relaxed',
        tone === 'warn'
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-brand-100 bg-brand-50/70 text-brand-900',
      )}
    >
      {tone === 'warn' ? (
        <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      ) : (
        <Sparkles aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function ProvisionSchoolNameField<T extends FieldValues>({
  control,
  name,
  inputClass,
  labelClass,
  existingTenants = [],
  tenantLinkBase = '/platform/tenants',
}: {
  control: Control<T>;
  name: FieldPath<T>;
  inputClass: string;
  labelClass?: (label: string, required?: boolean) => ReactNode;
  existingTenants?: TenantResponse[];
  tenantLinkBase?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      rules={{ required: 'School name is required', minLength: { value: 2, message: 'Min 2 characters' } }}
      render={({ field }) => {
        const formatted = formatSchoolName(field.value ?? '');
        const slugPreview = previewSchoolSlug(formatted || field.value || '');
        const similar = findSimilarTenants(formatted || field.value || '', existingTenants);

        return (
          <FormItem className="lg:col-span-2">
            {labelClass ? (
              labelClass('School name', true)
            ) : (
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                School name <span className="text-brand-600">*</span>
              </p>
            )}
            <FormControl>
              <div className="relative">
                <Building2
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                />
                <Input
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) => field.onChange(event.target.value)}
                  onBlur={() => {
                    const next = formatSchoolName(field.value ?? '');
                    if (next && next !== field.value) field.onChange(next);
                    field.onBlur();
                  }}
                  className={cn(inputClass, 'pl-9')}
                  placeholder="e.g. Greenfield Academy"
                />
              </div>
            </FormControl>

            {formatted && formatted !== field.value ? (
              <SmartNotice tone="info">
                Suggested format: <strong>{formatted}</strong>
              </SmartNotice>
            ) : null}

            {slugPreview.slug.length >= 3 ? (
              <SmartNotice tone="info">
                <span className="inline-flex items-center gap-1.5">
                  <Globe2 aria-hidden className="size-3.5" />
                  Public site preview:{' '}
                  <span className="font-mono text-[10px]">
                    {slugPreview.url.replace(/^https?:\/\//, '')}
                  </span>
                </span>
                {slugPreview.reserved ? (
                  <p className="mt-1 text-amber-800">This slug is reserved — pick a more specific school name.</p>
                ) : null}
              </SmartNotice>
            ) : null}

            {similar.length > 0 ? (
              <SmartNotice tone="warn">
                Similar school{similar.length > 1 ? 's' : ''} already on Loomis:{' '}
                {similar.map((tenant, index) => (
                  <span key={tenant.id}>
                    {index > 0 ? ', ' : null}
                    <Link href={`${tenantLinkBase}/${tenant.id}`} className="font-semibold underline">
                      {tenant.name}
                    </Link>
                  </span>
                ))}
              </SmartNotice>
            ) : null}

            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

export function validateAddressParts(parts: AddressParts, state: string): string | null {
  if (!state.trim()) return 'Select a state or region';
  if (!parts.lga.trim()) return 'Select a local government area (LGA)';
  if (!parts.street.trim()) return 'Enter street or house number';
  return null;
}

export function ProvisionLocationFields<T extends FieldValues>({
  control,
  regionName,
  addressName,
  region,
  inputClass,
  labelClass,
  addressParts,
  onAddressPartsChange,
}: {
  control: Control<T>;
  regionName: FieldPath<T>;
  addressName: FieldPath<T>;
  region: string;
  inputClass: string;
  labelClass?: (label: string, required?: boolean) => ReactNode;
  addressParts: AddressParts;
  onAddressPartsChange: (parts: AddressParts) => void;
}) {
  const lgaOptions = getLgaOptionsForState(region);
  const preview = composeTenantAddress({
    street: addressParts.street,
    area: addressParts.area,
    lga: addressParts.lga,
    state: region,
  });

  return (
    <>
      <FormField
        control={control}
        name={regionName}
        rules={{ required: 'Select a state or region' }}
        render={({ field }) => (
          <FormItem className="lg:col-span-2">
            {labelClass ? (
              labelClass('State / region', true)
            ) : (
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                State / region <span className="text-brand-600">*</span>
              </p>
            )}
            <FormControl>
              <SmartSearchSelect
                variant="field"
                value={(field.value as string) || null}
                onValueChange={(value) => {
                  field.onChange(value ?? '');
                  onAddressPartsChange({ ...addressParts, lga: '' });
                }}
                options={NIGERIAN_STATE_OPTIONS}
                placeholder="Select state…"
                searchPlaceholder="Search states (e.g. Lagos, FCT, Abuja)…"
              />
            </FormControl>
            <FormDescription className="text-[11px] text-neutral-400">
              Search all 37 states — LGA list updates after you pick a state.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormItem className="lg:col-span-2">
        {labelClass ? (
          labelClass('Local government area (LGA)', true)
        ) : (
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
            Local government area (LGA) <span className="text-brand-600">*</span>
          </p>
        )}
        <SmartSearchSelect
          variant="field"
          disabled={!region}
          value={addressParts.lga || null}
          onValueChange={(value) => {
            onAddressPartsChange({ ...addressParts, lga: value ?? '' });
          }}
          options={lgaOptions}
          placeholder={region ? 'Select LGA…' : 'Select state first'}
          searchPlaceholder={region ? `Search LGAs in ${region}…` : 'Select state first'}
        />
      </FormItem>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-2">
        <div>
          {labelClass ? (
            labelClass('Street / house no.', true)
          ) : (
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              Street / house no. <span className="text-brand-600">*</span>
            </p>
          )}
          <Input
            value={addressParts.street}
            onChange={(event) => onAddressPartsChange({ ...addressParts, street: event.target.value })}
            className={inputClass}
            placeholder="e.g. 12 Unity Road"
          />
        </div>
        <div>
          {labelClass ? (
            labelClass('Area / landmark', false)
          ) : (
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              Area / landmark
            </p>
          )}
          <Input
            value={addressParts.area}
            onChange={(event) => onAddressPartsChange({ ...addressParts, area: event.target.value })}
            className={inputClass}
            placeholder="e.g. GRA, Sabo"
          />
        </div>
      </div>

      <FormField
        control={control}
        name={addressName}
        rules={{ required: 'Complete the address fields above' }}
        render={() => (
          <FormItem className="lg:col-span-2">
            {labelClass ? (
              labelClass('Address preview', true)
            ) : (
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                Address preview <span className="text-brand-600">*</span>
              </p>
            )}
            <FormControl>
              <div className="relative">
                <MapPin
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-3 size-4 text-neutral-400"
                />
                <div className="min-h-[44px] rounded-lg border border-neutral-200 bg-neutral-50/80 px-3 py-2.5 pl-9 text-[13px] text-neutral-700">
                  {preview || 'Street, area, LGA, and state will appear here'}
                </div>
              </div>
            </FormControl>
            <SmartHint>We save this as one address line for billing, reports, and school profile.</SmartHint>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

export function useSyncedTenantAddress<T extends FieldValues>({
  form,
  regionName,
  addressName,
  initialAddress = '',
  initialRegion = '',
}: {
  form: UseFormReturn<T>;
  regionName: FieldPath<T>;
  addressName: FieldPath<T>;
  initialAddress?: string;
  initialRegion?: string;
}) {
  const [addressParts, setAddressParts] = useState<AddressParts>(() =>
    parseTenantAddress(initialAddress, initialRegion),
  );

  const region = form.watch(regionName) as string;

  useEffect(() => {
    const composed = composeTenantAddress({
      street: addressParts.street,
      area: addressParts.area,
      lga: addressParts.lga,
      state: region,
    });
    form.setValue(addressName, composed as T[FieldPath<T>], { shouldDirty: true, shouldValidate: false });
  }, [addressParts, region, form, addressName]);

  return { addressParts, setAddressParts };
}

export function ProvisionContactFields<T extends FieldValues>({
  control,
  emailName,
  phoneName,
  inputClass,
  labelClass,
}: {
  control: Control<T>;
  emailName: FieldPath<T>;
  phoneName: FieldPath<T>;
  inputClass: string;
  labelClass?: (label: string, required?: boolean) => ReactNode;
}) {
  return (
    <>
      <FormField
        control={control}
        name={emailName}
        rules={{
          required: 'Contact email is required',
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Enter a valid email (e.g. principal@school.ng)',
          },
        }}
        render={({ field }) => {
          const typo = detectEmailDomainTypo(field.value ?? '');

          return (
            <FormItem>
              {labelClass ? (
                labelClass('Primary contact email', true)
              ) : (
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                  Primary contact email <span className="text-brand-600">*</span>
                </p>
              )}
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
              {typo ? (
                <SmartNotice tone="warn">
                  Did you mean <button type="button" className="font-semibold underline" onClick={() => field.onChange(typo)}>{typo}</button>?
                </SmartNotice>
              ) : null}
              <FormDescription className="text-[11px] text-neutral-400">
                School Owner account and welcome email are sent here after provisioning.
              </FormDescription>
              <FormMessage />
            </FormItem>
          );
        }}
      />

      <FormField
        control={control}
        name={phoneName}
        rules={{
          required: 'Mobile phone is required',
          pattern: {
            value: /^\+234[789]\d{9}$/,
            message: 'Use Nigerian format: +2348012345678',
          },
        }}
        render={({ field }) => (
          <FormItem>
            {labelClass ? (
              labelClass('Mobile phone', true)
            ) : (
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                Mobile phone <span className="text-brand-600">*</span>
              </p>
            )}
            <FormControl>
              <div className="relative">
                <Phone
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                />
                <Input
                  {...field}
                  type="tel"
                  value={field.value ?? ''}
                  onChange={(event) => field.onChange(formatNigerianPhoneInput(event.target.value))}
                  className={cn(inputClass, 'pl-9')}
                  placeholder="0803 123 4567 or +2348031234567"
                  autoComplete="tel"
                />
              </div>
            </FormControl>
            <FormDescription className="text-[11px] text-neutral-400">
              Type 080… or +234… — we format it automatically.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

export function ProvisionTierRecommender({
  tiers,
  selectedTierCode,
  onApplyTier,
}: {
  tiers: Array<{ code: string; name: string }>;
  selectedTierCode: string;
  onApplyTier: (tierCode: string) => void;
}) {
  const [studentBand, setStudentBand] = useState<StudentBand>('200_500');
  const [needs, setNeeds] = useState<SchoolNeedProfile>('basic');

  const recommended = recommendTierCode({ studentBand, needs });
  const recommendedTier = tiers.find((tier) => tier.code === recommended);

  return (
    <div className="rounded-xl border border-brand-100/60 bg-brand-50/40 p-4">
      <div className="flex items-start gap-2">
        <Lightbulb aria-hidden className="mt-0.5 size-4 text-brand-700" />
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-800">
              Smart tier picker
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-neutral-600">
              Answer two quick questions — we&apos;ll suggest the right commercial tier for this school.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              How many students?
            </p>
            <ChipOptionPicker
              options={STUDENT_BAND_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              value={studentBand}
              onChange={setStudentBand}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              What does this school need?
            </p>
            <ChipOptionPicker
              options={SCHOOL_NEED_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              value={needs}
              onChange={setNeeds}
            />
          </div>

          <div className="rounded-lg border border-white/80 bg-white/90 p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
              Recommended
            </p>
            <p className="mt-1 text-[14px] font-bold text-neutral-900">
              {recommendedTier?.name ?? recommended}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-neutral-600">
              {tierRecommendationCopy(recommended)}
            </p>
            {selectedTierCode !== recommended ? (
              <button
                type="button"
                onClick={() => onApplyTier(recommended)}
                className="mt-3 rounded-lg bg-brand-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-brand-700"
              >
                Use {recommendedTier?.name ?? recommended}
              </button>
            ) : (
              <p className="mt-2 text-[11px] font-semibold text-emerald-700">Already selected</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
