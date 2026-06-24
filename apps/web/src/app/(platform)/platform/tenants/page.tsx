'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowUpRight,
  Building2,
  MapPin,
  Plus,
  Search,
  Zap,
} from 'lucide-react';

import { usePlatformTenants } from '@loomis/api-client';
import { formatKobo } from '@loomis/core';
import type { TenantStatus } from '@loomis/contracts';

import { PageBody } from '@/components/platform/platform-shell';
import { useAuth } from '@/lib/auth/auth-context';

const ROLE_LABELS: Record<string, string> = {
  platform_owner: 'Platform Owner',
  platform_admin: 'Platform Admin',
  dpo: 'Data Protection Officer',
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'provisioning', label: 'Provisioning' },
] as const;

function statusDot(status: TenantStatus): string {
  switch (status) {
    case 'active': return '#16a34a';
    case 'suspended': return '#dc2626';
    case 'provisioning': return '#f59e0b';
  }
}

function tenantSetupLabel(tenant: import('@loomis/contracts').TenantResponse): {
  label: string;
  tone: 'ok' | 'warn';
} {
  if (!tenant.ownerSetup.hasOwnerAccount) {
    return { label: 'No owner', tone: 'warn' };
  }
  if (!tenant.ownerSetup.setupEmailSentAt) {
    return { label: 'Email pending', tone: 'warn' };
  }
  if (
    tenant.suggestedPsfRateMinor != null &&
    tenant.currentPsfRateMinor != null &&
    tenant.suggestedPsfRateMinor !== tenant.currentPsfRateMinor
  ) {
    return { label: 'PSF review', tone: 'warn' };
  }
  return { label: 'On track', tone: 'ok' };
}

function statusLabel(status: TenantStatus): string {
  switch (status) {
    case 'active': return 'Active';
    case 'suspended': return 'Suspended';
    case 'provisioning': return 'Provisioning';
  }
}

