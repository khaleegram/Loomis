// @ts-nocheck
'use client';

import { useMemo, useState } from 'react';
import { useTimetable, useCreateTimetableEntry, useDeleteTimetableEntry, usePublishTimetable, useAcademicTerms, useAcademicYears, useClassStructure } from '@loomis/api-client';
import { Button, Card, CardContent, CardHeader, CardTitle, Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@loomis/ui-web';
import { Plus, Trash2, Send, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { useCan } from '@/lib/auth/use-capability';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

const entrySchema = z.object({
  dayOfWeek: z.coerce.number().min(0).max(4),
  startMinute: z.coerce.number().min(0),
  endMinute: z.coerce.number().min(0),
  subjectId: z.string().min(1, 'Subject required'),
  classArmId: z.string().min(1, 'Required'),
});

type EntryForm = z.infer<typeof entrySchema>;

export default function TimetablePage() {
  const tenantId = useTenantId();
  const canEdit = useCan('term.manage');
  const [adding, setAdding] = useState(false);

  const yearsData = useAcademicYears(tenantId ?? '');
  const activeYearId = useMemo(() => {
    const list = (yearsData.data as any)?.academicYears ?? [];
    return list.find((y: any) => y.status === 'active')?.id ?? null;
  }, [yearsData.data]);

  const termsData = useAcademicTerms(tenantId ?? '', activeYearId ?? '');
  const openTermId = useMemo(() => {
    const list = (termsData.data as any)?.terms ?? [];
    return list.find((t: any) => t.status === 'open')?.id ?? null;
  }, [termsData.data]);

  const structure = useClassStructure(tenantId ?? '', activeYearId ?? '');
  const { data: timetableData, isLoading } = useTimetable(tenantId ?? '', openTermId ?? '');

  const createEntry = useCreateTimetableEntry(tenantId ?? '');
  const deleteEntry = useDeleteTimetableEntry(tenantId ?? '');
  const publishTimetable = usePublishTimetable(tenantId ?? '');

  const entries = (timetableData as any)?.entries ?? [];
  const classArms = (structure.data as any)?.arms ?? [];

  const form = useForm<EntryForm>({
    resolver: zodResolver(entrySchema),
    defaultValues: { dayOfWeek: 0, startMinute: 480, endMinute: 540, subjectId: '', classArmId: '' },
  });

  async function onAdd(values: EntryForm) {
    try {
      await createEntry.mutateAsync({
        termId: openTermId!,
        classArmId: values.classArmId,
        subjectId: values.subjectId,
        dayOfWeek: values.dayOfWeek,
        startMinute: values.startMinute,
        endMinute: values.endMinute,
        teacherStaffProfileId: '',
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
        <PageHeader title="Timetable" />
        <PageBody><p className="text-sm text-destructive">No tenant context.</p></PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Timetable"
        description="Manage class schedules for the current term — US-ACA-006"
        actions={
          openTermId && canEdit && entries.length > 0 ? (
            <Button size="sm" onClick={() => publishTimetable.mutate({ termId: openTermId, classArmId: classArms[0]?.id ?? '' } as any)} disabled={publishTimetable.isPending}>
              <Send className="mr-1.5 size-3.5" />
              Publish
            </Button>
          ) : null
        }
      />
      <PageBody>
        {!openTermId ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <Clock className="mb-2 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No open term found.</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : (
          <div className="space-y-6">
            {canEdit ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Add Entry</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}>
                    <Plus className="mr-1 size-3.5" /> {adding ? 'Cancel' : 'Add period'}
                  </Button>
                </CardHeader>
                {adding ? (
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onAdd)} className="grid grid-cols-2 gap-4 md:grid-cols-3">
                        <FormField control={form.control} name="dayOfWeek" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Day</FormLabel>
                            <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>{DAYS.map((d, i) => <SelectItem key={d} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="startMinute" render={({ field }) => (
                          <FormItem><FormLabel>Start (minutes from midnight)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="endMinute" render={({ field }) => (
                          <FormItem><FormLabel>End (minutes)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="subjectId" render={({ field }) => (
                          <FormItem><FormLabel>Subject ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="classArmId" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Class</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                              <SelectContent>{classArms.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <div className="col-span-2 md:col-span-3 flex justify-end">
                          <Button type="submit" disabled={createEntry.isPending}>Save entry</Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                ) : null}
              </Card>
            ) : null}

            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
                <p className="text-sm text-muted-foreground">No timetable entries yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Class</TableHead>
                    {canEdit ? <TableHead className="w-20" /> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{DAYS[entry.dayOfWeek ?? 0]}</TableCell>
                      <TableCell>{Math.floor(entry.startMinute / 60)}:{String(entry.startMinute % 60).padStart(2, '0')} - {Math.floor(entry.endMinute / 60)}:{String(entry.endMinute % 60).padStart(2, '0')}</TableCell>
                      <TableCell>{entry.subjectId?.slice(0, 8) ?? '—'}</TableCell>
                      <TableCell>{classArms.find((a: any) => a.id === entry.classArmId)?.name ?? entry.classArmId?.slice(0, 8)}</TableCell>
                      {canEdit ? (
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteEntry.mutate({ entryId: entry.id })} disabled={deleteEntry.isPending}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </TableCell>
                      ) : null}
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
