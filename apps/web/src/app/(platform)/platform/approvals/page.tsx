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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { PageBody, PageHeader } from '@/components/platform/platform-shell';
import { StepUpMfaFields } from '@/components/academic/step-up-mfa-fields';

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
        'rounded-lg border transition-colors',
        isPending
          ? 'border-gold-200 dark:border-gold-800/50'
          : 'border-neutral-200 dark:border-forest-800',
      )}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-4 p-4 text-left"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm text-foreground">
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
          <p className="text-xs text-muted-foreground line-clamp-1">{change.reason}</p>
          <p className="text-xs text-muted-foreground">
            Requested{' '}
            {formatDistanceToNow(new Date(change.createdAt), { addSuffix: true })}
            {change.targetTenantId
              ? ` · Tenant ···${change.targetTenantId.slice(-8)}`
              : ' · Global'}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && isPending ? (
        <div className="border-t border-neutral-200 p-4 dark:border-forest-800">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onDecide)}
              className="space-y-4"
              noValidate
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Before
                  </p>
                  <pre className="mt-1 rounded bg-muted p-2 text-xs whitespace-pre-wrap break-all">
                    {JSON.stringify(change, null, 2)}
                  </pre>
                </div>
              </div>

              <StepUpMfaFields control={form.control} name="mfaCode" />

              {form.formState.errors.root ? (
                <Alert variant="destructive">
                  <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    form.setValue('decision', 'approve');
                    void form.handleSubmit(onDecide)();
                  }}
                  disabled={decide.isSubmitting}
                >
                  Approve
                </Button>
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
        </div>
      ) : null}
    </div>
  );
}

export default function ApprovalsPage() {
  const { data: pendingData, isLoading: pendingLoading } = usePlatformPrivilegedChanges('requested');
  const { data: allData, isLoading: allLoading } = usePlatformPrivilegedChanges();

  const pending = pendingData?.changes ?? [];
  const all = allData?.changes ?? [];

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Pending dual-approval privileged changes requiring a second platform actor"
        actions={
          pending.length > 0 ? (
            <Badge variant="gold" className="text-sm">
              {pending.length} pending
            </Badge>
          ) : undefined
        }
      />
      <PageBody>
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending
              {pending.length > 0 ? (
                <span className="ml-2 rounded-full bg-gold-400/20 px-1.5 py-0.5 text-xs font-bold text-gold-700 dark:text-gold-300">
                  {pending.length}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-serif text-base">Awaiting your approval</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-lg" />
                    ))}
                  </div>
                ) : pending.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No pending approvals. All caught up.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pending.map((change) => (
                      <ApprovalRow key={change.id} change={change} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-serif text-base">All changes</CardTitle>
              </CardHeader>
              <CardContent>
                {allLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                ) : all.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No privileged changes recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {all.map((change) => (
                      <ApprovalRow key={change.id} change={change} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}
