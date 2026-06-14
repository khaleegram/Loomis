'use client';

import Link from 'next/link';
import { useCreateGradingScheme, useGradingSchemes } from '@loomis/api-client';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
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
} from '@loomis/ui-web';
import { useState } from 'react';

import { GradingSchemeBuilder } from '@/components/academic/ops/grading-scheme-builder';
import { ExamConfigSetupPanel } from '@/components/academic/ops/exam-config-setup-panel';
import { GradeCorrectionReviewList } from '@/components/academic/ops/grade-correction-review-list';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { useCan, useCanAny } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

function SchemesTableSkeleton() {
  return <Skeleton className="h-48 w-full" />;
}

export default function SchoolExamsPage() {
  const tenantId = useTenantId();
  const canConfigure = useCan('grading_scheme.configure');
  const canPublish = useCan('result.publish');
  const canView = useCanAny(['grading_scheme.configure', 'result.publish', 'gradebook.read']);

  const schemesQuery = useGradingSchemes(tenantId ?? '');
  const createScheme = useCreateGradingScheme(tenantId ?? '');
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [tab, setTab] = useState('schemes');

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Exams & results" />
        <PageBody>
          <Alert variant="destructive">
            <AlertDescription>No tenant context. Sign in again.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  if (!canView) {
    return (
      <>
        <PageHeader title="Exams & results" />
        <PageBody>
          <Alert>
            <AlertDescription>You do not have permission to view exam operations.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  const schemes = schemesQuery.data?.schemes ?? [];

  return (
    <>
      <PageHeader
        title="Exams & results"
        description="Grading schemes, correction approvals, and result publication (US-ACA-001..004)."
        actions={
          <div className="flex flex-wrap gap-2">
            {canPublish ? (
              <Button asChild>
                <Link href="/school/exams/publish">Publish results</Link>
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link href="/school/gradebook">Open gradebook</Link>
            </Button>
          </div>
        }
      />
      <PageBody>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="schemes">Grading schemes</TabsTrigger>
            {canConfigure ? <TabsTrigger value="builder">New scheme</TabsTrigger> : null}
            {canConfigure ? <TabsTrigger value="configs">Exam configs</TabsTrigger> : null}
            <TabsTrigger value="corrections">Corrections queue</TabsTrigger>
          </TabsList>

          <TabsContent value="schemes" className="mt-6 space-y-4">
            {schemesQuery.isLoading ? (
              <SchemesTableSkeleton />
            ) : schemesQuery.isError ? (
              <Alert variant="destructive">
                <AlertDescription>{(schemesQuery.error as Error).message}</AlertDescription>
              </Alert>
            ) : schemes.length === 0 ? (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">No grading schemes yet</CardTitle>
                  <CardDescription>
                    Create a scheme with CA/Exam weights totalling 100% before teachers can enter scores.
                  </CardDescription>
                </CardHeader>
                {canConfigure ? (
                  <CardContent>
                    <Button onClick={() => setTab('builder')}>Create grading scheme</Button>
                  </CardContent>
                ) : null}
              </Card>
            ) : (
              <div className="overflow-x-auto rounded-sm border shadow-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>CA / Exam</TableHead>
                      <TableHead>Pass mark</TableHead>
                      <TableHead>Default</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schemes.map((scheme) => (
                      <TableRow key={scheme.id}>
                        <TableCell className="font-medium">{scheme.name}</TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {scheme.continuousAssessmentWeight}% / {scheme.examWeight}%
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">{scheme.passMark}%</TableCell>
                        <TableCell>{scheme.isDefault ? 'Yes' : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {canConfigure ? (
            <TabsContent value="builder" className="mt-6">
              <GradingSchemeBuilder
                isSubmitting={createScheme.isPending}
                errorMessage={builderError}
                onSubmit={async (values) => {
                  setBuilderError(null);
                  try {
                    await createScheme.mutateAsync(values);
                    setTab('schemes');
                  } catch (err) {
                    setBuilderError(academicErrorMessage(err));
                  }
                }}
              />
            </TabsContent>
          ) : null}

          {canConfigure ? (
            <TabsContent value="configs" className="mt-6">
              <ExamConfigSetupPanel tenantId={tenantId} />
            </TabsContent>
          ) : null}

          <TabsContent value="corrections" className="mt-6">
            <GradeCorrectionReviewList tenantId={tenantId} />
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}
