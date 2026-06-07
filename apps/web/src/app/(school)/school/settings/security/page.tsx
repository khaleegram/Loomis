'use client';

import { useDeregisterDevice, useDevices, useRevokeSession, useSessions } from '@loomis/api-client';
import { Button } from '@loomis/ui-web';

import { PageBody, PageHeader } from '@/components/school/school-shell';

export default function SecuritySettingsPage() {
  const sessions = useSessions();
  const devices = useDevices();
  const revokeSession = useRevokeSession();
  const deregisterDevice = useDeregisterDevice();

  return (
    <>
      <PageHeader
        title="Security"
        description="Manage your active sessions and registered devices (US-HRM-008)."
      />
      <PageBody>
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Active sessions</h2>
          {sessions.isLoading ? (
            <p className="text-sm text-neutral-500">Loading sessions…</p>
          ) : sessions.isError ? (
            <p className="text-sm text-red-600" role="alert">
              Failed to load sessions.
            </p>
          ) : (sessions.data?.sessions.length ?? 0) === 0 ? (
            <p className="text-sm text-neutral-500">No active sessions.</p>
          ) : (
            <ul className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
              {sessions.data?.sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-neutral-900">
                      {session.platform ?? 'Unknown device'}
                      {session.isCurrent ? (
                        <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                          Current
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-neutral-500">
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
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Registered devices</h2>
          {devices.isLoading ? (
            <p className="text-sm text-neutral-500">Loading devices…</p>
          ) : devices.isError ? (
            <p className="text-sm text-red-600" role="alert">
              Failed to load devices.
            </p>
          ) : (devices.data?.devices.length ?? 0) === 0 ? (
            <p className="text-sm text-neutral-500">No registered devices.</p>
          ) : (
            <ul className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
              {devices.data?.devices.map((device) => (
                <li
                  key={device.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium capitalize text-neutral-900">{device.platform}</p>
                    <p className="text-xs text-neutral-500">
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
        </section>
      </PageBody>
    </>
  );
}