export default function TenantsPage() {
  const { session } = useAuth();
  const { data, isLoading, isError } = usePlatformTenants();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const allTenants = data?.tenants ?? [];

  const filtered = allTenants.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.region.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const roleLabel = session?.role != null
    ? (ROLE_LABELS[session.role] ?? session.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
    : 'Commander';

  return (
      <PageBody className="max-w-[1200px] px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
        {/* ── Header (dashboard style) ───────────────────── */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-4 items-center justify-center rounded-full bg-brand-600">
              <Zap aria-hidden className="size-2.5 text-white" />
            </span>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">
              Platform Console
            </p>
          </div>
          <h1
            className="text-neutral-900"
            style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2 }}
          >
            Tenants, <span className="text-brand-600">{roleLabel}.</span>
          </h1>
          <p className="mt-1.5 text-[13px] text-neutral-500">
            Search, filter, and provision schools on the platform (US-PLT-001).
          </p>
        </div>

        {/* ── Toolbar ────────────────────────────────────── */}
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex max-w-full items-center gap-1.5 overflow-x-auto pb-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`shrink-0 rounded-lg px-3 py-2 text-[12px] font-semibold transition sm:py-1.5 ${
                  statusFilter === f.value
                    ? 'bg-black text-white'
                    : 'border border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:text-neutral-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search
                aria-hidden
                className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                placeholder="Search by name or region…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-[13px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-300 sm:w-56 sm:py-1.5"
              />
            </div>

            <Link
              href="/platform/tenants/new"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-neutral-800 sm:min-h-0 sm:py-1.5"
            >
              <Plus aria-hidden className="size-3.5" />
              Provision school
            </Link>
          </div>
        </div>

        {isError ? (
          <div className="card mb-5 rounded-2xl border border-red-100 bg-red-50 p-5">
            <p className="text-[13px] font-semibold text-red-700">
              Could not load schools. Restart the API and refresh.
            </p>
          </div>
        ) : null}

        {/* ── Tenant list ────────────────────────────────── */}
        <div className="card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
          <div className="grid min-w-[820px] grid-cols-[1fr_120px_100px_110px_100px_100px_48px] items-center gap-4 border-b border-neutral-100 bg-neutral-50 px-4 py-3 sm:px-6">
            {['School', 'Tier', 'Region', 'Status', 'Setup', 'PSF Rate', ''].map((h) => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                {h}
              </p>
            ))}
          </div>

          <div className="divide-y divide-neutral-100">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="grid min-w-[820px] grid-cols-[1fr_120px_100px_110px_100px_100px_48px] items-center gap-4 px-4 py-4 animate-pulse sm:px-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-neutral-100 shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-36 rounded bg-neutral-100" />
                      <div className="h-2.5 w-20 rounded bg-neutral-50" />
                    </div>
                  </div>
                  <div className="h-4 w-14 rounded bg-neutral-100" />
                  <div className="h-3 w-16 rounded bg-neutral-100" />
                  <div className="h-5 w-20 rounded-full bg-neutral-100" />
                  <div className="h-3 w-16 rounded bg-neutral-100" />
                  <div />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-neutral-100">
                  <Building2 aria-hidden className="size-7 text-neutral-300" />
                </div>
                <div>
                  <p className="font-bold text-neutral-900">
                    {search || statusFilter !== 'all'
                      ? 'No schools match your filters'
                      : 'No schools provisioned yet'}
                  </p>
                  <p className="mt-1 max-w-sm text-[13px] text-neutral-400">
                    {search || statusFilter !== 'all'
                      ? 'Try a different search term or status filter.'
                      : 'Click "Provision school" to onboard your first school.'}
                  </p>
                </div>
                {!search && statusFilter === 'all' ? (
                  <Link
                    href="/platform/tenants/new"
                    className="flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-neutral-800 transition"
                  >
                    <Plus aria-hidden className="size-3.5" />
                    Provision school
                  </Link>
                ) : null}
              </div>
            ) : (
              filtered.map((tenant) => {
                const setup = tenantSetupLabel(tenant);
                return (
                <Link
                  key={tenant.id}
                  href={`/platform/tenants/${tenant.id}`}
                  className="grid min-w-[820px] grid-cols-[1fr_120px_100px_110px_100px_100px_48px] items-center gap-4 px-4 py-3.5 transition-colors hover:bg-neutral-50 group sm:px-6"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{
                        background:
                          tenant.status === 'suspended'
                            ? 'linear-gradient(135deg,#F43F5E,#BE123C)'
                            : tenant.status === 'provisioning'
                              ? 'linear-gradient(135deg,hsl(45,70%,55%),hsl(40,60%,45%))'
                              : 'linear-gradient(135deg,hsl(35,35%,52%),hsl(35,32%,40%))',
                      }}
                    >
                      <Building2 aria-hidden className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-neutral-900 truncate group-hover:text-brand-600 transition-colors">
                        {tenant.name}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        Onboarded {formatDistanceToNow(new Date(tenant.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <span className="text-[12px] font-semibold text-neutral-600">{tenant.tierCode}</span>

                  <span className="flex items-center gap-1 text-[12px] text-neutral-500">
                    <MapPin aria-hidden className="size-3" />
                    {tenant.region}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ background: statusDot(tenant.status) }}
                    />
                    <span className="text-[12px] font-semibold text-neutral-600">
                      {statusLabel(tenant.status)}
                    </span>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
                      setup.tone === 'ok'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {setup.label}
                  </span>

                  <span className="text-[13px] font-bold tabular-nums text-neutral-900">
                    {tenant.currentPsfRateMinor != null ? formatKobo(tenant.currentPsfRateMinor) : '—'}
                  </span>

                  <ArrowUpRight
                    aria-hidden
                    className="size-4 shrink-0 text-neutral-300 group-hover:text-neutral-600 transition-colors justify-self-end"
                  />
                </Link>
                );
              })
            )}
          </div>

          {!isLoading && data ? (
            <div className="border-t border-neutral-100 px-4 py-3 sm:px-6">
              <p className="text-[11px] font-semibold text-neutral-400">
                {data.total.toLocaleString()} school{data.total !== 1 ? 's' : ''} total
                {filtered.length !== data.total ? ` · ${filtered.length} shown` : ''}
              </p>
            </div>
          ) : null}
          </div>
        </div>
      </PageBody>
  );
}
