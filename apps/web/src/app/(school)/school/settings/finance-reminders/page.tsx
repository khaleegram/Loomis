'use client';

import { useFeeReminderSettings, useUpdateFeeReminderSettings } from '@loomis/api-client';
import type { FeeReminderPreset } from '@loomis/contracts';
import { Skeleton } from '@loomis/ui-web';
import { useState } from 'react';

import { useAuth } from '@/lib/auth/auth-context';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const PRESET_OPTIONS: Array<{ value: FeeReminderPreset; label: string; description: string }> = [
  {
    value: 'standard',
    label: 'Standard',
    description:
      'Four weeks after term starts, three days before due date, then overdue reminders every two weeks.',
  },
  {
    value: 'due_date_only',
    label: 'Due date only',
    description: 'Remind three days before the due date and when fees become overdue.',
  },
  {
    value: 'minimal',
    label: 'Manual only',
    description: 'No automatic reminders — use Remind on the Balances page when you need to nudge families.',
  },
];

export default function FinanceRemindersSettingsPage() {
  const tenantId = useTenantId();
  const { session } = useAuth();
  const canManage = useCan('finance.balances.view');
  const canEdit =
    canManage &&
    session?.role != null &&
    ['school_owner', 'principal', 'accountant'].includes(session.role);

  const settingsQuery = useFeeReminderSettings(tenantId ?? '');
  const updateSettings = useUpdateFeeReminderSettings(tenantId ?? '');
  const [savedPreset, setSavedPreset] = useState<FeeReminderPreset | null>(null);

  if (!tenantId) {
    return <p className="text-sm text-muted-foreground">No school context.</p>;
  }

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have access to fee reminder settings.
      </p>
    );
  }

  const activePreset = savedPreset ?? settingsQuery.data?.preset ?? 'standard';

  async function selectPreset(preset: FeeReminderPreset) {
    if (!canEdit || preset === activePreset) return;
    setSavedPreset(preset);
    try {
      await updateSettings.mutateAsync({ preset });
    } catch {
      setSavedPreset(null);
    }
  }

  return (
    <section className="max-w-xl">
      <h2 className="text-lg font-semibold text-foreground">Fee reminders</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose how Loomis nudges parents when school fees are due. Manual reminders from Balances always
        work regardless of this setting.
      </p>

      <div className="mt-6 space-y-3">
        {settingsQuery.isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          PRESET_OPTIONS.map((option) => {
            const selected = activePreset === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={!canEdit || updateSettings.isPending}
                onClick={() => void selectPreset(option.value)}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  selected
                    ? 'border-brand-300 bg-brand-50/70 dark:border-brand-700 dark:bg-brand-900/20'
                    : 'border-border bg-card hover:border-brand-200'
                } ${!canEdit ? 'cursor-default opacity-80' : ''}`}
              >
                <p className="text-sm font-semibold text-foreground">{option.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
              </button>
            );
          })
        )}
      </div>

      {!canEdit ? (
        <p className="mt-3 text-[11px] text-neutral-500">
          Only the school owner, principal, or accountant can change reminder presets.
        </p>
      ) : null}
    </section>
  );
}
