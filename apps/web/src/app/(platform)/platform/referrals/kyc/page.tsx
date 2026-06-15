'use client';

import { useState } from 'react';
import { Badge, Button, Skeleton } from '@loomis/ui-web';
import { Check, FileCheck, ShieldCheck, X } from 'lucide-react';
import { format } from 'date-fns';

import { PlatformConsoleHero } from '@/components/platform/platform-console-hero';
import { PageBody } from '@/components/platform/platform-shell';
import { PLATFORM_PAGE_CLASS, PLATFORM_UI } from '@/lib/platform/platform-ui';
import { SURFACES } from '@/lib/design/surfaces';
import { useApiClient } from '@loomis/api-client';
import { useQuery } from '@tanstack/react-query';

interface KycRecord {
  id: string;
  participantName?: string;
  participantId?: string;
  submittedAt?: string;
  documentTypes?: string[];
  status: string;
}

interface KycPendingResponse {
  records?: KycRecord[];
}

export default function KycPage() {
  const client = useApiClient();
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['platform', 'referral', 'kyc', 'pending'],
    queryFn: () => client.get<KycPendingResponse>('/platform/referral/kyc/pending'),
    staleTime: 15_000,
  });

  const records = data?.records ?? [];

  async function handleApprove(kycId: string) {
    setApproving(kycId);
    try {
      await client.post(`/platform/referral/kyc/${kycId}/approve`, {});
      refetch();
    } catch {
      /* handled */
    }
    setApproving(null);
  }

  async function handleReject(kycId: string) {
    setRejecting(kycId);
    try {
      await client.post(`/platform/referral/kyc/${kycId}/reject`, { reason: 'KYC requirements not met' });
      refetch();
    } catch {
      /* handled */
    }
    setRejecting(null);
  }

  return (
    <PageBody className={PLATFORM_PAGE_CLASS}>
      <div className="space-y-6">
        <PlatformConsoleHero
          sectionLabel="Referral verification"
          title="KYC verification queue"
          description="Review and process pending KYC submissions from regional managers — US-REF-001"
          isLoading={isLoading}
          stats={[
            {
              label: 'Pending',
              value: String(records.length),
              hint: 'Awaiting review',
              icon: FileCheck,
              gradient: records.length > 0 ? SURFACES.kpi.g4 : SURFACES.kpi.g3,
            },
            {
              label: 'Queue',
              value: records.length === 0 ? 'Clear' : 'Active',
              hint: 'Verification status',
              icon: ShieldCheck,
              gradient: SURFACES.kpi.g2,
            },
            {
              label: 'Policy',
              value: 'Segregated',
              hint: 'RM cannot approve own sub',
              icon: ShieldCheck,
              gradient: SURFACES.kpi.g1,
            },
            {
              label: 'SLA',
              value: '72h',
              hint: 'Target review window',
              icon: FileCheck,
              gradient: SURFACES.kpi.g4,
            },
          ]}
        />

        <div className={`${PLATFORM_UI.dataPanel} overflow-hidden`}>
          {isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <p className="p-6 text-[13px] text-destructive">Failed to load KYC records.</p>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-accent-green-50">
                <Check aria-hidden className="size-7 text-accent-green-600" />
              </div>
              <p className="mt-4 text-[15px] font-semibold text-neutral-800">No pending KYC verifications</p>
              <p className="mt-1 text-[13px] text-neutral-500">All submissions have been processed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead className={PLATFORM_UI.tableHeader}>
                  <tr>
                    {['Participant', 'Submitted', 'Documents', 'Status', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-t border-brand-50/80">
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {r.participantName ?? r.participantId?.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {r.submittedAt ? format(new Date(r.submittedAt), 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(r.documentTypes ?? []).map((d) => (
                            <Badge key={d} variant="outline" className="text-[10px]">
                              {d}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="warning">{r.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            className={PLATFORM_UI.btnPrimary}
                            onClick={() => handleApprove(r.id)}
                            disabled={approving === r.id}
                          >
                            <Check aria-hidden className="size-3.5" /> Approve
                          </button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(r.id)}
                            disabled={rejecting === r.id}
                          >
                            <X aria-hidden className="size-3.5" /> Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageBody>
  );
}
