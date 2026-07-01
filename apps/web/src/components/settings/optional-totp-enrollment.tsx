'use client';

import {
  useConfirmVoluntaryMfaEnrollment,
  useMfaStatus,
  useStartVoluntaryMfaEnrollment,
} from '@loomis/api-client';
import { Alert, AlertDescription, Button, Input, Skeleton } from '@loomis/ui-web';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

export function OptionalTotpEnrollmentPanel() {
  const status = useMfaStatus();
  const start = useStartVoluntaryMfaEnrollment();
  const confirm = useConfirmVoluntaryMfaEnrollment();
  const [secret, setSecret] = useState<string | null>(null);
  const [provisioningUri, setProvisioningUri] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status.isLoading) {
    return <Skeleton className="h-24 w-full rounded-2xl" />;
  }

  if (!status.data?.totpOptionalAvailable) {
    return null;
  }

  async function handleStart() {
    setError(null);
    try {
      const result = await start.mutateAsync();
      setSecret(result.secretBase32);
      setProvisioningUri(result.provisioningUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start enrollment');
    }
  }

  async function handleConfirm() {
    setError(null);
    try {
      const result = await confirm.mutateAsync({ code });
      setBackupCodes(result.backupCodes);
      setSecret(null);
      setProvisioningUri(null);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    }
  }

  if (status.data.enrolled && !backupCodes) {
    return (
      <section className={`${ACADEMIC_UI.dataPanel} space-y-2 p-5`}>
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden className="size-4 text-emerald-600" />
          <h2 className="text-[14px] font-semibold text-neutral-900">Authenticator app</h2>
        </div>
        <p className="text-[13px] text-neutral-600">
          Your account uses an authenticator app for sign-in and high-risk step-up verification.
        </p>
      </section>
    );
  }

  if (backupCodes) {
    return (
      <section className={`${ACADEMIC_UI.dataPanel} space-y-3 p-5`}>
        <h2 className="text-[14px] font-semibold text-neutral-900">Save your backup codes</h2>
        <p className="text-[13px] text-neutral-600">
          Store these one-time codes securely. Each can be used once if you lose your device.
        </p>
        <ul className="grid gap-1 rounded-lg bg-muted/40 p-3 font-mono text-[12px] sm:grid-cols-2">
          {backupCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className={`${ACADEMIC_UI.dataPanel} space-y-4 p-5`}>
      <div>
        <h2 className="text-[14px] font-semibold text-neutral-900">Authenticator app (optional)</h2>
        <p className="mt-1 text-[13px] text-neutral-600">
          Enroll Google Authenticator or a compatible app for step-up verification on high-risk actions.
        </p>
      </div>

      {!secret ? (
        <button type="button" className={ACADEMIC_UI.btnPrimarySm} onClick={() => void handleStart()} disabled={start.isPending}>
          {start.isPending ? 'Starting…' : 'Set up authenticator'}
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-[13px] text-neutral-600">
            Scan the provisioning URI in your app, or enter this secret manually:
          </p>
          <p className="break-all font-mono text-[12px] text-neutral-800">{secret}</p>
          {provisioningUri ? (
            <p className="break-all text-[11px] text-neutral-400">{provisioningUri}</p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Verification code
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="000000"
                className="font-mono"
              />
            </label>
            <Button type="button" onClick={() => void handleConfirm()} disabled={confirm.isPending || code.length !== 6}>
              {confirm.isPending ? 'Confirming…' : 'Confirm enrollment'}
            </Button>
          </div>
        </div>
      )}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
