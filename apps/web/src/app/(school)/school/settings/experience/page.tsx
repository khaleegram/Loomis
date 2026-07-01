'use client';

import { useStaffDirectory, useUpdateTenantExperience } from '@loomis/api-client';
import type { FinanceMode, TenantExperienceFlags } from '@loomis/contracts';
import { Skeleton } from '@loomis/ui-web';
import {
  ClipboardList,
  Inbox,
  Layers,
  ShieldCheck,
  Sparkles,
  Timer,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { SplitFinanceSetupWizard } from '@/components/settings/split-finance-setup-wizard';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useCan, useAdmissionsRequirePrincipalApproval } from '@/lib/auth/use-capability';
import { splitFinanceStaffStatus } from '@/lib/finance/split-finance-status';
import { SEMANTIC } from '@/lib/design/surfaces';
import { useTenantExperience } from '@/lib/tenant/use-tenant-experience';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

function TierPlanCard() {
  const tenantId = useTenantId();
  const { isLoading, experienceTier, isAdvanced, isEnterprise, isCore } = useTenantExperience();
  const updateExperience = useUpdateTenantExperience(tenantId ?? '');
  const [error, setError] = useState<string | null>(null);

  const onEnableAdvanced = async () => {
    if (!tenantId) return;
    setError(null);
    try {
      await updateExperience.mutateAsync({ experienceTier: 'advanced' });
    } catch (e) {
      setError((e as Error).message ?? 'Failed to enable Advanced.');
    }
  };

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
            ({experienceTier}). Core includes finance officer mode, password-only sign-in, and simple audit.
          </p>
        </div>
      </div>

      {isCore ? (
        <div className="rounded-xl bg-muted/40 px-4 py-3.5">
          <p className="text-[13px] font-medium text-neutral-800">Upgrade to Advanced</p>
          <p className="mt-1 text-[12px] text-neutral-500">
            Unlock split finance, workflow inbox, optional TOTP, deputy exam officer, and dedicated
            timetable officer — self-serve below.
          </p>
          <button
            type="button"
            disabled={updateExperience.isPending}
            onClick={() => void onEnableAdvanced()}
            className={`mt-3 inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[13px] font-medium ${SEMANTIC.cta.primary}`}
          >
            <Sparkles aria-hidden className="size-3.5" />
            {updateExperience.isPending ? 'Enabling…' : 'Enable Advanced'}
          </button>
          {error ? (
            <p className="mt-2 text-[12px] text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      {isEnterprise ? (
        <div className="rounded-xl border border-brand-100/50 bg-brand-50/40 px-4 py-3.5">
          <p className="text-[13px] font-medium text-neutral-800">Enterprise features</p>
          <p className="mt-1 text-[12px] text-neutral-500">
            Attestations, emergency publish, and mandatory TOTP are managed by Loomis. Contact{' '}
            <a href="mailto:support@loomis.com" className="font-medium text-brand-700 underline">
              support@loomis.com
            </a>{' '}
            for changes.
          </p>
        </div>
      ) : null}

      {isAdvanced && !isEnterprise ? (
        <p className="text-[12px] text-emerald-700">
          Advanced is active — configure finance split and optional modules below.
        </p>
      ) : null}
    </section>
  );
}

const ADVANCED_FLAG_TOGGLES: {
  key: keyof TenantExperienceFlags;
  label: string;
  description: string;
  icon: typeof Inbox;
}[] = [
  {
    key: 'workflowsInbox',
    label: 'Workflow inbox',
    description: 'Multi-step approvals module for refunds, fee changes, and grade fixes.',
    icon: Inbox,
  },
  {
    key: 'timetableDedicatedOfficer',
    label: 'Dedicated timetable officer',
    description: 'Invite a Timetable Officer with full builder access.',
    icon: Timer,
  },
  {
    key: 'deputyExamEnabled',
    label: 'Deputy exam officer',
    description: 'Optional deputy with 72h automation when the Exam Officer is inactive.',
    icon: ShieldCheck,
  },
  {
    key: 'totpOptional',
    label: 'Authenticator app (TOTP)',
    description: 'Allow staff to use an authenticator instead of SMS for step-up actions.',
    icon: ShieldCheck,
  },
];

function AdvancedFeatureToggles() {
  const tenantId = useTenantId();
  const { isAdvanced, flags, isLoading } = useTenantExperience();
  const updateExperience = useUpdateTenantExperience(tenantId ?? '');
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-2xl" />;
  }

  if (!isAdvanced) return null;

  const onToggle = async (key: keyof TenantExperienceFlags, next: boolean) => {
    if (!tenantId) return;
    setError(null);
    try {
      await updateExperience.mutateAsync({ flags: { [key]: next } });
    } catch (e) {
      setError((e as Error).message ?? 'Failed to update setting.');
    }
  };

  return (
    <section className={`${ACADEMIC_UI.dataPanel} space-y-4 p-5`}>
      <div>
        <h2 className="text-[14px] font-semibold text-neutral-900">Advanced modules</h2>
        <p className="mt-1 text-[13px] text-neutral-600">
          Enable optional roles and workflows. Full inbox UX ships when Workflow Inbox is on (Sprint
          9).
        </p>
      </div>

      <ul className="space-y-3">
        {ADVANCED_FLAG_TOGGLES.map(({ key, label, description, icon: Icon }) => (
          <li key={key}>
            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-muted/40 px-4 py-3.5">
              <span className="flex min-w-0 gap-3">
                <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-600" />
                <span>
                  <span className="block text-[13px] font-medium text-neutral-800">{label}</span>
                  <span className="mt-0.5 block text-[12px] text-neutral-500">{description}</span>
                </span>
              </span>
              <input
                type="checkbox"
                checked={Boolean(flags[key as keyof typeof flags])}
                disabled={updateExperience.isPending}
                onChange={(event) => void onToggle(key, event.target.checked)}
                className="mt-1 size-5 shrink-0 rounded border-neutral-300 text-brand-600 focus:ring-brand-200"
                aria-label={label}
              />
            </label>
          </li>
        ))}
      </ul>

      {error ? (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function FinanceModeSelector() {
  const tenantId = useTenantId();
  const { isLoading, financeMode, isAdvanced } = useTenantExperience();
  const updateExperience = useUpdateTenantExperience(tenantId ?? '');
  const [error, setError] = useState<string | null>(null);

  const onSelect = async (mode: FinanceMode) => {
    if (!tenantId || mode === financeMode) return;
    if (mode === 'split' && !isAdvanced) {
      setError('Enable Advanced before using split cashier and accountant mode.');
      return;
    }
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
            One finance officer for small teams, or separate Cashier and Accountant when Advanced is
            enabled.
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
            Combined preset — log, verify, and configure fees on one desk.
          </p>
        </button>
        <button
          type="button"
          disabled={updateExperience.isPending || !isAdvanced}
          onClick={() => void onSelect('split')}
          className={`rounded-xl px-4 py-4 text-left transition-all ${
            financeMode === 'split'
              ? 'bg-brand-50 shadow-sm ring-2 ring-brand-300/60'
              : 'bg-muted/40 hover:bg-muted/60'
          } ${!isAdvanced ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          <p className="text-[13px] font-semibold text-neutral-900">Separate cashier &amp; accountant</p>
          <p className="mt-1 text-[12px] text-neutral-500">
            Two distinct staff accounts — segregation of duties enforced.
          </p>
        </button>
      </div>

      {!isAdvanced ? (
        <p className="text-[12px] text-neutral-500">Split finance requires Advanced tier.</p>
      ) : null}

      {error ? (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function SplitFinanceSection() {
  const tenantId = useTenantId();
  const { financeMode, isAdvanced } = useTenantExperience();
  const { data: directory } = useStaffDirectory(tenantId ?? '');
  const status = useMemo(() => splitFinanceStaffStatus(directory?.staff), [directory?.staff]);

  if (!isAdvanced || financeMode !== 'split') return null;

  return (
    <div className="space-y-3">
      {!status.isComplete ? (
        <p className="text-[13px] text-amber-800">
          Split mode is on — invite both roles below. The same person cannot hold Cashier and
          Accountant.
        </p>
      ) : null}
      <SplitFinanceSetupWizard />
    </div>
  );
}

function AdmissionsPolicyToggle() {
  const tenantId = useTenantId();
  const requirePrincipal = useAdmissionsRequirePrincipalApproval();
  const { isAdvanced, flags } = useTenantExperience();
  const updateExperience = useUpdateTenantExperience(tenantId ?? '');
  const [error, setError] = useState<string | null>(null);

  const onTogglePrincipal = async () => {
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

  const onToggleOwnerStep = async () => {
    if (!tenantId) return;
    setError(null);
    try {
      await updateExperience.mutateAsync({
        flags: { admissionsRequireOwnerApproval: !flags.admissionsRequireOwnerApproval },
      });
    } catch (e) {
      setError((e as Error).message ?? 'Failed to update admission workflow.');
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
            By default, the Admin Officer registers a student in one step. Turn this on if
            applications must stay pending until leadership approves.
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
          onChange={() => void onTogglePrincipal()}
          className="size-5 rounded border-neutral-300 text-brand-600 focus:ring-brand-200"
          aria-label="Require Principal or Owner approval on admissions"
        />
      </label>

      {isAdvanced && flags.workflowsInbox ? (
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-muted/40 px-4 py-3.5">
          <span>
            <span className="block text-[13px] font-medium text-neutral-800">
              Owner step in admission workflow
            </span>
            <span className="mt-0.5 block text-[12px] text-neutral-500">
              When on, Principal approves first then Owner signs off in the workflow inbox.
            </span>
          </span>
          <input
            type="checkbox"
            checked={flags.admissionsRequireOwnerApproval}
            disabled={updateExperience.isPending}
            onChange={() => void onToggleOwnerStep()}
            className="size-5 rounded border-neutral-300 text-brand-600 focus:ring-brand-200"
            aria-label="Require Owner as second admission approver"
          />
        </label>
      ) : null}

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
      <AdvancedFeatureToggles />
      <FinanceModeSelector />
      <SplitFinanceSection />
      <AdmissionsPolicyToggle />
    </div>
  );
}
