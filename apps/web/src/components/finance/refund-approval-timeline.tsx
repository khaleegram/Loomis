'use client';

import {
  useCreateRefund,
  useDecideRefundWorkflow,
  usePayments,
  useWorkflowInstance,
} from '@loomis/api-client';
import {
  createRefundRequest,
  refundReasonCode,
  type RefundReasonCode,
  type RefundRequestResponse,
  type Role,
  type WorkflowInstanceResponse,
  type WorkflowStepResponse,
} from '@loomis/contracts';
import { formatKobo } from '@loomis/core';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CurrencyInput,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  JournalVoucherCard,
  LedgerEntryTable,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Circle, Clock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { StepUpVerificationFields } from '@/components/academic/step-up-verification-fields';
import { financeErrorMessage } from '@/lib/finance/finance-errors';
import { useStepUpVerification } from '@/lib/auth/use-step-up-verification';
import { refundApproverChainForTenant } from '@/lib/workflow/core-refund-chain';
import { useTenantExperience } from '@/lib/tenant/use-tenant-experience';
import {
  buildRefundProvisionalLegs,
  buildRefundReversalLegs,
  formatRefundReason,
  formatRefundStatus,
  formatStudentRef,
} from '@/lib/finance/finance-labels';
import { useStudentNameMap } from '@/lib/student/use-student-name-map';

interface TimelineNode {
  id: string;
  label: string;
  role: Role | 'cashier';
  status: 'complete' | 'active' | 'pending' | 'rejected';
  step?: WorkflowStepResponse;
}

const createRefundFormSchema = z.object({
  paymentId: z.string().uuid(),
  amountMinor: z.number().int().positive(),
  reasonCode: refundReasonCode,
  reasonNotes: z.string().min(10).max(1000),
});

const approveFormSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  comment: z.string().max(1000).optional(),
  mfaCode: z.string().optional(),
});

type CreateRefundFormValues = z.infer<typeof createRefundFormSchema>;
type ApproveFormValues = z.infer<typeof approveFormSchema>;

function buildTimelineNodes(
  refund: RefundRequestResponse,
  workflow: WorkflowInstanceResponse | undefined,
  approverChain: Role[],
): TimelineNode[] {
  const nodes: TimelineNode[] = [
    {
      id: 'cashier',
      label: 'Cashier initiated',
      role: 'cashier',
      status: 'complete',
    },
  ];

  for (const role of approverChain) {
    const step = workflow?.steps?.find((s) => s.approverRole === role);
    let status: TimelineNode['status'] = 'pending';
    if (step) {
      if (step.status === 'approved') status = 'complete';
      else if (step.status === 'active') status = 'active';
      else if (step.status === 'rejected') status = 'rejected';
    }
    if (refund.status === 'rejected' && step?.status === 'rejected') {
      status = 'rejected';
    }
    nodes.push({
      id: role,
      label: `${role.replace(/_/g, ' ')} approval`,
      role,
      status,
      step,
    });
  }

  nodes.push({
    id: 'executed',
    label: 'Executed · ledger reversal',
    role: 'school_owner',
    status:
      refund.status === 'executed'
        ? 'complete'
        : refund.status === 'rejected'
          ? 'rejected'
          : 'pending',
  });

  return nodes;
}

function NodeIcon({ status }: { status: TimelineNode['status'] }) {
  if (status === 'complete') {
    return (
      <span className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-white dark:bg-mint-500 dark:text-forest-950">
        <Check className="size-4" />
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="flex size-8 items-center justify-center rounded-full border-2 border-gold-400 bg-gold/10">
        <Clock className="size-4 text-gold-600 dark:text-gold-400" />
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="flex size-8 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <Circle className="size-4" />
      </span>
    );
  }
  return (
    <span className="flex size-8 items-center justify-center rounded-full border border-border bg-muted">
      <Circle className="size-4 text-muted-foreground" />
    </span>
  );
}

interface RefundApprovalTimelineProps {
  tenantId: string;
  termId: string;
  refunds: RefundRequestResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  currentRole: Role | null;
  canInitiate: boolean;
  canApprove: boolean;
}

