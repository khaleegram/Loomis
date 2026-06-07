'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Building2, Plus, Search } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@loomis/ui-web';
import { usePlatformTenants } from '@loomis/api-client';
import { formatKobo } from '@loomis/core';
import type { TenantStatus } from '@loomis/contracts';

import { PageBody, PageHeader } from '@/components/platform/platform-shell';
import { TenantProvisionDrawer } from '@/components/platform/tenant-provision-drawer';
import { useCan } from '@/lib/auth/use-capability';

function TenantStatusBadge({ status }: { status: TenantStatus }) {
  const variants: Record<TenantStatus, 'default' | 'secondary' | 'destructive'> = {
    active: 'default',
    provisioning: 'secondary',
    suspended: 'destructive',
  };
  const labels: Record<TenantStatus, string> = {
    active: 'Active',
    provisioning: 'Provisioning',
    suspended: 'Suspended',
  };
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}

function ProvisionSchoolButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className="gap-2 bg-brand-600 text-white hover:bg-brand-700 dark:bg-gold-500 dark:text-forest-950 dark:hover:bg-gold-400"
    >
      <Plus aria-hidden className="size-4" />
      Provision school
    </Button>
  );
}

export default function TenantsPage() {
  const canOnboard = useCan('tenant.onboard');
  const { data, isLoading, isError } = usePlatformTenants();
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tenants = (data?.tenants ?? []).filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.region.toLowerCase().includes(search.toLowerCase()),
  );

  const openDrawer = () => {
    if (!canOnboard) return;
    setDrawerOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Tenants"
        description="All provisioned schools on the platform"
        actions={canOnboard ? <ProvisionSchoolButton onClick={openDrawer} /> : null}
      />
      <PageBody>
        <div className="space-y-4">
          {isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                Could not load schools. Restart the API (`pnpm --filter @loomis/api dev`) and
                refresh this page.
              </AlertDescription>
            </Alert>
          ) : null}

          {!canOnboard ? (
            <Alert>
              <AlertDescription>
                Your role can view tenants but cannot provision new schools. Sign in as Platform
                Owner or Platform Admin to onboard schools.
              </AlertDescription>
            </Alert>
          ) : null}

          {canOnboard ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 dark:border-gold-800 dark:bg-forest-900">
              <div>
                <p className="text-sm font-medium text-foreground">Onboard a new school</p>
                <p className="text-xs text-muted-foreground">
                  US-PLT-001 — create tenant, tier, and initial PSF rate.
                </p>
              </div>
              <ProvisionSchoolButton onClick={openDrawer} />
            </div>
          ) : null}

          {/* Search */}
          <div className="relative max-w-sm">
            <Search
              aria-hidden
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by name or region…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          {/* Table */}
          <Card className="overflow-hidden shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-neutral-200 bg-neutral-50 hover:bg-neutral-50 dark:border-forest-800 dark:bg-forest-950">
                    {['School', 'Region', 'Tier', 'Status', 'PSF Rate', 'Onboarded'].map((h) => (
                      <TableHead
                        key={h}
                        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {h}
                      </TableHead>
                    ))}
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : tenants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16">
                        <div className="flex flex-col items-center gap-4 text-center">
                          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                            <Building2 aria-hidden className="size-7 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {search
                                ? `No schools matching "${search}"`
                                : 'No schools provisioned yet'}
                            </p>
                            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                              {search
                                ? 'Try a different search term.'
                                : 'Use the green “Provision school” button above to add your first school.'}
                            </p>
                          </div>
                          {canOnboard && !search ? (
                            <ProvisionSchoolButton onClick={openDrawer} />
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    tenants.map((tenant) => (
                      <TableRow
                        key={tenant.id}
                        className="cursor-pointer border-b border-neutral-100 transition-colors hover:bg-neutral-50 dark:border-forest-800 dark:hover:bg-forest-800/50"
                        onClick={() => {
                          window.location.assign(`/platform/tenants/${tenant.id}`);
                        }}
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
                        <TableCell>
                          <TenantStatusBadge status={tenant.status} />
                        </TableCell>
                        <TableCell className="font-mono text-sm tabular-nums">
                          {tenant.currentPsfRateMinor != null
                            ? formatKobo(tenant.currentPsfRateMinor)
                            : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(tenant.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">View →</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {!isLoading && data ? (
            <p className="text-xs text-muted-foreground">
              {data.total.toLocaleString()} school{data.total !== 1 ? 's' : ''} total
            </p>
          ) : null}
        </div>
      </PageBody>

      <TenantProvisionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
