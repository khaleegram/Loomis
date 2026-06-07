'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useStaffDirectory } from '@loomis/api-client';
import { Badge, Button, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@loomis/ui-web';

import {
  formatRoleLabel,
  formatStaffStatus,
} from '@/components/school/school-nav-config';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useCan, useCanAny } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

type StatusFilter = 'all' | 'active' | 'pending' | 'deactivated';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'neutral' | 'default' | 'destructive'> = {
  active: 'success',
  pending: 'warning',
  deactivated: 'neutral',
};

function StaffTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export default function StaffDirectoryPage() {
  const tenantId = useTenantId();
  const canOnboard = useCan('staff.onboard');
  const canAssign = useCanAny(['subject.assign', 'classteacher.assign', 'staff.role.assign']);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data, isLoading, isError, error } = useStaffDirectory(tenantId ?? '');

  const staff = useMemo(() => {
    const list = data?.staff ?? [];
    if (statusFilter === 'all') return list;
    return list.filter((member) => member.status === statusFilter);
  }, [data?.staff, statusFilter]);

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Staff directory" />
        <PageBody>
          <p className="text-sm text-red-600">No tenant context. Sign in again.</p>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Staff directory"
        description="All active, pending, and deactivated staff members (US-HRM-006)."
        actions={
          canOnboard ? (
            <Button asChild>
              <Link href="/school/staff/invite">Invite staff</Link>
            </Button>
          ) : null
        }
      />
      <PageBody>
        <div className="mb-4 flex flex-wrap gap-2">
          {(['all', 'active', 'pending', 'deactivated'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                statusFilter === filter
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:bg-forest-900 dark:text-neutral-300 dark:ring-forest-700 dark:hover:bg-forest-800'
              }`}
            >
              {filter === 'all' ? 'All' : formatStaffStatus(filter)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <StaffTableSkeleton />
        ) : isError ? (
          <p className="text-sm text-red-600" role="alert">
            {(error as Error).message ?? 'Failed to load staff directory.'}
          </p>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-white py-16 dark:border-forest-700 dark:bg-forest-900">
            <p className="text-sm text-neutral-500">No staff members match this filter.</p>
            {canOnboard ? (
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/school/staff/invite">Invite staff</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white dark:bg-forest-900 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  {canAssign ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{member.fullName}</div>
                      <div className="text-xs text-muted-foreground">{member.email}</div>
                    </TableCell>
                    <TableCell>
                      {formatRoleLabel(member.primaryRole)}
                      {member.roleExtensions.length > 0 ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          +{member.roleExtensions.map((r) => formatRoleLabel(r)).join(', ')}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[member.status] ?? 'default'}>
                        {formatStaffStatus(member.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.joinedAt
                        ? new Date(member.joinedAt).toLocaleDateString()
                        : member.status === 'pending'
                          ? 'Awaiting setup'
                          : '—'}
                    </TableCell>
                    {canAssign ? (
                      <TableCell className="text-right">
                        {member.status === 'active' ? (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/school/staff/${member.id}/assignments`}>Assignments</Link>
                          </Button>
                        ) : member.status === 'pending' ? (
                          <span className="text-xs text-muted-foreground">Invitation pending</span>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageBody>
    </>
  );
}
