// @ts-nocheck
'use client';

import { useMemo, useState } from 'react';
import { useAssignments, useCreateAssignment, useAcademicTerms, useAcademicYears, useClassStructure } from '@loomis/api-client';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@loomis/ui-web';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { useCan } from '@/lib/auth/use-capability';

const assignmentSchema = z.object({
  subjectId: z.string().min(1, 'Subject required'),
  classArmId: z.string().min(1, 'Class required'),
  title: z.string().min(1, 'Title required'),
  instructions: z.string().optional(),
  dueAt: z.string().min(1, 'Due date required'),
  maxScore: z.coerce.number().min(1, 'Must be at least 1'),
});

type AssignmentForm = z.infer<typeof assignmentSchema>;

export default function AssignmentsPage() {
  const tenantId = useTenantId();
  const canCreate = useCan('gradebook.write');
  const [adding, setAdding] = useState(false);

  const yearsData = useAcademicYears(tenantId ?? '');
  const activeYearId = useMemo(() => {
    return ((yearsData.data as any)?.academicYears ?? []).find((y: any) => y.status === 'active')?.id ?? null;
  }, [yearsData.data]);

  const termsData = useAcademicTerms(tenantId ?? '', activeYearId ?? '');
  const openTermId = useMemo(() => {
    return ((termsData.data as any)?.terms ?? []).find((t: any) => t.status === 'open')?.id ?? null;
  }, [termsData.data]);

  const structureData = useClassStructure(tenantId ?? '', activeYearId ?? '');
  const classArms = (structureData.data as any)?.arms ?? [];

  const { data, isLoading, isError, error } = useAssignments(tenantId ?? '');

  const createAssignment = useCreateAssignment(tenantId ?? '');

  const assignments = (data as any)?.assignments ?? [];

  const form = useForm<AssignmentForm>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { subjectId: '', classArmId: '', title: '', instructions: '', dueAt: '', maxScore: 100 },
  });

  async function onAdd(values: AssignmentForm) {
    try {
      await createAssignment.mutateAsync({
        termId: openTermId!,
        classArmId: values.classArmId,
        subjectId: values.subjectId,
        title: values.title,
        instructions: values.instructions ?? '',
        dueAt: values.dueAt,
        maxScore: values.maxScore,
      });
      form.reset();
      setAdding(false);
    } catch {
      // handled by mutator
    }
  }

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Assignments" />
        <PageBody><p className="text-sm text-destructive">No tenant context.</p></PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Create and manage class assignments — US-ACA-007"
        actions={canCreate ? <Button size="sm" onClick={() => setAdding(!adding)}><Plus className="mr-1.5 size-3.5" /> {adding ? 'Cancel' : 'New'}</Button> : null}
      />
      <PageBody>
        {adding ? (
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">New Assignment</CardTitle></CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onAdd)} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="subjectId" render={({ field }) => (
                    <FormItem><FormLabel>Subject ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="classArmId" render={({ field }) => (
                    <FormItem><FormLabel>Class</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                        <SelectContent>{classArms.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="maxScore" render={({ field }) => (
                    <FormItem><FormLabel>Max Score</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="dueAt" render={({ field }) => (
                    <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="instructions" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Instructions</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="submit" disabled={createAssignment.isPending}>Create Assignment</Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : null}

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : isError ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <p className="text-sm text-muted-foreground">No assignments found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell>{classArms.find((ca: any) => ca.id === a.classArmId)?.name ?? '—'}</TableCell>
                  <TableCell>{a.dueAt ? new Date(a.dueAt).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>{a.maxScore}</TableCell>
                  <TableCell><Badge variant={a.status === 'published' ? 'success' : a.status === 'closed' ? 'neutral' : 'warning'}>{a.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PageBody>
    </>
  );
}
