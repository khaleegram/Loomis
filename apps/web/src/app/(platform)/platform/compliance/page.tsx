'use client';

import Link from 'next/link';
import { useComplianceDashboard } from '@loomis/api-client';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@loomis/ui-web';
import { ClipboardList, FileWarning, Scale, Shield } from 'lucide-react';

import { PageBody, PageHeader } from '@/components/platform/platform-shell';

export default function ComplianceDashboardPage() {
  const { data, isLoading } = useComplianceDashboard();

  const cards = [
    {
      label: 'Active DSARs',
      value: data?.activeDsarCount ?? 0,
      sub: `${data?.overdueDsarCount ?? 0} overdue`,
      href: '/platform/compliance/dsar',
      icon: ClipboardList,
      urgent: (data?.overdueDsarCount ?? 0) > 0,
    },
    {
      label: 'Open Breaches',
      value: data?.openBreachCount ?? 0,
      sub: `${data?.pendingNdpcNotificationCount ?? 0} pending NDPC`,
      href: '/platform/compliance/breaches',
      icon: Shield,
      urgent: (data?.pendingNdpcNotificationCount ?? 0) > 0,
    },
    {
      label: 'Retention Policies',
      value: data?.retentionSchedules?.length ?? 0,
      sub: `${data?.recentRetentionEvents ?? 0} recent events`,
      href: '/platform/compliance/retention',
      icon: Scale,
    },
    {
      label: 'Active Consent',
      value: data?.activeConsentVersion?.versionLabel ?? 'None',
      sub: data?.activeConsentVersion
        ? `Since ${new Date(data.activeConsentVersion.effectiveFrom).toLocaleDateString('en-NG')}`
        : 'Publish a version',
      href: '/platform/compliance/retention',
      icon: FileWarning,
    },
  ];

  return (
    <>
      <PageHeader
        title="NDPA Compliance Posture"
        description="Platform compliance overview — US-AUD-005"
      />
      <PageBody>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-lg" />
              ))
            : cards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link key={card.label} href={card.href}>
                    <Card
                      className={`shadow-card transition-shadow hover:shadow-md ${card.urgent ? 'border-danger/40' : ''}`}
                    >
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="font-serif text-base">{card.label}</CardTitle>
                        <Icon aria-hidden className="size-5 text-neutral-400" />
                      </CardHeader>
                      <CardContent>
                        <p className="font-serif text-3xl font-semibold tabular-nums">{card.value}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
        </div>

        <Card className="mt-8 border-neutral-300 shadow-card dark:border-forest-700">
          <CardHeader>
            <CardTitle className="font-serif text-base">Regulatory Ledger</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            All compliance configuration changes are audit-logged. DSAR responses must be
            fulfilled within 30 days per NDPA 2023. Breach NDPC notification clock starts on DPO
            acknowledgement.
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
