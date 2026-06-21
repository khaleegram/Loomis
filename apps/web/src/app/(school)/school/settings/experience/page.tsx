'use client';

import { useUpdateTenantExperience } from '@loomis/api-client';
import type { FinanceMode } from '@loomis/contracts';
import { Skeleton } from '@loomis/ui-web';
import { ClipboardList, Layers, Sparkles, Wallet } from 'lucide-react';
import { useState } from 'react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useCan, useAdmissionsRequirePrincipalApproval } from '@/lib/auth/use-capability';
import { SEMANTIC } from '@/lib/design/surfaces';
import { useTenantExperience } from '@/lib/tenant/use-tenant-experience';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

function TierPlanCard() {
  const { isLoading, experienceTier, isAdvanced, isEnterprise } = useTenantExperience();

  if (isLoading) {
    return <Skeleton className="h-28 w-full rounded-2xl" />;
  }

  const tierLabel = isEnterprise ? 'Enterprise' : isAdvanced ? 'Advanced' : 'Core';

  return (
    <section className={`${ACADEMIC_UI.dataPanel} space-y-4 p-5`}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Layers aria-hidden className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-[14px] font-semibold text-neutral-900">Experience tier</h2>
          <p className="text-[13px] text-neutral-600">
            Your school runs on <span className="font-semibold text-neutral-900">{tierLabel}</span>{' '}
            ({experienceTier}). Core includes finance officer mode, SMS hybrid login, and simple audit.
          </p>
        </div>
      </div>

      {experienceTier === 'core' ? (
        <div className="rounded-xl bg-muted/40 px-4 py-3.5">
          <p className="text-[13px] font-medium text-neutral-800">Upgrade to Advanced</p>
          <p className="mt-1 text-[12px] text-neutral-500">
            Self-serve split finance, workflow inbox, optional TOTP, and deputy exam officer — coming
            in Advanced settings (Sprint 8). Contact Loomis support to preview on a staging tenant.
          </p>
          <button
            type="button"
            disabled
            className={`mt-3 inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg px-4 text-[13px] font-medium opacity-60 ${SEMANTIC.cta.primary}`}
          >
            <Sparkles aria-hidden className="size-3.5" />
            Enable Advanced (soon)
          </button>
        </div>
      ) : null}
    </section>
  );
}

function FinanceModeSelector() {
  const tenantId = useTenantId();
  const { isLoading, financeMode } = useTenantExperience();
  const updateExperience = useUpdateTenantExperience(tenantId ?? '');
  const [error, setError] = useState<string | null>(null);

  const onSelect = async (mode: FinanceMode) => {
    if (!tenantId || mode === financeMode) return;
    setError(null);
    try {
      await updateExperience.mutateAsync({ financeMode: mode });
    } catch (e) {
      setError((e as Error).message ?? 'Failed to update finance mode.');
    }
  };

  if (isLoading) {
    return <Skeleton className="h-32 w-full rounded-2xl" />;
  }

  return (
    <section className={`${ACADEMIC_UI.dataPanel} space-y-4 p-5`}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Wallet aria-hidden className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-[14px] font-semibold text-neutral-900">Finance desk setup</h2>
          <p className="text-[13px] leading-relaxed text-neutral-600">
            How does your school handle fee collection and verification today? This sets labels and
            capability presets — split cashier/accountant invites ship in Advanced (Sprint 8).
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={updateExperience.isPending}
          onClick={() => void onSelect('combined')}
          className={`rounded-xl px-4 py-4 text-left transition-all ${
            financeMode === 'combined'
              ? 'bg-brand-50 shadow-sm ring-2 ring-brand-300/60'
              : 'bg-muted/40 hover:bg-muted/60'
          }`}
        >
          <p className="text-[13px] font-semibold text-neutral-900">One finance officer</p>
          <p className="mt-1 text-[12px] text-neutral-500">
            Recommended for Core — log, verify, and configure fees on one desk (combined preset).
          </p>
        </button>
        <button
          type="button"
          disabled={updateExperience.isPending}
          onClick={() => void onSelect('split')}
          className={`rounded-xl px-4 py-4 text-left transition-all ${
            financeMode === 'split'
              ? 'bg-brand-50 shadow-sm ring-2 ring-brand-300/60'
              : 'bg-muted/40 hover:bg-muted/60'
          }`}
        >
          <p className="text-[13px] font-semibold text-neutral-900">Separate cashier &amp; accountant</p>
          <p className="mt-1 text-[12px] text-neutral-500">
            Stores split mode now; two-invite wizard and SoD enforcement land in Sprint 8.
          </p>
        </button>
      </div>

      {error ? (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function AdmissionsPolicyToggle() {
  const tenantId = useTenantId();
  const requirePrincipal = useAdmissionsRequirePrincipalApproval();
  const updateExperience = useUpdateTenantExperience(tenantId ?? '');
  const [error, setError] = useState<string | null>(null);

  const onToggle = async () => {
    if (!tenantId) return;
    setError(null);
    try {
      await updateExperience.mutateAsync({
        flags: { admissionsRequirePrincipalApproval: !requirePrincipal },
      });
    } catch (e) {
      setError((e as Error).message ?? 'Failed to update admissions policy.');
    }
  };

  return (
    <section className={`${ACADEMIC_UI.dataPanel} space-y-4 p-5`}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <ClipboardList aria-hidden className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-[14px] font-semibold text-neutral-900">Admissions approvals</h2>
          <p className="text-[13px] leading-relaxed text-neutral-600">
            By default, the Admin Officer registers a student in one step — the student record is
            created immediately. Turn this on if applications must stay pending until leadership
            approves.
          </p>
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-muted/40 px-4 py-3.5">
        <span className="text-[13px] font-medium text-neutral-800">
          Require Principal or Owner approval
        </span>
        <input
          type="checkbox"
          checked={requirePrincipal}
          disabled={updateExperience.isPending}
          onChange={() => void onToggle()}
          className="size-5 rounded border-neutral-300 text-brand-600 focus:ring-brand-200"
          aria-label="Require Principal or Owner approval on admissions"
        />
      </label>

      {error ? (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export default function ExperienceSettingsPage() {
  const isOwner = useCan('census.lock');
  const { isLoading } = useTenantExperience();

  if (!isOwner) {
    return (
      <p className="text-[13px] text-neutral-500">
        Only the School Owner can change school experience settings.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-[13px] text-neutral-500">
        Onboarding choices and tier options for your school (Owner only).
      </p>
      <TierPlanCard />
      <FinanceModeSelector />
      <AdmissionsPolicyToggle />
    </div>
  );
}
