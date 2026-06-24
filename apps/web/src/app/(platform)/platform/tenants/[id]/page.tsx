'use client';

import { use, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Calendar,
  Copy,
  FileText,
  Globe,
  History,
  Mail,
  MapPin,
  Pencil,
  Percent,
  Phone,
  Send,
  Shield,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Alert,
  AlertDescription,
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
} from '@loomis/ui-web';
import {
  usePlatformTenant,
  usePlatformRiskCases,
  useSuspendTenant,
  useReinstateTenant,
  useResendTenantSetupEmail,
} from '@loomis/api-client';
import { suspendTenantRequest } from '@loomis/contracts';
import { formatKobo } from '@loomis/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { uuidv7 } from 'uuidv7';

import { PageBody } from '@/components/platform/platform-shell';
import { PlatformTenantExperienceCard } from '@/components/platform/platform-tenant-experience-card';
import { TenantProductTierCard } from '@/components/platform/tenant-product-tier-card';
import { TenantGoLiveCard } from '@/components/platform/tenant-go-live-card';
import { TenantContactsEditDialog } from '@/components/platform/tenant-contacts-edit-dialog';
import { PsfRateCard } from '@/components/platform/psf-rate-card';
import { BreakGlassModal } from '@/components/platform/break-glass-modal';
import { TenantProfileEditDialog } from '@/components/platform/tenant-profile-edit-dialog';
import { TenantOnboardingTimeline } from '@/components/platform/tenant-onboarding-timeline';
import { BRONZE } from '@/components/dashboard/dashboard-primitives';
import { useAuth } from '@/lib/auth/auth-context';

const ROLE_LABELS: Record<string, string> = {
  platform_owner: 'Platform Owner',
  platform_admin: 'Platform Admin',
  dpo: 'Data Protection Officer',
};

const suspendFormSchema = suspendTenantRequest.extend({
  confirmName: z.string().min(1, 'Type the school name to confirm'),
});

type SuspendFormValues = z.infer<typeof suspendFormSchema>;

interface TenantDetailPageProps {
  params: Promise<{ id: string }>;
}

function statusDot(status: string): string {
  switch (status) {
    case 'active': return '#16a34a';
    case 'suspended': return '#dc2626';
    case 'provisioning': return '#f59e0b';
    default: return '#9ca3af';
  }
}

function statusLabel(status: string, goLiveAt?: string): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'suspended':
      return 'Suspended';
    case 'provisioning':
      if (goLiveAt && new Date(goLiveAt).getTime() > Date.now()) {
        return `Scheduled ${new Date(goLiveAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        })}`;
      }
      return 'Provisioning';
    default:
      return status;
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  gradient,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  gradient: string;
}) {
  return (
    <div className="flex items-center gap-3.5 px-5 py-4">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ background: gradient }}
      >
        <Icon aria-hidden className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">{label}</p>
        <p
          className="mt-0.5 tabular-nums text-neutral-900"
          style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}
        >
          {value}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-neutral-400">{sub}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-neutral-50 py-3 last:border-0 sm:flex-row sm:items-start sm:gap-4">
      <dt className="w-full shrink-0 pt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400 sm:w-[120px]">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-[13px] font-semibold text-neutral-900">{children}</dd>
    </div>
  );
}