export function RefundApprovalTimeline({
  tenantId,
  termId,
  refunds,
  selectedId,
  onSelect,
  currentRole,
  canInitiate,
  canApprove,
}: RefundApprovalTimelineProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [showLedgerDrillDown, setShowLedgerDrillDown] = useState(false);
  const { experienceTier, financeMode, flags } = useTenantExperience();

  const selected = refunds.find((r) => r.id === selectedId) ?? refunds[0] ?? null;
  const workflowQuery = useWorkflowInstance(tenantId, selected?.workflowInstanceId ?? '');
  const workflow = workflowQuery.data;

  const verifiedPaymentsQuery = usePayments(tenantId, {
    termId,
    status: 'verified',
  });
  const verifiedPayments = verifiedPaymentsQuery.data?.payments ?? [];
  const { resolveStudentName } = useStudentNameMap(tenantId);

  const createRefund = useCreateRefund(tenantId, termId);

  const selectedAmountMinor = selected?.amountMinor ?? 0;
  const stepUpVerification = useStepUpVerification({
    action: 'refund_approve',
    refundAmountMinor: selectedAmountMinor,
  });
  const { channel, codeRef, ensureStepUpToken, sendStepUpSms, smsMeta, smsSent } =
    stepUpVerification;

  const activeStep = workflow?.steps?.find((s) => s.status === 'active');
  const decideRefund = useDecideRefundWorkflow({
    tenantId,
    instanceId: selected?.workflowInstanceId ?? '',
    stepId: activeStep?.id ?? '',
    termId,
    ensureStepUpToken,
  });

  const approverChain = useMemo(
    () =>
      refundApproverChainForTenant({
        experienceTier,
        financeMode,
        flags,
        amountMinor: selected?.amountMinor ?? 0,
      }),
    [experienceTier, financeMode, flags, selected?.amountMinor],
  );

  const timelineNodes = useMemo(
    () => (selected ? buildTimelineNodes(selected, workflow, approverChain) : []),
    [selected, workflow, approverChain],
  );

  const createForm = useForm<CreateRefundFormValues>({
    resolver: zodResolver(createRefundFormSchema),
    defaultValues: {
      paymentId: '',
      amountMinor: 0,
      reasonCode: 'duplicate',
      reasonNotes: '',
    },
  });

  const approveForm = useForm<ApproveFormValues>({
    resolver: zodResolver(approveFormSchema),
    defaultValues: { decision: 'approve', comment: '', mfaCode: '' },
  });

  const canActOnStep =
    canApprove &&
    activeStep &&
    currentRole === activeStep.approverRole &&
    selected?.status === 'pending';

  const voucherLegs =
    selected?.status === 'executed'
      ? buildRefundReversalLegs(selected.amountMinor)
      : selected
        ? buildRefundProvisionalLegs(selected.amountMinor)
        : [];

  const pairedLabel =
    selected?.status === 'executed'
      ? `Reverses payment ···${selected.paymentId.slice(-8)}`
      : undefined;

  async function onCreateRefund(values: CreateRefundFormValues) {
    try {
      const body = createRefundRequest.parse(values);
      const result = await createRefund.mutateAsync(body);
      onSelect(result.refund.id);
      setCreateOpen(false);
      createForm.reset();
      createRefund.regenerateIdempotencyKey();
    } catch (error) {
      createForm.setError('root', { message: financeErrorMessage(error) });
    }
  }

  async function onApprove(values: ApproveFormValues) {
    if (!selected || !activeStep) return;
    if (values.decision === 'approve' && channel !== 'none') {
      const code = values.mfaCode ?? '';
      if (code.length !== 6) {
        approveForm.setError('mfaCode', {
          message:
            channel === 'sms'
              ? 'Enter the 6-digit SMS code sent to your phone.'
              : 'Enter your 6-digit authenticator code.',
        });
        return;
      }
      codeRef.current = code;
    } else {
      codeRef.current = '';
    }
    try {
      await decideRefund.mutateFinancialAsync({
        decision: values.decision,
        comment: values.comment?.trim() || undefined,
      });
      approveForm.reset();
      decideRefund.regenerateIdempotencyKey();
    } catch (error) {
      approveForm.setError('root', { message: financeErrorMessage(error) });
    }
  }

  const ledgerRows = voucherLegs.map((leg, index) => ({
    id: `${selected?.id ?? 'x'}-${index}`,
    transactionId: selected?.id ?? '',
    account: leg.account,
    narration: leg.narration,
    direction: leg.direction,
    amountMinor: leg.amountMinor,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {refunds.map((refund) => (
            <Button
              key={refund.id}
              variant={selected?.id === refund.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelect(refund.id)}
            >
              ···{refund.id.slice(-6)} · {formatKobo(refund.amountMinor)}
            </Button>
          ))}
        </div>
        {canInitiate ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Request refund
          </Button>
        ) : null}
      </div>

      {!selected ? (
        <Card className="shadow-card">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {refunds.length === 0
              ? 'No refund requests yet.'
              : 'Select a refund to view the approval timeline.'}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Refund approval timeline</CardTitle>
                <CardDescription>
                  {formatRefundReason(selected.reasonCode)} ·{' '}
                  {formatStudentRef(selected.studentId, resolveStudentName(selected.studentId))} ·{' '}
                  {formatKobo(selected.amountMinor)}
                </CardDescription>
              </div>
              <Badge variant={selected.status === 'executed' ? 'default' : 'gold'}>
                {formatRefundStatus(selected.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-0 border-l border-border pl-8">
              {timelineNodes.map((node, index) => {
                const showVoucher =
                  node.id === 'cashier' ||
                  node.status === 'complete' ||
                  node.status === 'active' ||
                  (node.id === 'executed' && selected.status === 'executed');

                return (
                  <li key={node.id} className="relative pb-8 last:pb-0">
                    <span className="absolute -left-[2.125rem] top-0">
                      <NodeIcon status={node.status} />
                    </span>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold capitalize text-foreground">
                          {node.label}
                        </p>
                        {node.status === 'active' ? (
                          <p className="text-xs text-gold-600 dark:text-gold-400">
                            Awaiting action
                          </p>
                        ) : null}
                      </div>

                      {showVoucher && voucherLegs.length > 0 ? (
                        <JournalVoucherCard
                          voucherLabel={
                            node.id === 'executed'
                              ? 'Reversal voucher'
                              : node.id === 'cashier'
                                ? 'Provisional reversal'
                                : 'Approval voucher preview'
                          }
                          legs={voucherLegs}
                          pairedVoucherLabel={node.id === 'executed' ? pairedLabel : undefined}
                          immutable={node.id === 'executed'}
                        />
                      ) : null}

                      {node.status === 'active' &&
                      canActOnStep &&
                      node.step?.id === activeStep?.id ? (
                        <Form {...approveForm}>
                          <form
                            onSubmit={approveForm.handleSubmit(onApprove)}
                            className="space-y-3 rounded-sm border border-gold/30 bg-gold/5 p-4 dark:bg-forest-900"
                          >
                            <Alert variant="warning">
                              <AlertDescription>
                                Approving posts an immutable ledger reversal. PSF treatment:{' '}
                                {selected.psfTreatment.replace(/_/g, ' ')}.
                              </AlertDescription>
                            </Alert>

                            <FormField
                              control={approveForm.control}
                              name="comment"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Comment (optional)</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} rows={2} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <StepUpVerificationFields
                              control={approveForm.control}
                              name="mfaCode"
                              channel={channel}
                              maskedPhone={smsMeta.maskedPhone}
                              devBypass={smsMeta.devBypass}
                              onSendSms={sendStepUpSms}
                              smsSent={smsSent}
                            />

                            {approveForm.formState.errors.root ? (
                              <Alert variant="destructive">
                                <AlertDescription>
                                  {approveForm.formState.errors.root.message}
                                </AlertDescription>
                              </Alert>
                            ) : null}

                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                disabled={decideRefund.isSubmitting}
                                onClick={() => {
                                  approveForm.setValue('decision', 'approve');
                                  void approveForm.handleSubmit(onApprove)();
                                }}
                              >
                                Approve refund
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                disabled={decideRefund.isSubmitting}
                                onClick={() => {
                                  approveForm.setValue('decision', 'reject');
                                  void approveForm.handleSubmit(onApprove)();
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          </form>
                        </Form>
                      ) : null}
                    </div>
                    {index < timelineNodes.length - 1 ? (
                      <span className="absolute -left-px top-8 h-full w-px bg-border" aria-hidden />
                    ) : null}
                  </li>
                );
              })}
            </ol>

            <div className="mt-6">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowLedgerDrillDown((v) => !v)}
              >
                {showLedgerDrillDown ? 'Hide ledger drill-down' : 'Show ledger drill-down'}
              </Button>
              {showLedgerDrillDown ? (
                <div className="mt-3">
                  <LedgerEntryTable entries={ledgerRows} />
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Initiate refund</SheetTitle>
            <SheetDescription>
              Cashier request against a verified payment (US-FIN-006).
            </SheetDescription>
          </SheetHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(onCreateRefund)}
              className="mt-6 space-y-4"
            >
              <FormField
                control={createForm.control}
                name="paymentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verified payment</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {verifiedPayments.map((payment) => (
                          <SelectItem key={payment.id} value={payment.id}>
                            {formatStudentRef(payment.studentId, resolveStudentName(payment.studentId))} ·{' '}
                            {formatKobo(payment.amountMinor)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="amountMinor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Refund amount</FormLabel>
                    <FormControl>
                      <CurrencyInput valueKobo={field.value} onChangeKobo={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="reasonCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {refundReasonCode.options.map((code) => (
                          <SelectItem key={code} value={code}>
                            {formatRefundReason(code as RefundReasonCode)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="reasonNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {createForm.watch('amountMinor') > 0 ? (
                <JournalVoucherCard
                  voucherLabel="Provisional reversal"
                  legs={buildRefundProvisionalLegs(createForm.watch('amountMinor'))}
                />
              ) : null}

              {createForm.formState.errors.root ? (
                <Alert variant="destructive">
                  <AlertDescription>{createForm.formState.errors.root.message}</AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" disabled={createRefund.isSubmitting} className="w-full">
                Submit refund request
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
