'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useAdmissionDecision } from '@loomis/api-client';
import {
  admissionDecisionRequest,
  type AdmissionDecisionRequest,
  type AdmissionResponse,
  type EmailDeliveryResult,
} from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from '@loomis/ui-web';
import { Copy, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';

import {
  formatCalendarDate,
  studentDisplayName,
} from '@/lib/student/student-labels';
import { studentErrorMessage } from '@/lib/student/student-errors';

const decisionFormSchema = z
  .object({
    decision: z.enum(['approve', 'decline']),
    declineReason: z.string().max(500).optional(),
    admissionNo: z.string().max(64).optional(),
    acknowledged: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.decision === 'decline') {
      if (!values.declineReason || values.declineReason.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A reason of at least 3 characters is required when declining',
          path: ['declineReason'],
        });
      }
      if (!values.acknowledged) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Confirm you understand this decision is recorded permanently',
          path: ['acknowledged'],
        });
      }
    }
  });

type DecisionFormValues = z.infer<typeof decisionFormSchema>;

interface AdmissionDecisionDialogProps {
  tenantId: string;
  admission: AdmissionResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDecided?: () => void;
}

export function AdmissionDecisionDialog({
  tenantId,
  admission,
  open,
  onOpenChange,
  onDecided,
}: AdmissionDecisionDialogProps) {
  const [mode, setMode] = useState<'approve' | 'decline'>('approve');
  const [portalCredentials, setPortalCredentials] = useState<{
    loginEmail: string;
    temporaryPassword: string;
  } | null>(null);
  const [credentialsEmail, setCredentialsEmail] = useState<EmailDeliveryResult | null>(null);
  const decision = useAdmissionDecision(tenantId, admission?.id ?? '');

  const form = useForm<DecisionFormValues>({
    resolver: zodResolver(decisionFormSchema) as Resolver<DecisionFormValues>,
    defaultValues: {
      decision: 'approve',
      declineReason: '',
      admissionNo: '',
      acknowledged: false,
    },
  });

  useEffect(() => {
    if (open) {
      setMode('approve');
      form.reset({
        decision: 'approve',
        declineReason: '',
        admissionNo: '',
        acknowledged: false,
      });
      setPortalCredentials(null);
      setCredentialsEmail(null);
    }
  }, [open, admission?.id, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!admission) return;
    const body: AdmissionDecisionRequest =
      values.decision === 'approve'
        ? {
            decision: 'approve',
            ...(values.admissionNo && values.admissionNo.length >= 3
              ? { admissionNo: values.admissionNo }
              : {}),
          }
        : {
            decision: 'decline',
            declineReason: values.declineReason!,
          };

    try {
      const result = await decision.mutateAsync(body);
      if (result.portalCredentials) {
        setPortalCredentials(result.portalCredentials);
        setCredentialsEmail(result.credentialsEmail ?? null);
        return;
      }
      onOpenChange(false);
      onDecided?.();
    } catch (err) {
      form.setError('root', { message: studentErrorMessage(err) });
    }
  });

  if (!admission) return null;

  const applicantName = studentDisplayName(admission.firstName, admission.lastName);

  if (portalCredentials) {
    return (
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setPortalCredentials(null);
            setCredentialsEmail(null);
            onDecided?.();
          }
          onOpenChange(next);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Admission approved</DialogTitle>
            <DialogDescription>
              {applicantName} has been admitted. Share these portal login credentials securely — the
              temporary password is shown only once.
            </DialogDescription>
          </DialogHeader>

          <Alert variant={credentialsEmail?.sent ? 'default' : 'warning'}>
            <AlertTitle className="flex items-center gap-2">
              <Mail aria-hidden className="size-4" />
              {credentialsEmail?.sent ? 'Email sent to guardian' : 'Email not sent'}
            </AlertTitle>
            <AlertDescription>
              {credentialsEmail?.sent
                ? `Portal login details were emailed to ${credentialsEmail.recipient}.`
                : credentialsEmail?.reason === 'SES_NOT_CONFIGURED'
                  ? 'Email is not configured yet. Copy the credentials below and share them with the guardian.'
                  : 'Could not deliver the email. Copy the credentials below and share them manually.'}
            </AlertDescription>
          </Alert>

          <Alert variant="warning">
            <AlertTitle>Student portal access</AlertTitle>
            <AlertDescription>
              Default portal password is <span className="font-mono font-medium">00000000</span>. The student must
              change it on first login.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">Sign-in link</span>
              <span className="font-mono text-[12px] font-medium break-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Login email</span>
              <span className="font-mono font-medium">{portalCredentials.loginEmail}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Temporary password</span>
              <span className="font-mono font-medium">{portalCredentials.temporaryPassword}</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void navigator.clipboard.writeText(
                  [
                    `Sign in: ${typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'}`,
                    `Login email: ${portalCredentials.loginEmail}`,
                    `Temporary password: ${portalCredentials.temporaryPassword}`,
                  ].join('\n'),
                )
              }
            >
              <Copy aria-hidden className="mr-2 size-4" />
              Copy credentials
            </Button>
            <Button
              type="button"
              onClick={() => {
                setPortalCredentials(null);
                setCredentialsEmail(null);
                onOpenChange(false);
                onDecided?.();
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record admission decision</DialogTitle>
          <DialogDescription>
            Formal decision for {applicantName} ({admission.referenceNumber}). This action is
            audited (US-SIS-002).
          </DialogDescription>
        </DialogHeader>

        <Alert variant="warning">
          <AlertTitle>Permanent record</AlertTitle>
          <AlertDescription>
            {mode === 'decline'
              ? 'Declining records the reason and notifies the admissions office. This cannot be undone.'
              : 'Approving creates a student record and enables enrollment. Ensure details are verified.'}
          </AlertDescription>
        </Alert>

        <div className="flex gap-2 rounded-md bg-muted p-1">
          <Button
            type="button"
            variant={mode === 'approve' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => {
              setMode('approve');
              form.setValue('decision', 'approve');
              form.setValue('acknowledged', false);
            }}
          >
            Approve
          </Button>
          <Button
            type="button"
            variant={mode === 'decline' ? 'destructive' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => {
              setMode('decline');
              form.setValue('decision', 'decline');
            }}
          >
            Decline
          </Button>
        </div>

        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <dl className="grid gap-1 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Applicant</dt>
              <dd className="font-medium">{applicantName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Date of birth</dt>
              <dd>{formatCalendarDate(admission.dateOfBirth)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Guardian</dt>
              <dd>{admission.guardianName}</dd>
            </div>
          </dl>
        </div>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === 'approve' ? (
              <FormField
                control={form.control}
                name="admissionNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admission number (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Auto-generated if left blank" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="declineReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for decline</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={3}
                          placeholder="Document why this application was not accepted…"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="acknowledged"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I confirm this reason will be permanently recorded
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </>
            )}

            {form.formState.errors.root ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.root.message}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={mode === 'decline' ? 'destructive' : 'default'}
                disabled={decision.isSubmitting}
              >
                {decision.isSubmitting
                  ? 'Recording…'
                  : mode === 'approve'
                    ? 'Approve admission'
                    : 'Decline application'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
