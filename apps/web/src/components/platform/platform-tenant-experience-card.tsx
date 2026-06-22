'use client';

import { useTenantExperienceQuery, useUpdateTenantExperience } from '@loomis/api-client';
import type { ExperienceTier } from '@loomis/contracts';
import { Alert, AlertDescription, Button } from '@loomis/ui-web';
import { Building2, Shield } from 'lucide-react';
import { useState } from 'react';

import { BRONZE } from '@/components/dashboard/dashboard-primitives';

const TIERS: { value: ExperienceTier; label: string; description: string }[] = [
  { value: 'core', label: 'Core', description: 'Default — simplified finance and inline approvals.' },
  {
    value: 'advanced',
    label: 'Advanced',
    description: 'Workflow inbox, optional TOTP, split finance toggles.',
  },
  {
    value: 'enterprise',
    label: 'Enterprise',
    description: 'Full workflow matrix, mandatory TOTP step-up, attestations, emergency publish.',
  },
];

interface PlatformTenantExperienceCardProps {
  tenantId: string;
  tenantName: string;
}

export function PlatformTenantExperienceCard({
  tenantId,
  tenantName,
}: PlatformTenantExperienceCardProps) {
  const experienceQuery = useTenantExperienceQuery(tenantId);
  const updateExperience = useUpdateTenantExperience(tenantId);
  const [error, setError] = useState<string | null>(null);

  const currentTier = experienceQuery.data?.experienceTier ?? 'core';

  async function setTier(tier: ExperienceTier) {
    if (tier === currentTier) return;
    setError(null);
    try {
      await updateExperience.mutateAsync({ experienceTier: tier });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update experience tier');
    }
  }

  return (
    <div className="card overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2.5 border-b border-neutral-100 px-5 py-4">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: BRONZE.gradients.g2 }}
        >
          <Building2 aria-hidden className="size-4" />
        </span>
        <div>
          <p className="text-[12px] font-bold text-neutral-900">Role experience tier</p>
          <p className="text-[11px] text-neutral-400">Loomis-team activation for {tenantName}</p>
        </div>
      </div>

      <div className="space-y-3 p-5">
        {experienceQuery.isLoading ? (
          <p className="text-[13px] text-neutral-500">Loading tier…</p>
        ) : (
          TIERS.map((tier) => (
            <div
              key={tier.value}
              className={`flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                currentTier === tier.value
                  ? 'border-brand-300 bg-brand-50/40'
                  : 'border-neutral-100 bg-neutral-50/40'
              }`}
            >
              <div>
                <p className="text-[13px] font-bold text-neutral-900">{tier.label}</p>
                <p className="mt-0.5 text-[12px] text-neutral-600">{tier.description}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={currentTier === tier.value ? 'secondary' : 'default'}
                disabled={currentTier === tier.value || updateExperience.isPending}
                onClick={() => void setTier(tier.value)}
              >
                {currentTier === tier.value ? 'Active' : 'Activate'}
              </Button>
            </div>
          ))
        )}

        {currentTier === 'enterprise' ? (
          <div className="flex items-start gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-[12px] text-indigo-900">
            <Shield aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p>
              Enterprise enables mandatory authenticator step-up, full workflow chains, attestation
              history, and Principal emergency publish when exam SLA is breached.
            </p>
          </div>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