export default function TenantDetailPage({ params }: TenantDetailPageProps) {
  const { id: tenantId } = use(params);
  const { data: tenant, isLoading } = usePlatformTenant(tenantId);
  const { data: riskCases } = usePlatformRiskCases({ status: 'OPEN' });
  const { session } = useAuth();
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [bgModalOpen, setBgModalOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editContactsOpen, setEditContactsOpen] = useState(false);
  const suspendIdempotencyKey = useRef(uuidv7());
  const reinstateIdempotencyKey = useRef(uuidv7());
  const resendSetupKey = useRef(uuidv7());

  const suspend = useSuspendTenant(tenantId);
  const reinstate = useReinstateTenant(tenantId);
  const resendSetup = useResendTenantSetupEmail(tenantId);

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

  const roleLabel = session?.role != null
    ? (ROLE_LABELS[session.role] ?? session.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
    : 'Commander';

  const openRiskCount = riskCases?.cases.filter(
    (c) => c.tenantId === tenantId
  ).length ?? 0;

  // ── Loading state ────────────────────────────────────
  if (isLoading) {
    return (
      <PageBody className="max-w-[1200px] px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
        <div className="mb-6 animate-pulse space-y-3">
          <div className="h-3 w-28 rounded bg-neutral-100" />
          <div className="h-10 w-72 rounded bg-neutral-100" />
          <div className="h-4 w-48 rounded bg-neutral-100" />
        </div>
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-[76px] rounded-2xl bg-neutral-50" />
          ))}
        </div>
        <div className="grid grid-cols-12 gap-5">
          <div className="card col-span-8 h-[320px] rounded-2xl bg-neutral-50" />
          <div className="col-span-4 space-y-4">
            <div className="card h-[180px] rounded-2xl bg-neutral-50" />
            <div className="card h-[120px] rounded-2xl bg-neutral-50" />
          </div>
        </div>
      </PageBody>
    );
  }

  // ── Not found ────────────────────────────────────────
  if (!tenant) {
    return (
      <PageBody className="max-w-[1200px] px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
        <div className="card rounded-2xl border-red-100 bg-red-50 p-6">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
              <ShieldAlert aria-hidden className="size-5 text-red-500" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-red-600">
                School not found
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-red-700">
                This tenant may have been deleted or the ID is invalid.
              </p>
              <Link
                href="/platform/tenants"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-red-700 transition"
              >
                <ArrowLeft aria-hidden className="size-3.5" />
                Back to tenants
              </Link>
            </div>
          </div>
        </div>
      </PageBody>
    );
  }

  const isSuspended = tenant.status === 'suspended';
  const isAwaitingGoLive =
    tenant.status === 'provisioning' && new Date(tenant.goLiveAt).getTime() > Date.now();
  const schoolInitial = tenant.name.charAt(0).toUpperCase();
  const displayContacts =
    tenant.contacts.length > 0
      ? tenant.contacts
      : [
          {
            id: 'legacy-primary',
            role: 'primary' as const,
            fullName: tenant.name,
            email: tenant.contactEmail,
            phone: tenant.contactPhone,
            isPrimary: true,
          },
        ];

  const CONTACT_ROLE_LABELS: Record<string, string> = {
    primary: 'Primary',
    billing: 'Billing',
    operations: 'Operations',
    proprietor: 'Proprietor',
  };

  return (
    <PageBody className="max-w-[1200px] px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
      {/* ════════════════════════════════════════════════════
          HERO HEADER
          ════════════════════════════════════════════════════ */}
      <div className="relative mb-5 overflow-hidden rounded-2xl p-6 text-white sm:p-8"
        style={{
          background: isSuspended
            ? 'linear-gradient(135deg, #881337 0%, #be123c 50%, #9f1239 100%)'
            : BRONZE.gradients.g2,
        }}
      >
        {/* Background pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative">
          {/* Breadcrumb */}
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-4 items-center justify-center rounded-full bg-white/20">
              <Zap aria-hidden className="size-2.5 text-white" />
            </span>
            <Link
              href="/platform/tenants"
              className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60 hover:text-white/90 transition-colors"
            >
              Platform Console
            </Link>
            <span className="text-[11px] text-white/30">/</span>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
              School Detail
            </p>
          </div>

          {/* Main header content */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              {/* School avatar */}
              <span
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-[1.5rem] font-extrabold tracking-tight"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                {schoolInitial}
              </span>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1
                    style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15 }}
                  >
                    {tenant.name}
                  </h1>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
                    style={{ background: 'rgba(255,255,255,0.15)' }}
                  >
                    <span className="size-2 rounded-full" style={{ background: statusDot(tenant.status) }} />
                    {statusLabel(tenant.status, tenant.goLiveAt)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1.5 text-[13px] text-white/70">
                    <MapPin aria-hidden className="size-3.5" />
                    {tenant.region}
                  </span>
                  <span className="flex items-center gap-1.5 text-[13px] text-white/70">
                    <Globe aria-hidden className="size-3.5" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.06em]">{tenant.tierCode}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[13px] text-white/70">
                    <Calendar aria-hidden className="size-3.5" />
                    Onboarded {formatDistanceToNow(new Date(tenant.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 shrink-0">
              {!isSuspended ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSuspendDialogOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold transition"
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fecaca' }}
                  >
                    <ShieldAlert aria-hidden className="size-3.5" />
                    Suspend
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold transition"
                    style={{ background: 'rgba(255,255,255,0.15)', color: '#fde68a' }}
                  >
                    <Shield aria-hidden className="size-3.5" />
                    Break-Glass
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleReinstate()}
                  disabled={reinstate.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-[12px] font-bold text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-40"
                >
                  {reinstate.isPending ? 'Reinstating…' : 'Reinstate school'}
                </button>
              )}
            </div>
          </div>

          {/* Suspension alert */}
          {isSuspended && tenant.suspendedReason ? (
            <div
              className="mt-5 flex items-start gap-3 rounded-xl p-4"
              style={{ background: 'rgba(0,0,0,0.25)' }}
            >
              <AlertTriangle aria-hidden className="size-4 shrink-0 text-red-300 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-300">
                  Suspended
                  {tenant.suspendedAt
                    ? ` · ${new Date(tenant.suspendedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    : ''}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-white/80">
                  {tenant.suspendedReason}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          STAT STRIP
          ════════════════════════════════════════════════════ */}
      <div className="card mb-5 grid grid-cols-1 divide-y divide-neutral-100 rounded-2xl sm:grid-cols-2 xl:grid-cols-5 xl:divide-x xl:divide-y-0">
        <StatCard
          icon={Percent}
          label="PSF Rate"
          value={tenant.currentPsfRateMinor != null ? formatKobo(tenant.currentPsfRateMinor) : 'Tier default'}
          sub={
            tenant.suggestedPsfRateMinor != null &&
            tenant.suggestedPsfRateMinor !== tenant.currentPsfRateMinor
              ? `Suggested ${formatKobo(tenant.suggestedPsfRateMinor)} from fees`
              : 'Per student / term'
          }
          gradient={BRONZE.gradients.g1}
        />
        <StatCard
          icon={Building2}
          label="Tier"
          value={tenant.tierCode.toUpperCase()}
          sub={tenant.status === 'provisioning' ? 'Awaiting activation' : 'Provisioned'}
          gradient={BRONZE.gradients.g3}
        />
        <StatCard
          icon={Shield}
          label="Risk Flags"
          value={openRiskCount === 0 ? 'Clear' : String(openRiskCount)}
          sub={openRiskCount === 0 ? 'No open IVP cases' : 'Open anomaly cases'}
          gradient={openRiskCount === 0 ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#dc2626,#991b1b)'}
        />
        <StatCard
          icon={Calendar}
          label="Go-live"
          value={new Date(tenant.goLiveAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
          sub={
            isAwaitingGoLive
              ? 'Awaiting scheduled access'
              : tenant.activatedAt
                ? `Activated ${formatDistanceToNow(new Date(tenant.activatedAt), { addSuffix: true }).replace('about ', '')}`
                : tenant.status === 'active'
                  ? 'School is live'
                  : 'Pending activation'
          }
          gradient="linear-gradient(135deg,#6366f1,#4f46e5)"
        />
        <StatCard
          icon={Calendar}
          label="Age"
          value={formatDistanceToNow(new Date(tenant.createdAt), { addSuffix: true }).replace('about ', '')}
          sub={new Date(tenant.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          gradient="linear-gradient(135deg,#64748b,#475569)"
        />
      </div>

      {/* ════════════════════════════════════════════════════
          MAIN CONTENT GRID
          ════════════════════════════════════════════════════ */}
      <div className="mb-5 grid grid-cols-12 gap-5">
        {/* Left: School details */}
        <div className="card col-span-12 overflow-hidden rounded-2xl lg:col-span-8">
          <div className="flex items-center justify-between gap-2.5 border-b border-neutral-100 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ background: BRONZE.gradients.g1 }}
              >
                <Building2 aria-hidden className="size-4" />
              </span>
              <div>
                <p className="text-[12px] font-bold text-neutral-900">School Details</p>
                <p className="text-[11px] text-neutral-400">Identity &amp; contact information</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditContactsOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                <Pencil aria-hidden className="size-3.5" />
                Edit contacts
              </button>
              <button
                type="button"
                onClick={() => setEditProfileOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                <MapPin aria-hidden className="size-3.5" />
                Edit location
              </button>
            </div>
          </div>

          <div className="p-5">
            <dl>
              {displayContacts.map((contact) => (
                <InfoRow
                  key={contact.id}
                  label={`${CONTACT_ROLE_LABELS[contact.role] ?? contact.role}${contact.isPrimary ? ' · Primary' : ''}`}
                >
                  <div className="space-y-1">
                    <p>{contact.fullName}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-normal text-neutral-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail aria-hidden className="size-3.5 text-neutral-400" />
                        {contact.email}
                      </span>
                      {contact.phone ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone aria-hidden className="size-3.5 text-neutral-400" />
                          {contact.phone}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </InfoRow>
              ))}
              <InfoRow label="Address">
                <span>{tenant.address}</span>
              </InfoRow>
              <InfoRow label="Owner setup">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[13px] text-neutral-800">
                      {tenant.ownerSetup.hasOwnerAccount
                        ? tenant.ownerSetup.ownerEmail
                        : 'No owner account yet'}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {tenant.ownerSetup.setupEmailSentAt
                        ? `Welcome email sent ${formatDistanceToNow(new Date(tenant.ownerSetup.setupEmailSentAt), { addSuffix: true })}`
                        : 'Welcome email not sent yet'}
                    </p>
                  </div>
                  {tenant.ownerSetup.hasOwnerAccount ? (
                    <button
                      type="button"
                      disabled={resendSetup.isPending}
                      onClick={() => {
                        void resendSetup
                          .mutateAsync(resendSetupKey.current)
                          .then(() => {
                            resendSetupKey.current = uuidv7();
                          })
                          .catch(() => undefined);
                      }}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#c9a96e] px-3 py-2 text-[12px] font-bold text-neutral-900 transition hover:bg-[#b89555] disabled:opacity-50"
                    >
                      <Send aria-hidden className="size-3.5" />
                      {resendSetup.isPending ? 'Sending…' : 'Resend setup email'}
                    </button>
                  ) : null}
                </div>
              </InfoRow>
              <InfoRow label="Support reference">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(tenant.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1 text-[12px] font-medium text-neutral-600 transition hover:bg-neutral-50"
                  >
                    <Copy aria-hidden className="size-3" />
                    Copy reference ID
                  </button>
                </div>
              </InfoRow>
              <InfoRow label="Referral">
                {tenant.referralCode ? (
                  <span className="font-mono text-[12px] text-neutral-500">
                    Con···{tenant.referralCode.slice(-6)}
                  </span>
                ) : (
                  <span className="text-neutral-400">None</span>
                )}
              </InfoRow>
            </dl>
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-12 flex flex-col gap-4 lg:col-span-4">
          {/* Quick links — dark card matching dashboard style */}
          <div
            className="card-dark flex flex-col rounded-2xl p-5 text-white"
            style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)' }}
          >
            <div className="mb-4 flex items-center gap-2.5">
              <span
                className="flex size-8 items-center justify-center rounded-xl"
                style={{ background: 'rgba(255,255,255,0.12)' }}
              >
                <FileText aria-hidden className="size-4 text-white/80" />
              </span>
              <div>
                <p className="text-[12px] font-bold text-white">Quick Actions</p>
                <p className="text-[10px] text-white/40">Cross-module operations</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'View ledger entries', href: '/platform/ledger' },
                { label: 'Check IVP cases', href: `/platform/risk?tenant=${tenantId}` },
                { label: 'Review approvals', href: '/platform/approvals' },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[12px] font-semibold transition hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.65)' }}>{action.label}</span>
                  <ArrowUpRight aria-hidden className="size-3 text-white/25" />
                </Link>
              ))}
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(tenant.id)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[12px] font-semibold transition hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <span style={{ color: 'rgba(255,255,255,0.65)' }}>Copy tenant ID</span>
                <Copy aria-hidden className="size-3 text-white/25" />
              </button>
            </div>
          </div>

          {/* Risk mini-card */}
          <div
            className="card overflow-hidden rounded-2xl p-4 text-white"
            style={{
              background: openRiskCount === 0
                ? 'linear-gradient(135deg,#059669,#047857)'
                : 'linear-gradient(135deg,#dc2626,#991b1b)',
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span
                className="flex size-8 items-center justify-center rounded-xl"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <AlertTriangle aria-hidden className="size-4" />
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                {openRiskCount === 0 ? 'Healthy' : 'Attention'}
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">
              IVP Risk Monitor
            </p>
            <p className="mt-1 text-[1.375rem] font-extrabold tracking-tight">
              {openRiskCount === 0 ? 'No flags' : `${openRiskCount} open case${openRiskCount !== 1 ? 's' : ''}`}
            </p>
            <p className="mt-0.5 text-[11px] opacity-70">
              {openRiskCount === 0
                ? 'No anomalies detected'
                : 'Requires platform review'}
            </p>
            {openRiskCount > 0 ? (
              <Link
                href={`/platform/risk?tenant=${tenantId}`}
                className="mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold transition hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                Review cases
                <ArrowUpRight aria-hidden className="size-3" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          PSF RATE CARD
          ════════════════════════════════════════════════════ */}
      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <PsfRateCard
          tenantId={tenant.id}
          tenantName={tenant.name}
          currentRateMinor={tenant.currentPsfRateMinor}
          suggestedRateMinor={tenant.suggestedPsfRateMinor}
        />
        <PlatformTenantExperienceCard tenantId={tenant.id} tenantName={tenant.name} />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <TenantGoLiveCard tenant={tenant} />
        <TenantProductTierCard tenant={tenant} />
      </div>

      {tenant.onboarding ? (
        <div className="mb-5">
          <TenantOnboardingTimeline onboarding={tenant.onboarding} />
        </div>
      ) : null}

      {/* ════════════════════════════════════════════════════
          TIMELINE
          ════════════════════════════════════════════════════ */}
      <div className="card overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2.5 border-b border-neutral-100 px-5 py-4">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}
          >
            <History aria-hidden className="size-4" />
          </span>
          <div>
            <p className="text-[12px] font-bold text-neutral-900">Activity Timeline</p>
            <p className="text-[11px] text-neutral-400">Key events for this school</p>
          </div>
        </div>

        <div className="p-5">
          <ol className="relative ml-3 space-y-0 border-l-2 border-neutral-100 pl-6">
            {/* Suspended */}
            {tenant.suspendedAt ? (
              <li className="relative pb-5 last:pb-0">
                <span
                  className="absolute left-[-27px] flex size-4 items-center justify-center rounded-full"
                  style={{ background: '#dc2626' }}
                >
                  <span className="size-1.5 rounded-full bg-white" />
                </span>
                <p className="text-[13px] font-bold text-neutral-900">School suspended</p>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  {formatDistanceToNow(new Date(tenant.suspendedAt), { addSuffix: true })}
                  {tenant.suspendedReason ? ` · ${tenant.suspendedReason}` : ''}
                </p>
              </li>
            ) : null}

            {/* Activated (when not provisioning/suspended or after suspension) */}
            {tenant.status === 'active' ? (
              <li className="relative pb-5 last:pb-0">
                <span
                  className="absolute left-[-27px] flex size-4 items-center justify-center rounded-full bg-emerald-500"
                >
                  <span className="size-1.5 rounded-full bg-white" />
                </span>
                <p className="text-[13px] font-bold text-neutral-900">School active</p>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  Operating normally
                </p>
              </li>
            ) : null}

            {/* Provisioned */}
            <li className="relative pb-0">
              <span
                className="absolute left-[-27px] flex size-4 items-center justify-center rounded-full"
                style={{ background: BRONZE.stroke.primary }}
              >
                <span className="size-1.5 rounded-full bg-white" />
              </span>
              <p className="text-[13px] font-bold text-neutral-900">School provisioned</p>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                {formatDistanceToNow(new Date(tenant.createdAt), { addSuffix: true })}
                {tenant.referralCode ? ' · Referral attached' : ''}
              </p>
            </li>
          </ol>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          SUSPEND DIALOG
          ════════════════════════════════════════════════════ */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Suspend {tenant.name}</DialogTitle>
            <DialogDescription>
              This immediately blocks all school actors. Type the school name to confirm.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertDescription>
              Locking out all users immediately. Only use for non-payment, fraud, or
              compliance violations.
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
                      <Input
                        {...field}
                        placeholder={tenant.name}
                        autoComplete="off"
                      />
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

      {/* ════════════════════════════════════════════════════
          BREAK-GLASS MODAL
          ════════════════════════════════════════════════════ */}
      <TenantProfileEditDialog
        tenant={tenant}
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
      />

      <TenantContactsEditDialog
        tenant={tenant}
        open={editContactsOpen}
        onOpenChange={setEditContactsOpen}
      />

      <BreakGlassModal
        open={bgModalOpen}
        tenantId={tenant.id}
        tenantName={tenant.name}
        onClose={() => setBgModalOpen(false)}
      />
    </PageBody>
  );
}
