'use client';

import { useDeregisterDevice, useDevices, useRevokeSession, useSessions } from '@loomis/api-client';
import { Button, Skeleton } from '@loomis/ui-web';
import { MonitorSmartphone, Shield } from 'lucide-react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useTenantExperience } from '@/lib/tenant/use-tenant-experience';

function CoreMfaPolicyNotice() {
  const { isCore, isAdvanced } = useTenantExperience();

  if (!isCore && !isAdvanced) return null;

  return (
    <section className={`${ACADEMIC_UI.dataPanel} space-y-3 p-5`}>
      <h2 className="text-[14px] font-semibold text-neutral-900">Sign-in &amp; verification policy</h2>
      {isCore ? (
        <ul className="list-disc space-y-2 pl-5 text-[13px] text-neutral-600">
          <li>
            School Owner, Principal, and Finance staff sign in with password plus SMS on a new device.
            Trusted devices skip SMS for 30 days.
          </li>
          <li>Census lock always requires an SMS code (Owner).</li>
          <li>
            Refund approvals at or above ₦100,000 require SMS verification; smaller refunds do not.
          </li>
          <li>Teachers sign in with password only.</li>
          <li>
            Parents use password on trusted devices; new devices and online fee payments require SMS.
          </li>
          <li className="text-neutral-500">
            Local development without Termii: SMS codes use <span className="font-mono">000000</span>.
          </li>
        </ul>
      ) : (
        <p className="text-[13px] text-neutral-600">
          Advanced tier: authenticator (TOTP) step-up applies to high-risk actions such as census
          lock, large refunds, and data export. Optional SMS login may be enabled via tenant flags.
        </p>
      )}
    </section>
  );
}

export default function SecuritySettingsPage() {
  const sessions = useSessions();
  const devices = useDevices();
  const revokeSession = useRevokeSession();
  const deregisterDevice = useDeregisterDevice();

  return (
    <div className="space-y-6">
      <p className="text-[13px] text-neutral-500">
        Manage your active sessions and registered devices (US-HRM-008).
      </p>

      <CoreMfaPolicyNotice />

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Shield aria-hidden className="size-4 text-brand-600" />
          <h2 className="text-[14px] font-semibold text-neutral-900">Active sessions</h2>
        </div>
        <div className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
          {sessions.isLoading ? (
            <div className="p-5">
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : sessions.isError ? (
            <p className="p-5 text-[13px] text-destructive" role="alert">
              Failed to load sessions.
            </p>
          ) : (sessions.data?.sessions.length ?? 0) === 0 ? (
            <p className="p-5 text-[13px] text-neutral-500">No active sessions.</p>
          ) : (
            <ul className="divide-y divide-brand-50/80">
              {sessions.data?.sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[13px]"
                >
                  <div>
                    <p className="font-medium text-neutral-900">
                      {session.platform ?? 'Unknown device'}
                      {session.isCurrent ? (
                        <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                          Current
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Last active {new Date(session.lastActiveAt).toLocaleString()}
                      {session.ipAddress ? ` · ${session.ipAddress}` : ''}
                    </p>
                  </div>
                  {!session.isCurrent ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={revokeSession.isPending}
                      onClick={() => void revokeSession.mutateAsync({ sessionId: session.id })}
                    >
                      Revoke
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <MonitorSmartphone aria-hidden className="size-4 text-brand-600" />
          <h2 className="text-[14px] font-semibold text-neutral-900">Registered devices</h2>
        </div>
        <div className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
          {devices.isLoading ? (
            <div className="p-5">
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : devices.isError ? (
            <p className="p-5 text-[13px] text-destructive" role="alert">
              Failed to load devices.
            </p>
          ) : (devices.data?.devices.length ?? 0) === 0 ? (
            <p className="p-5 text-[13px] text-neutral-500">No registered devices.</p>
          ) : (
            <ul className="divide-y divide-brand-50/80">
              {devices.data?.devices.map((device) => (
                <li
                  key={device.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[13px]"
                >
                  <div>
                    <p className="font-medium capitalize text-neutral-900">{device.platform}</p>
                    <p className="text-[11px] text-neutral-500">
                      Registered {new Date(device.registeredAt).toLocaleDateString()} · Last seen{' '}
                      {new Date(device.lastSeenAt).toLocaleString()}
                      {device.hasPersistentToken ? ' · Persistent MFA token' : ''}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deregisterDevice.isPending}
                    onClick={() => void deregisterDevice.mutateAsync({ deviceId: device.id })}
                  >
                    Deregister
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
