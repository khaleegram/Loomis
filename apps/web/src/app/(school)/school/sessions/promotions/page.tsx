// @ts-nocheck
'use client';

import { useMemo, useState } from 'react';
import { usePromotions, useStagePromotion, useConfirmPromotion, useAcademicYears } from '@loomis/api-client';
import { Badge, Button, Card, CardHeader, CardTitle, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@loomis/ui-web';
import { Check, AlertTriangle } from 'lucide-react';

import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { useCan } from '@/lib/auth/use-capability';

export default function PromotionsPage() {
  const tenantId = useTenantId();
  const canStage = useCan('student.promote');
  const canConfirm = useCan('student.promote');
  const [staged, setStaged] = useState(false);

  const yearsData = useAcademicYears(tenantId ?? '');
  const activeYear = useMemo(() => {
    return ((yearsData.data as any)?.academicYears ?? []).find((y: any) => y.status === 'active') ?? null;
  }, [yearsData.data]);

  const { data, isLoading } = usePromotions(tenantId ?? '', activeYear?.id ?? '');

  const stagePromotion = useStagePromotion(tenantId ?? '');
  const confirmPromotion = useConfirmPromotion(tenantId ?? '');

  const promotions = (data as any)?.records ?? [];

  async function handleStage() {
    if (!activeYear) return;
    try {
      await stagePromotion.mutateAsync({ fromAcademicYearId: activeYear.id, toAcademicYearId: activeYear.id, decisions: [] });
      setStaged(true);
    } catch { /* handled */ }
  }

  async function handleConfirm() {
    try {
      await confirmPromotion.mutateAsync({ fromAcademicYearId: activeYear?.id ?? '' });
      setStaged(false);
    } catch { /* handled */ }
  }

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Student Promotions" />
        <PageBody><p className="text-sm text-destructive">No tenant context.</p></PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Student Promotions"
        description="Promote students to the next class level at year end — US-ASM-005"
        actions={canStage && activeYear ? (
          <Button size="sm" onClick={handleStage} disabled={stagePromotion.isPending || staged}>
            {stagePromotion.isPending ? 'Staging…' : staged ? 'Staged' : 'Stage Promotions'}
          </Button>
        ) : null}
      />
      <PageBody>
        {!activeYear ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <p className="text-sm text-muted-foreground">No active academic year.</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : (
          <div className="space-y-6">
            {canConfirm ? (
              <Card className="border-gold-400 dark:border-gold-600">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="size-5 text-gold-500" /> Review & Confirm
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Review staged promotions. Confirmed promotions cannot be undone.</p>
                  </div>
                  <Button onClick={handleConfirm} disabled={confirmPromotion.isPending}>
                    <Check className="mr-1.5 size-4" /> {confirmPromotion.isPending ? 'Confirming…' : 'Confirm'}
                  </Button>
                </CardHeader>
              </Card>
            ) : null}

            {promotions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
                <p className="text-sm text-muted-foreground">No promotions staged yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>From Class</TableHead>
                    <TableHead>To Class</TableHead>
                    <TableHead>Outcome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.map((p: any) => (
                    <TableRow key={p.studentId}>
                      <TableCell className="font-medium font-mono text-xs">{p.studentId?.slice(0, 8)}…</TableCell>
                      <TableCell>{p.fromClassLevelId?.slice(0, 8)}</TableCell>
                      <TableCell>{p.toClassLevelId?.slice(0, 8)}</TableCell>
                      <TableCell>
                        <Badge variant={p.outcome === 'promoted' ? 'success' : p.outcome === 'held_back' ? 'warning' : 'neutral'}>
                          {p.outcome?.replace('_', ' ') ?? '—'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </PageBody>
    </>
  );
}
