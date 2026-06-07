'use client';

import { formatDistanceToNow } from 'date-fns';
import { formatKobo } from '@loomis/core';
import { usePlatformReferralParticipants, usePlatformPayoutCycles } from '@loomis/api-client';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from '@loomis/ui-web';
import type { KycStatus, ParticipantStatus } from '@loomis/contracts';

import { PageBody, PageHeader } from '@/components/platform/platform-shell';

function KycBadge({ status }: { status: KycStatus | null }) {
  if (!status) return <Badge variant="secondary">—</Badge>;
  const variants: Record<KycStatus, 'default' | 'secondary' | 'destructive' | 'gold'> = {
    approved: 'default',
    pending: 'gold',
    rejected: 'destructive',
  };
  return <Badge variant={variants[status]}>{status}</Badge>;
}

function ParticipantStatusBadge({ status }: { status: ParticipantStatus }) {
  const variants: Record<ParticipantStatus, 'default' | 'secondary' | 'destructive'> = {
    active: 'default',
    pending_kyc: 'secondary',
    deactivated: 'destructive',
  };
  const labels: Record<ParticipantStatus, string> = {
    active: 'Active',
    pending_kyc: 'KYC pending',
    deactivated: 'Deactivated',
  };
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}

export default function ReferralsPage() {
  const { data: participantsData, isLoading: pLoading } = usePlatformReferralParticipants();
  const { data: cyclesData, isLoading: cLoading } = usePlatformPayoutCycles();

  const participants = participantsData?.participants ?? [];
  const cycles = cyclesData?.cycles ?? [];

  return (
    <>
      <PageHeader
        title="Referral Attribution & Oversight"
        description="Regional manager and subordinate referral programme visibility (US-PLT-007)"
      />
      <PageBody>
        <Tabs defaultValue="participants">
          <TabsList>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="payouts">Payout Cycles</TabsTrigger>
          </TabsList>

          {/* Participants tab */}
          <TabsContent value="participants" className="mt-6">
            <Card className="overflow-hidden shadow-card">
              <CardHeader>
                <CardTitle className="font-serif text-base">
                  Participants ({participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-neutral-200 bg-neutral-50 hover:bg-neutral-50 dark:border-forest-800 dark:bg-forest-950">
                      {['ID', 'Type', 'Region', 'Status', 'KYC', 'Schools', 'Earned', 'Eligible'].map((h) => (
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
                    {pLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((__, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : participants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                          No referral participants registered.
                        </TableCell>
                      </TableRow>
                    ) : (
                      participants.map((p) => (
                        <TableRow
                          key={p.id}
                          className="border-b border-neutral-100 dark:border-forest-800"
                        >
                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground">
                              ···{p.id.slice(-8)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {p.participantType.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{p.region ?? '—'}</TableCell>
                          <TableCell>
                            <ParticipantStatusBadge status={p.status} />
                          </TableCell>
                          <TableCell>
                            <KycBadge status={p.kycStatus} />
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {p.schoolsAttributed}
                          </TableCell>
                          <TableCell className="font-mono text-sm tabular-nums">
                            {formatKobo(p.totalEarnedMinor)}
                          </TableCell>
                          <TableCell className="font-mono text-sm tabular-nums">
                            <span className={cn(p.eligibleMinor > 0 ? 'text-success font-semibold' : '')}>
                              {formatKobo(p.eligibleMinor)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payout cycles tab */}
          <TabsContent value="payouts" className="mt-6">
            <Card className="overflow-hidden shadow-card">
              <CardHeader>
                <CardTitle className="font-serif text-base">Payout Cycles</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-neutral-200 bg-neutral-50 hover:bg-neutral-50 dark:border-forest-800 dark:bg-forest-950">
                      {['Period', 'Status', 'Total Payout', 'Closed', 'Disbursed'].map((h) => (
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
                    {cLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 5 }).map((__, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : cycles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                          No payout cycles created yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      cycles.map((cycle) => (
                        <TableRow
                          key={cycle.id}
                          className="border-b border-neutral-100 dark:border-forest-800"
                        >
                          <TableCell className="text-sm">
                            {new Date(cycle.periodStart).toLocaleDateString('en-NG', {
                              month: 'short',
                              year: 'numeric',
                            })}{' '}
                            –{' '}
                            {new Date(cycle.periodEnd).toLocaleDateString('en-NG', {
                              month: 'short',
                              year: 'numeric',
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                cycle.status === 'disbursed'
                                  ? 'default'
                                  : cycle.status === 'closed'
                                    ? 'secondary'
                                    : 'gold'
                              }
                            >
                              {cycle.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm tabular-nums font-semibold">
                            {formatKobo(cycle.totalPayoutMinor)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {cycle.closedAt
                              ? formatDistanceToNow(new Date(cycle.closedAt), { addSuffix: true })
                              : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {cycle.disbursedAt
                              ? formatDistanceToNow(new Date(cycle.disbursedAt), { addSuffix: true })
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}
