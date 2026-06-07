'use client';

import { use, useState } from 'react';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  Skeleton,
  Textarea,
} from '@loomis/ui-web';
import { usePlatformTenant, useSuspendTenant, useReinstateTenant } from '@loomis/api-client';
import { suspendTenantRequest } from '@loomis/contracts';
import { formatKobo } from '@loomis/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { uuidv7 } from 'uuidv7';
import { useRef } from 'react';

import { PageBody, PageHeader } from '@/components/platform/platform-shell';
import { PsfRateCard } from '@/components/platform/psf-rate-card';
import { BreakGlassModal } from '@/components/platform/break-glass-modal';

const suspendFormSchema = suspendTenantRequest.extend({
  confirmName: z.string().min(1, 'Type the school name to confirm'),
});

type SuspendFormValues = z.infer<typeof suspendFormSchema>;

interface TenantDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function TenantDetailPage({ params }: TenantDetailPageProps) {
  const { id: tenantId } = use(params);
  const { data: tenant, isLoading } = usePlatformTenant(tenantId);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [bgModalOpen, setBgModalOpen] = useState(false);
  const suspendIdempotencyKey = useRef(uuidv7());
  const reinstateIdempotencyKey = useRef(uuidv7());

  const suspend = useSuspendTenant(tenantId);
  const reinstate = useReinstateTenant(tenantId);

  const suspendForm = useForm<SuspendFormValues>({
    resolver: zodResolver(suspendFormSchema),
    defaultValues: { reason: '', confirmName: '' },
  });

  async function handleSuspend(values: SuspendFormValues) {
    if (values.confirmName !== tenant?.name) {
      suspendForm.setError('confirmName', { message: "School name doesn't match" });
      return;
    }
    try {
      await suspend.mutateAsync({
        body: { reason: values.reason },
        idempotencyKey: suspendIdempotencyKey.current,
      });
      setSuspendDialogOpen(false);
      suspendForm.reset();
      suspendIdempotencyKey.current = uuidv7();
    } catch {
      suspendForm.setError('root', { message: 'Failed to suspend tenant. Try again.' });
    }
  }

  async function handleReinstate() {
    try {
      await reinstate.mutateAsync({
        body: {},
        idempotencyKey: reinstateIdempotencyKey.current,
      });
      reinstateIdempotencyKey.current = uuidv7();
    } catch {
      // Error surfaces via mutation state
    }
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="School detail" />
        <PageBody>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </PageBody>
      </>
    );
  }

  if (!tenant) {
    return (
      <>
        <PageHeader title="Not found" />
        <PageBody>
          <Alert variant="destructive">
            <AlertDescription>Tenant not found.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  const isSuspended = tenant.status === 'suspended';

  return (
    <>
      <PageHeader
        title={tenant.name}
        description={`${tenant.region} · ${tenant.tierCode}`}
        breadcrumbs={
          <Link
            href="/platform/tenants"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft aria-hidden className="size-3" />
            Tenants
          </Link>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {!isSuspended ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                  onClick={() => setSuspendDialogOpen(true)}
                >
                  Suspend
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40"
                  onClick={() => setBgModalOpen(true)}
                >
                  <ShieldAlert aria-hidden className="size-4" />
                  Break-Glass
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleReinstate()}
                disabled={reinstate.isPending}
              >
                {reinstate.isPending ? 'Reinstating…' : 'Reinstate'}
              </Button>
            )}
          </div>
        }
      />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* School metadata */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-serif text-base">School Info</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[
                  { label: 'Status', value: <Badge variant={isSuspended ? 'destructive' : 'default'}>{tenant.status}</Badge> },
                  { label: 'Contact email', value: tenant.contactEmail },
                  { label: 'Region', value: tenant.region },
                  { label: 'Address', value: tenant.address },
                  { label: 'Tier', value: tenant.tierCode },
                  {
                    label: 'Current PSF Rate',
                    value: tenant.currentPsfRateMinor != null
                      ? `${formatKobo(tenant.currentPsfRateMinor)} / student`
                      : 'Tier default',
                  },
                  {
                    label: 'Tenant ID',
                    value: <span className="font-mono text-xs">{tenant.id}</span>,
                  },
                  {
                    label: 'Referral code',
                    value: tenant.referralCode ? (
                      <span className="font-mono text-xs">···{tenant.referralCode.slice(-8)}</span>
                    ) : '—',
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="col-span-1">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-0.5 text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>

              {isSuspended && tenant.suspendedReason ? (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
                    Suspension reason
                  </p>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                    {tenant.suspendedReason}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* PSF Rate Card */}
          <PsfRateCard
            tenantId={tenant.id}
            tenantName={tenant.name}
            currentRateMinor={tenant.currentPsfRateMinor}
          />
        </div>
      </PageBody>

      {/* Suspend dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Suspend {tenant.name}</DialogTitle>
            <DialogDescription>
              This will immediately block all school actors from accessing their console.
              Type the school name to confirm.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertDescription>
              Suspending a school locks out all its users immediately. This should only be
              done for non-payment, fraud, or compliance violations.
            </AlertDescription>
          </Alert>
          <Form {...suspendForm}>
            <form
              onSubmit={suspendForm.handleSubmit(handleSuspend)}
              className="space-y-4"
              noValidate
            >
              <FormField
                control={suspendForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Reason for suspension…" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={suspendForm.control}
                name="confirmName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Type <strong>{tenant.name}</strong> to confirm
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={tenant.name} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {suspendForm.formState.errors.root ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    {suspendForm.formState.errors.root.message}
                  </AlertDescription>
                </Alert>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSuspendDialogOpen(false)}
                  disabled={suspend.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={suspend.isPending}
                >
                  {suspend.isPending ? 'Suspending…' : 'Suspend school'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Break-glass modal */}
      <BreakGlassModal
        open={bgModalOpen}
        tenantId={tenant.id}
        tenantName={tenant.name}
        onClose={() => setBgModalOpen(false)}
      />
    </>
  );
}
