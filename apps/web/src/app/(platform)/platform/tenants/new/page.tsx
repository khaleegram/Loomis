'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Zap } from 'lucide-react';

import { BRONZE } from '@/components/dashboard/dashboard-primitives';
import { PageBody } from '@/components/platform/platform-shell';
import { TenantProvisionForm } from '@/components/platform/tenant-provision-form';
import { useAuth } from '@/lib/auth/auth-context';

const ROLE_LABELS: Record<string, string> = {
  platform_owner: 'Platform Owner',
  platform_admin: 'Platform Admin',
  dpo: 'Data Protection Officer',
};

const PROVISION_HINTS = [
  {
    title: 'PSF is census-driven',
    body: 'Per-student fees are created when a term census is locked — not when parents pay school fees.',
  },
  {
    title: 'Referral is permanent',
    body: 'A valid referral code links this school to a regional partner for the life of the tenant.',
  },
  {
    title: 'Audit trail',
    body: 'Every provision is logged with your actor ID. Break-glass is not required for standard onboarding.',
  },
] as const;

export default function NewTenantPage() {
  const { session } = useAuth();

  const roleLabel = session?.role != null
    ? (ROLE_LABELS[session.role] ?? session.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
    : 'Commander';

  return (
    <PageBody className="max-w-[960px] px-7 py-7">
      <div className="mb-6">
        <Link
          href="/platform/tenants"
          className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500 hover:text-neutral-800 transition"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          Back to tenants
        </Link>
        <div className="mb-2 flex items-center gap-2">
          <span className="flex size-4 items-center justify-center rounded-full bg-brand-600">
            <Zap aria-hidden className="size-2.5 text-white" />
          </span>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">
            Platform Console · US-PLT-001
          </p>
        </div>
        <h1
          className="text-neutral-900"
          style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2 }}
        >
          Provision a school, <span className="text-brand-600">{roleLabel}.</span>
        </h1>
        <p className="mt-1.5 text-[13px] text-neutral-500">
          Create a new tenant with tier and optional PSF override. You&apos;ll land on the school detail
          page when done.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-8">
          <TenantProvisionForm />
        </div>

        <aside className="space-y-3 lg:col-span-4">
          <div
            className="card overflow-hidden rounded-2xl p-4 text-white"
            style={{ background: BRONZE.gradients.g2 }}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck aria-hidden className="size-3.5 opacity-80" />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-80">
                Before you submit
              </p>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed opacity-85">
              Confirm the school name matches CAC registration. The contact email receives the
              School Owner invite.
            </p>
          </div>

          {PROVISION_HINTS.map((hint) => (
            <div key={hint.title} className="card rounded-2xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                {hint.title}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-500">{hint.body}</p>
            </div>
          ))}
        </aside>
      </div>
    </PageBody>
  );
}
