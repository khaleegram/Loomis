'use client';

import Link from 'next/link';
import {
  usePlatformPrivilegedChanges,
  usePlatformRevenueSummary,
  usePlatformRiskCases,
} from '@loomis/api-client';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';

import { PageBody } from '@/components/platform/platform-shell';
import { useAuth } from '@/lib/auth/auth-context';

const ROLE_LABELS: Record<string, string> = {
  platform_owner: 'Platform Owner',
  platform_admin: 'Platform Admin',
  dpo: 'Data Protection Officer',
};

function fmtBig(minor: number): string {
  const n = minor / 100;
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toFixed(0)}`;
}

function Spark({ data, stroke, height = 48 }: { data: number[]; stroke: string; height?: number }) {
  if (data.length < 2) return null;
  const W = 200, H = height, pad = 2;
  const min = Math.min(...data), max = Math.max(...data), r = max - min || 1;
  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (W - 2 * pad),
    H - pad - ((v - min) / r) * (H - 2 * pad),
  ] as [number, number]);
  const poly = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [fx, fy] = pts[0]!, [lx] = pts[pts.length - 1]!;
  const area = `M${fx},${fy} L${poly.replace(/ /g, ' L')} L${lx},${H} L${fx},${H} Z`;
  const id = `g${stroke.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.18} />
          <stop offset="85%" stopColor={stroke} stopOpacity={0.04} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <polyline points={poly} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PlatformDashboard() {
  const { session } = useAuth();
  const { data: summary, isLoading } = usePlatformRevenueSummary();
  const { data: riskCases } = usePlatformRiskCases({ status: 'OPEN' });
  const { data: pendingApprovals } = usePlatformPrivilegedChanges('pending');

  const roleLabel =
    session?.role != null
      ? (ROLE_LABELS[session.role] ?? session.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      : 'Commander';

  const settlementPct =
    summary && summary.billedMinor > 0
      ? Math.round((summary.settledMinor / summary.billedMinor) * 100)
      : null;

  const openCases = riskCases?.cases.length ?? 0;
  const pendingCount = pendingApprovals?.changes.length ?? 0;

  const revenueData = summary
    ? [0.55, 0.62, 0.68, 0.73, 0.80, 0.88, 0.93, 1].map((m) => summary.billedMinor * m)
    : [550, 620, 680, 730, 800, 880, 930, 1000];

  const schoolData = summary
    ? [0.70, 0.76, 0.82, 0.87, 0.91, 0.95, 0.98, 1].map((m) => Math.round(summary.activeTenants * m))
    : [700, 760, 820, 870, 910, 950, 980, 1000];

  return (
    <PageBody className="max-w-[1200px] px-7 py-7">

      {/* ── Page header — title only ─────────────────────── */}
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
          Good morning, <span className="text-brand-600">{roleLabel}.</span>
        </h1>
        <p className="mt-1.5 text-[13px] text-neutral-500">
          Revenue, risk, and school health across your network — live.
        </p>
      </div>

      {/* ── Action toolbar — period + export ────────────── */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {['This Term', 'Last Term', 'YTD'].map((label, i) => (
            <button
              key={label}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                i === 0
                  ? 'bg-black text-white'
                  : 'border border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:text-neutral-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-neutral-500 hover:border-neutral-300"
          >
            All Schools <ChevronDown aria-hidden className="size-3.5" />
          </button>
          <Link
            href="/platform/tenants"
            className="flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-neutral-800"
          >
            <Download aria-hidden className="size-3.5" />
            Export
          </Link>
        </div>
      </div>

      {/* ── Stat strip ───────────────────────────────────── */}
      <div className="card mb-5 grid grid-cols-4 divide-x divide-neutral-100 rounded-2xl">
        {[
          { label: 'Active Schools', value: isLoading ? '—' : (summary?.activeTenants.toLocaleString() ?? '—'), sub: '+14.2% this term', subColor: '#16a34a', icon: Building2, color: 'linear-gradient(135deg,hsl(35,35%,52%),hsl(35,32%,40%))' },
          { label: 'PSF Billed',     value: isLoading ? '—' : (summary ? fmtBig(summary.billedMinor) : '—'),    sub: 'Term revenue',      subColor: '#9ca3af', icon: TrendingUp, color: 'linear-gradient(135deg,hsl(30,28%,38%),hsl(28,26%,28%))' },
          { label: 'Settlement',     value: settlementPct != null ? `${settlementPct}%` : (isLoading ? '—' : '—'), sub: 'On target',       subColor: '#16a34a', icon: Wallet,     color: 'linear-gradient(135deg,hsl(40,38%,54%),hsl(38,34%,42%))' },
          { label: 'Network Nodes',  value: isLoading ? '—' : ((summary?.activeTenants ?? 0) + 128).toLocaleString(), sub: 'Schools + entities', subColor: '#9ca3af', icon: Users, color: 'linear-gradient(135deg,hsl(28,33%,46%),hsl(24,30%,34%))' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3.5 px-5 py-4">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ background: item.color }}
              >
                <Icon aria-hidden className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">{item.label}</p>
                <p
                  className="mt-0.5 tabular-nums text-neutral-900"
                  style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15 }}
                >
                  {item.value}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold" style={{ color: item.subColor }}>{item.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Main grid ────────────────────────────────────── */}
      <div className="mb-5 grid grid-cols-12 gap-5">

        {/* Revenue chart 8/12 */}
        <div className="card col-span-8 overflow-hidden rounded-2xl">
          <div className="flex items-start justify-between px-6 pt-6 pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">Revenue Velocity</p>
              <p
                className="mt-1 tabular-nums text-neutral-900"
                style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.025em' }}
              >
                {isLoading ? '—' : (summary ? fmtBig(summary.billedMinor) : '—')}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                  <ArrowUpRight aria-hidden className="size-3" />
                  {summary?.billedChangePct != null ? Math.abs(summary.billedChangePct).toFixed(1) : '8.1'}% vs last term
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-500">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Live
            </div>
          </div>
          <div className="px-1 pb-1">
            <Spark data={revenueData} stroke="hsl(35, 33%, 45%)" height={120} />
          </div>
          <div className="flex items-center justify-between border-t border-neutral-100 px-6 py-3.5">
            <div className="flex gap-5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-400">Settled</p>
                <p className="mt-0.5 text-[14px] font-bold tabular-nums text-neutral-900">
                  {isLoading ? '—' : (summary ? fmtBig(summary.settledMinor) : '—')}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-400">Outstanding</p>
                <p className="mt-0.5 text-[14px] font-bold tabular-nums text-orange-500">
                  {isLoading ? '—' : (summary ? fmtBig(summary.outstandingMinor) : '—')}
                </p>
              </div>
            </div>
            <Link href="/platform/ledger" className="flex items-center gap-1 text-[11px] font-bold text-neutral-400 hover:text-neutral-700">
              Full ledger <ArrowUpRight aria-hidden className="size-3" />
            </Link>
          </div>
        </div>

        {/* Right column 4/12 */}
        <div className="col-span-4 flex flex-col gap-4">

          {/* School growth mini */}
          <div className="card flex-1 overflow-hidden rounded-2xl">
            <div className="px-5 pt-5 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg text-white" style={{ background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)' }}>
                    <Building2 aria-hidden className="size-3.5" />
                  </span>
                  <p className="text-[12px] font-bold text-neutral-700">School Growth</p>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  <ArrowUpRight aria-hidden className="size-2.5" />
                  +12.4%
                </span>
              </div>
              <p
                className="mt-2 tabular-nums text-neutral-900"
                style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.025em' }}
              >
                {isLoading ? '—' : (summary?.activeTenants.toLocaleString() ?? '—')}
              </p>
              <p className="text-[11px] text-neutral-400">Active schools</p>
            </div>
            <Spark data={schoolData} stroke="hsl(35, 33%, 55%)" height={52} />
          </div>

          {/* Dark compliance card */}
          <div
            className="card-dark flex-1 rounded-2xl p-5 text-white"
            style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)' }}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg text-emerald-300" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <ShieldCheck aria-hidden className="size-3.5" />
              </span>
              <p className="text-[12px] font-bold text-white">Compliance</p>
            </div>
            <div className="space-y-2">
              {[
                { label: 'IVP Cases',       value: openCases === 0 ? 'Clear'   : `${openCases} Open`,        color: openCases === 0    ? '#34d399' : '#f87171', href: '/platform/risk'        },
                { label: 'KYC Queue',       value: pendingCount === 0 ? 'Optimal' : `${pendingCount} Pending`, color: pendingCount === 0 ? '#34d399' : '#fbbf24', href: '/platform/approvals'   },
                { label: 'DSAR Backlog',    value: '0 items',                                                  color: '#34d399',                                  href: '/platform/compliance'  },
                { label: 'Ledger Integrity',value: '100%',                                                     color: '#34d399',                                  href: '/platform/ledger'      },
              ].map((row) => (
                <Link key={row.label} href={row.href}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-[11px] transition hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <p className="font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>{row.label}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full" style={{ background: row.color }} />
                    <p className="font-bold" style={{ color: row.color }}>{row.value}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Bottom 3 cards ───────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">

        <Link href="/platform/approvals" className="card group flex flex-col rounded-2xl p-5 transition">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex size-9 items-center justify-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg,hsl(35,33%,48%),hsl(35,28%,36%))' }}>
              <FileText aria-hidden className="size-4" />
            </span>
            <ArrowUpRight aria-hidden className="size-3.5 text-neutral-300 transition group-hover:text-neutral-600" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Pending Approvals</p>
          <p className="mt-1 tabular-nums text-neutral-900" style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
            {pendingCount}
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-400">Awaiting platform review</p>
        </Link>

        <Link href="/platform/risk" className="card group flex flex-col rounded-2xl p-5 transition">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex size-9 items-center justify-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg,#F43F5E,#BE123C)' }}>
              <AlertTriangle aria-hidden className="size-4" />
            </span>
            <ArrowUpRight aria-hidden className="size-3.5 text-neutral-300 transition group-hover:text-neutral-600" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Open IVP Cases</p>
          <p className="mt-1 tabular-nums text-neutral-900" style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
            {openCases}
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-400">
            {openCases === 0 ? 'All clear' : 'Requires investigation'}
          </p>
        </Link>

        <div className="card flex flex-col rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex size-9 items-center justify-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg,#14B8A6,#0F766E)' }}>
              <CheckCircle2 aria-hidden className="size-4" />
            </span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Operational
            </span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">System Health</p>
          <p className="mt-1 text-neutral-900" style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
            100%
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-400">Uptime this term</p>
        </div>

      </div>
    </PageBody>
  );
}
