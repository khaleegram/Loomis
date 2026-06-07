'use client';

import { useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldAlert, TriangleAlert } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
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
  cn,
} from '@loomis/ui-web';
import { useStepUpMfa, useStartBreakGlass } from '@loomis/api-client';
import { uuidv7 } from 'uuidv7';

import { useBreakGlassStore } from '@/lib/platform/break-glass-store';

const breakGlassFormSchema = z.object({
  supportTicketId: z
    .string()
    .min(3, 'Ticket ID is required (min 3 characters)')
    .max(64, 'Ticket ID must be ≤ 64 characters'),
  reason: z
    .string()
    .min(10, 'Please provide a reason (min 10 characters)')
    .max(500),
  mfaCode: z
    .string()
    .length(6, 'Enter your 6-digit authenticator code'),
});

type BreakGlassFormValues = z.infer<typeof breakGlassFormSchema>;

interface BreakGlassModalProps {
  open: boolean;
  tenantId: string;
  tenantName: string;
  onClose: () => void;
}

/**
 * Break-Glass Activation Modal (US-PLT-006).
 * Amber alert + ticket ID + reason + TOTP + destructive red confirm.
 * All actions in the resulting session are audit-logged server-side.
 */
export function BreakGlassModal({
  open,
  tenantId,
  tenantName,
  onClose,
}: BreakGlassModalProps) {
  const activate = useBreakGlassStore((s) => s.activate);
  const stepUp = useStepUpMfa();
  const startBreakGlass = useStartBreakGlass();
  const idempotencyKeyRef = useRef(uuidv7());

  const form = useForm<BreakGlassFormValues>({
    resolver: zodResolver(breakGlassFormSchema),
    defaultValues: { supportTicketId: '', reason: '', mfaCode: '' },
  });

  const handleClose = useCallback(() => {
    form.reset();
    idempotencyKeyRef.current = uuidv7();
    onClose();
  }, [form, onClose]);

  async function onSubmit(values: BreakGlassFormValues) {
    try {
      // Step 1: Obtain step-up MFA token for break-glass action
      const stepUpResult = await stepUp.mutateAsync({
        action: 'break_glass',
        code: values.mfaCode,
      });

      // Step 2: Activate break-glass session with the MFA token
      const session = await startBreakGlass.mutateAsync({
        body: { tenantId, supportTicketId: values.supportTicketId },
        mfaToken: stepUpResult.mfaToken,
        idempotencyKey: idempotencyKeyRef.current,
      });

      // Step 3: Store session in Zustand so the red strip appears
      activate({
        sessionId: session.id,
        tenantId: session.tenantId,
        tenantName,
        supportTicketId: session.supportTicketId,
        expiresAt: new Date(session.expiresAt).getTime(),
      });

      handleClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Activation failed. Check your code and try again.';
      form.setError('root', { message });
      // Regenerate idempotency key for the next attempt
      idempotencyKeyRef.current = uuidv7();
    }
  }

  const isSubmitting = stepUp.isPending || startBreakGlass.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <ShieldAlert aria-hidden className="size-5 text-red-600" />
            Activate Break-Glass Session
          </DialogTitle>
          <DialogDescription className="sr-only">
            Privileged access to tenant {tenantName}. All actions are logged and reviewed.
          </DialogDescription>
        </DialogHeader>

        {/* Amber warning alert — do NOT soften */}
        <Alert className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
          <TriangleAlert aria-hidden className="size-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Privileged Access — All Actions Are Logged
          </AlertTitle>
          <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
            This session grants temporary access to{' '}
            <strong className="font-semibold">{tenantName}</strong> outside the normal
            permission model. Every action you take is immutably recorded and will be
            reviewed by the platform security team. Sessions expire in{' '}
            <strong>60 minutes</strong> and cannot be extended.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-1 space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="supportTicketId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Support Ticket ID</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. SUP-2025-00481"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for access</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe the specific issue requiring break-glass access…"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* TOTP challenge — inline in form, no external dialog */}
            <div
              className={cn(
                'space-y-3 rounded-md border p-4',
                'border-neutral-200 bg-neutral-50 dark:border-forest-800 dark:bg-forest-900',
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                MFA Challenge
              </p>
              <FormField
                control={form.control}
                name="mfaCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Authenticator code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="000000"
                        className="font-mono text-center text-xl tracking-[0.4em]"
                        onChange={(e) => {
                          field.onChange(e.target.value.replace(/\D/g, '').slice(0, 6));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.formState.errors.root ? (
              <Alert variant="destructive">
                <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting}
                className="gap-2"
              >
                <ShieldAlert aria-hidden className="size-4" />
                {isSubmitting ? 'Activating…' : 'Activate Break-Glass'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
