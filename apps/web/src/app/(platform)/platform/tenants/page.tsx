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
      <PageBody className="max-w-[1200px] px-7 py-7">
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
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                  statusFilter === f.value
                    ? 'bg-black text-white'
                    : 'border border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:text-neutral-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                aria-hidden
                className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                placeholder="Search by name or region…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 rounded-lg border border-neutral-200 bg-white py-1.5 pl-9 pr-3 text-[13px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-300"
              />
            </div>

            <Link
              href="/platform/tenants/new"
              className="flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-neutral-800 transition"
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
          <div className="grid grid-cols-[1fr_120px_100px_110px_100px_48px] items-center gap-4 border-b border-neutral-100 bg-neutral-50 px-6 py-3">
            {['School', 'Tier', 'Region', 'Status', 'PSF Rate', ''].map((h) => (
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
                  className="grid grid-cols-[1fr_120px_100px_110px_100px_48px] items-center gap-4 px-6 py-4 animate-pulse"
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
              filtered.map((tenant) => (
                <Link
                  key={tenant.id}
                  href={`/platform/tenants/${tenant.id}`}
                  className="grid grid-cols-[1fr_120px_100px_110px_100px_48px] items-center gap-4 px-6 py-3.5 transition-colors hover:bg-neutral-50 group"
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

                  <span className="text-[13px] font-bold tabular-nums text-neutral-900">
                    {tenant.currentPsfRateMinor != null ? formatKobo(tenant.currentPsfRateMinor) : '—'}
                  </span>

                  <ArrowUpRight
                    aria-hidden
                    className="size-4 shrink-0 text-neutral-300 group-hover:text-neutral-600 transition-colors justify-self-end"
                  />
                </Link>
              ))
            )}
          </div>

          {!isLoading && data ? (
            <div className="border-t border-neutral-100 px-6 py-3">
              <p className="text-[11px] font-semibold text-neutral-400">
                {data.total.toLocaleString()} school{data.total !== 1 ? 's' : ''} total
                {filtered.length !== data.total ? ` · ${filtered.length} shown` : ''}
              </p>
            </div>
          ) : null}
        </div>
      </PageBody>
  );
}
