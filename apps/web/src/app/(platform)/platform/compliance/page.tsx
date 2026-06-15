'use client';

import Link from 'next/link';
import { useComplianceDashboard } from '@loomis/api-client';
import { ClipboardList, FileWarning, Scale, Shield } from 'lucide-react';
import { Skeleton } from '@loomis/ui-web';

import { PlatformConsoleHero } from '@/components/platform/platform-console-hero';
import { PageBody } from '@/components/platform/platform-shell';
import { PLATFORM_PAGE_CLASS, PLATFORM_UI } from '@/lib/platform/platform-ui';
import { SURFACES } from '@/lib/design/surfaces';

export default function ComplianceDashboardPage() {
  const { data, isLoading } = useComplianceDashboard();

  const cards = [
    {
      label: 'Active DSARs',
      value: String(data?.activeDsarCount ?? 0),
      sub: `${data?.overdueDsarCount ?? 0} overdue`,
      href: '/platform/compliance/dsar',
      icon: ClipboardList,
      urgent: (data?.overdueDsarCount ?? 0) > 0,
    },
    {
      label: 'Open breaches',
      value: String(data?.openBreachCount ?? 0),
      sub: `${data?.pendingNdpcNotificationCount ?? 0} pending NDPC`,
      href: '/platform/compliance/breaches',
      icon: Shield,
      urgent: (data?.pendingNdpcNotificationCount ?? 0) > 0,
    },
    {
      label: 'Retention policies',
      value: String(data?.retentionSchedules?.length ?? 0),
      sub: `${data?.recentRetentionEvents ?? 0} recent events`,
      href: '/platform/compliance/retention',
      icon: Scale,
    },
    {
      label: 'Active consent',
      value: data?.activeConsentVersion?.versionLabel ?? 'None',
      sub: data?.activeConsentVersion
        ? `Since ${new Date(data.activeConsentVersion.effectiveFrom).toLocaleDateString('en-NG')}`
        : 'Publish a version',
      href: '/platform/compliance/retention',
      icon: FileWarning,
    },
  ];

  return (
    <PageBody className={PLATFORM_PAGE_CLASS}>
      <div className="space-y-6">
        <PlatformConsoleHero
          sectionLabel="Compliance · NDPA"
          title="Compliance posture"
          description="Platform compliance overview — DSARs, breaches, retention, and consent."
          isLoading={isLoading}
          stats={[
            {
              label: 'DSARs',
              value: String(data?.activeDsarCount ?? 0),
              hint: `${data?.overdueDsarCount ?? 0} overdue`,
              icon: ClipboardList,
              gradient: (data?.overdueDsarCount ?? 0) > 0 ? SURFACES.kpi.g4 : SURFACES.kpi.g1,
            },
            {
              label: 'Breaches',
              value: String(data?.openBreachCount ?? 0),
              hint: `${data?.pendingNdpcNotificationCount ?? 0} NDPC pending`,
              icon: Shield,
              gradient: SURFACES.kpi.g2,
            },
            {
              label: 'Retention',
              value: String(data?.retentionSchedules?.length ?? 0),
              hint: 'Active schedules',
              icon: Scale,
              gradient: SURFACES.kpi.g3,
            },
            {
              label: 'Consent',
              value: data?.activeConsentVersion?.versionLabel ?? 'None',
              hint: 'Published version',
              icon: FileWarning,
              gradient: SURFACES.kpi.g4,
            },
          ]}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-2xl" />
              ))
            : cards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.label}
                    href={card.href}
                    className={`${PLATFORM_UI.dataPanel} block p-5 transition-shadow hover:shadow-md ${card.urgent ? 'ring-1 ring-destructive/20' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={PLATFORM_UI.sectionLabel}>{card.label}</p>
                        <p className="mt-2 text-2xl font-extrabold tabular-nums text-neutral-900">{card.value}</p>
                        <p className="mt-1 text-[12px] text-neutral-500">{card.sub}</p>
                      </div>
                      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                        <Icon aria-hidden className="size-4" />
                      </span>
                    </div>
                  </Link>
                );
              })}
        </div>

        <div className={`${PLATFORM_UI.dataPanel} p-5 sm:p-6`}>
          <p className={PLATFORM_UI.sectionLabel}>Regulatory ledger</p>
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-600">
            All compliance configuration changes are audit-logged. DSAR responses must be fulfilled
            within 30 days per NDPA 2023. Breach NDPC notification clock starts on DPO acknowledgement.
          </p>
        </div>
      </div>
    </PageBody>
  );
}
