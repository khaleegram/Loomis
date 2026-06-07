'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useStaffDirectory } from '@loomis/api-client';
import { Button } from '@loomis/ui-web';

import {
  formatRoleLabel,
  formatStaffStatus,
} from '@/components/school/school-nav-config';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useCan, useCanAny } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

type StatusFilter = 'all' | 'active' | 'pending' | 'deactivated';

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
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                statusFilter === filter
                  ? 'bg-brand-100 text-brand-800'
                  : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50'
              }`}
            >
              {filter === 'all' ? 'All' : formatStaffStatus(filter)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-neutral-500">Loading staff…</p>
        ) : isError ? (
          <p className="text-sm text-red-600" role="alert">
            {(error as Error).message ?? 'Failed to load staff directory.'}
          </p>
        ) : staff.length === 0 ? (
          <p className="text-sm text-neutral-500">No staff members match this filter.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-neutral-700">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-700">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-700">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-700">Joined</th>
                  {canAssign ? (
                    <th className="px-4 py-3 text-right font-medium text-neutral-700">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-neutral-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900">{member.fullName}</div>
                      <div className="text-xs text-neutral-500">{member.email}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {formatRoleLabel(member.primaryRole)}
                      {member.roleExtensions.length > 0 ? (
                        <span className="ml-1 text-xs text-neutral-400">
                          +{member.roleExtensions.map((r) => formatRoleLabel(r)).join(', ')}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          member.status === 'active'
                            ? 'bg-green-50 text-green-700'
                            : member.status === 'pending'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {formatStaffStatus(member.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {member.joinedAt
                        ? new Date(member.joinedAt).toLocaleDateString()
                        : member.status === 'pending'
                          ? 'Awaiting setup'
                          : '—'}
                    </td>
                    {canAssign ? (
                      <td className="px-4 py-3 text-right">
                        {member.status === 'active' ? (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/school/staff/${member.id}/assignments`}>Assignments</Link>
                          </Button>
                        ) : member.status === 'pending' ? (
                          <span className="text-xs text-neutral-400">Invitation pending</span>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageBody>
    </>
  );
}
