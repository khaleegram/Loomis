'use client';

import { useCallback, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  useDecidePrivilegedChange,
  usePlatformPrivilegedChanges,
  useStepUpMfa,
} from '@loomis/api-client';
import type { PrivilegedChangeType } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Form,
  Skeleton,
  cn,
} from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CheckCircle2, Clock, History, ShieldCheck } from 'lucide-react';

import { StepUpMfaFields } from '@/components/academic/step-up-mfa-fields';
import { PlatformConsoleHero } from '@/components/platform/platform-console-hero';
import { PageBody } from '@/components/platform/platform-shell';
import {
  FormSubmitError,
  SmartFormPanel,
  SmartFormSection,
  SmartHint,
} from '@/components/shared/smart-form';
import { PLATFORM_PAGE_CLASS, PLATFORM_UI } from '@/lib/platform/platform-ui';
import { SURFACES } from '@/lib/design/surfaces';

const approveFormSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  notes: z.string().max(500).optional(),
  mfaCode: z.string().length(6, 'Enter your 6-digit authenticator code'),
});

type ApproveFormValues = z.infer<typeof approveFormSchema>;

const CHANGE_TYPE_LABELS: Record<PrivilegedChangeType, string> = {
  psf_rate_override: 'PSF Rate Override',
  psf_waiver: 'PSF Waiver',
  ledger_adjustment: 'Ledger Adjustment',
  tenant_suspension_override: 'Suspension Override',
  referral_rule_change: 'Referral Rule Change',
  support_impersonation: 'Support Impersonation',
  data_export: 'Data Export',
};

function ApprovalRow({
  change,
}: {
  change: {
    id: string;
    changeType: PrivilegedChangeType;
    targetTenantId: string | null;
    status: string;
    riskScore: number;
    reason: string;
    requestedByUserId: string;
    createdAt: string;
    approvedByUserId: string | null;
  };
}) {
  const [expanded, setExpanded] = useState(false);
  const mfaCodeRef = useRef('');
  const stepUp = useStepUpMfa();

  const decide = useDecidePrivilegedChange({
    changeId: change.id,
    ensureStepUpToken: useCallback(
      async (action) => {
        const code = mfaCodeRef.current;
        if (!code || code.length !== 6) {
          throw new Error('Enter your 6-digit authenticator code.');
        }
        return stepUp.mutateAsync({ action, code });
      },
      [stepUp],
    ),
  });

  const form = useForm<ApproveFormValues>({
    resolver: zodResolver(approveFormSchema),
    defaultValues: { decision: 'approve', notes: '', mfaCode: '' },
  });

  async function onDecide(values: ApproveFormValues) {
    mfaCodeRef.current = values.mfaCode;
    try {
      await decide.mutateFinancialAsync({
        decision: values.decision,
        notes: values.notes || undefined,
      });
      setExpanded(false);
    } catch {
      form.setError('root', { message: 'Decision failed. Try again.' });
    }
  }

  const isPending = change.status === 'requested';

  return (
    <div
      className={cn(
        'rounded-xl border transition-colors',
        isPending ? 'border-brand-200 bg-brand-50/20' : 'border-brand-50/80 bg-white',
      )}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-4 p-4 text-left"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-neutral-900">
              {CHANGE_TYPE_LABELS[change.changeType]}
            </span>
            <Badge
              variant={
                change.status === 'approved'
                  ? 'default'
                  : change.status === 'rejected'
                    ? 'destructive'
                    : change.status === 'requested'
                      ? 'gold'
                      : 'secondary'
              }
            >
              {change.status}
            </Badge>
            {change.riskScore >= 70 ? (
              <Badge variant="destructive" className="text-xs">
                High risk · {change.riskScore}
              </Badge>
            ) : null}
          </div>
          <p className="line-clamp-1 text-[12px] text-neutral-500">{change.reason}</p>
          <p className="text-[11px] text-neutral-400">
            Requested {formatDistanceToNow(new Date(change.createdAt), { addSuffix: true })}
            {change.targetTenantId ? ` · Tenant ···${change.targetTenantId.slice(-8)}` : ' · Global'}
          </p>
        </div>
        <span className="shrink-0 text-[11px] text-neutral-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && isPending ? (
        <div className="border-t border-brand-50/80 p-4">
          <SmartFormPanel bodyClassName="p-4 sm:p-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onDecide)} className="space-y-4" noValidate>
                <SmartFormSection title="Change payload" description="Review before dual approval">
                  <pre className="max-h-40 overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-[11px] whitespace-pre-wrap break-all">
                    {JSON.stringify(change, null, 2)}
                  </pre>
                </SmartFormSection>

                <SmartFormSection title="Step-up MFA" description="Required for privileged decisions">
                  <StepUpMfaFields control={form.control} name="mfaCode" />
                  <SmartHint>Enter your 6-digit authenticator code to approve or reject.</SmartHint>
                </SmartFormSection>

                <FormSubmitError message={form.formState.errors.root?.message ?? null} />

                <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
                  <button
                    type="button"
                    className={PLATFORM_UI.btnPrimary}
                    onClick={() => {
                      form.setValue('decision', 'approve');
                      void form.handleSubmit(onDecide)();
                    }}
                    disabled={decide.isSubmitting}
                  >
                    Approve
                  </button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      form.setValue('decision', 'reject');
                      void form.handleSubmit(onDecide)();
                    }}
                    disabled={decide.isSubmitting}
                  >
                    Reject
                  </Button>
                </div>
              </form>
            </Form>
          </SmartFormPanel>
        </div>
      ) : null}
    </div>
  );
}

