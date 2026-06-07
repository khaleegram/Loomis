'use client';

import { formatDistanceToNow } from 'date-fns';
import { formatKobo } from '@loomis/core';
import { usePlatformTenants, usePlatformPsfRates } from '@loomis/api-client';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@loomis/ui-web';
import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/platform/platform-shell';

export default function PsfPage() {
  const { data: tenantsData, isLoading: tenantsLoading } = usePlatformTenants();
  const { data: ratesData, isLoading: ratesLoading } = usePlatformPsfRates();

  const isLoading = tenantsLoading || ratesLoading;
  const tenants = tenantsData?.tenants ?? [];
  const latestSnapshot = ratesData?.snapshots[0];

  return (
    <>
      <PageHeader
        title="PSF Rate Configuration"
        description="Platform-wide and per-school PSF rates. All changes require dual approval + step-up MFA."
      />
      <PageBody>
        <div className="space-y-6">
          {/* Global rate snapshot */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-serif text-base">Global Default Rate</CardTitle>
            </CardHeader>
            <CardContent>
              {ratesLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : latestSnapshot ? (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-serif text-3xl font-semibold text-foreground">
                      {formatKobo(latestSnapshot.rateMinor)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Per student per term · Effective{' '}
                      {new Date(latestSnapshot.effectiveFrom).toLocaleDateString('en-NG', {
                        dateStyle: 'medium',
                      })}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Last changed</p>
                    <p className="font-medium text-foreground">
                      {formatDistanceToNow(new Date(latestSnapshot.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No global rate configured yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Per-school rate table */}
          <Card className="overflow-hidden shadow-card">
            <CardHeader>
              <CardTitle className="font-serif text-base">Per-School Rates</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-neutral-200 bg-neutral-50 hover:bg-neutral-50 dark:border-forest-800 dark:bg-forest-950">
                    {['School', 'Region', 'Tier', 'PSF Rate', 'Status', ''].map((h) => (
                      <TableHead
                        key={h}
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : tenants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center text-sm text-muted-foreground">
                        No schools provisioned.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tenants.map((tenant) => (
                      <TableRow
                        key={tenant.id}
                        className="border-b border-neutral-100 dark:border-forest-800"
                      >
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tenant.region}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {tenant.tierCode}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm tabular-nums">
                          {tenant.currentPsfRateMinor != null
                            ? formatKobo(tenant.currentPsfRateMinor)
                            : (
                              <span className="text-xs text-muted-foreground italic">
                                Tier default
                              </span>
                            )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              tenant.status === 'active'
                                ? 'default'
                                : tenant.status === 'suspended'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {tenant.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/platform/tenants/${tenant.id}`}
                            className="text-xs font-medium text-brand-600 hover:underline dark:text-mint-400"
                          >
                            Manage →
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            CON-011: PSF rate of zero is permanently blocked. All rate changes are
            dual-approved and require step-up MFA. Navigate to a school&apos;s detail page to
            initiate a rate change request.
          </p>
        </div>
      </PageBody>
    </>
  );
}
