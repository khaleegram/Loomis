'use client';

import { useState } from 'react';
import { Badge, Button, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@loomis/ui-web';
import { Check, X } from 'lucide-react';
import { format } from 'date-fns';

import { PageBody, PageHeader } from '@/components/platform/platform-shell';
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
    try {
      await client.post(`/platform/referral/kyc/${kycId}/approve`, {});
      refetch();
    } catch { /* handled */ }
    setApproving(null);
  }

  async function handleReject(kycId: string) {
    try {
      await client.post(`/platform/referral/kyc/${kycId}/reject`, { reason: 'KYC requirements not met' });
      refetch();
    } catch { /* handled */ }
    setRejecting(null);
  }

  return (
    <>
      <PageHeader
        title="KYC Verification"
        description="Review and process pending KYC submissions from regional managers — US-REF-001"
      />
      <PageBody>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : isError ? (
          <p className="text-sm text-destructive">Failed to load KYC records.</p>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <Check className="mb-2 size-8 text-success" />
            <p className="text-sm text-muted-foreground">No pending KYC verifications.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.participantName ?? r.participantId?.slice(0, 8)}</TableCell>
                  <TableCell className="text-muted-foreground">{r.submittedAt ? format(new Date(r.submittedAt), 'dd/MM/yyyy') : '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(r.documentTypes ?? []).map((d) => (
                        <Badge key={d} variant="outline" className="text-[10px]">{d}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="warning">{r.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="default" onClick={() => handleApprove(r.id)} disabled={approving === r.id}>
                        <Check className="mr-1 size-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(r.id)} disabled={rejecting === r.id}>
                        <X className="mr-1 size-3.5" /> Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PageBody>
    </>
  );
}