type Tab = 'pending' | 'history';

export default function ApprovalsPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const { data: pendingData, isLoading: pendingLoading } = usePlatformPrivilegedChanges('requested');
  const { data: allData, isLoading: allLoading } = usePlatformPrivilegedChanges();

  const pending = pendingData?.changes ?? [];
  const all = allData?.changes ?? [];
  const isLoading = tab === 'pending' ? pendingLoading : allLoading;
  const items = tab === 'pending' ? pending : all;
  const highRisk = pending.filter((c) => c.riskScore >= 70).length;

  return (
    <PageBody className={PLATFORM_PAGE_CLASS}>
      <div className="space-y-6">
        <PlatformConsoleHero
          sectionLabel="Dual approval"
          title="Privileged change approvals"
          description="Pending dual-approval privileged changes requiring a second platform actor and step-up MFA."
          isLoading={pendingLoading}
          stats={[
            {
              label: 'Pending',
              value: String(pending.length),
              hint: 'Awaiting decision',
              icon: Clock,
              gradient: pending.length > 0 ? SURFACES.kpi.g4 : SURFACES.kpi.g3,
            },
            {
              label: 'High risk',
              value: String(highRisk),
              hint: 'Score ≥ 70',
              icon: ShieldCheck,
              gradient: SURFACES.kpi.g4,
            },
            {
              label: 'Total',
              value: String(all.length),
              hint: 'All time',
              icon: History,
              gradient: SURFACES.kpi.g1,
            },
            {
              label: 'Approved',
              value: String(all.filter((c) => c.status === 'approved').length),
              hint: 'Completed',
              icon: CheckCircle2,
              gradient: SURFACES.kpi.g2,
            },
          ]}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={tab === 'pending' ? PLATFORM_UI.chipActive : PLATFORM_UI.chipInactive}
            onClick={() => setTab('pending')}
          >
            Pending{pending.length > 0 ? ` (${pending.length})` : ''}
          </button>
          <button
            type="button"
            className={tab === 'history' ? PLATFORM_UI.chipActive : PLATFORM_UI.chipInactive}
            onClick={() => setTab('history')}
          >
            History
          </button>
        </div>

        <div className={`${PLATFORM_UI.dataPanel} p-5 sm:p-6`}>
          <p className={PLATFORM_UI.sectionLabel}>
            {tab === 'pending' ? 'Awaiting your approval' : 'All changes'}
          </p>
          {isLoading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-[13px] text-neutral-500">
              {tab === 'pending' ? 'No pending approvals. All caught up.' : 'No privileged changes recorded yet.'}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {items.map((change) => (
                <ApprovalRow key={change.id} change={change} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageBody>
  );
}
