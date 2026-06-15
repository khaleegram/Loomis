'use client';

import { useMemo, useState } from 'react';
import { useSendStudentParentMessage, useStudents } from '@loomis/api-client';
import { sendStudentParentMessageRequest } from '@loomis/contracts';
import { Form, FormControl, FormField, FormItem, FormMessage, Input, Textarea, cn } from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import {
  FormSubmitError,
  SmartFormPanel,
  SmartFormPanelHeader,
  SmartFormSection,
  smartInputClass,
} from '@/components/shared/smart-form';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { useSchoolAcademic } from '@/lib/academic/school-academic-context';

interface CommsComposeStudentParentProps {
  tenantId: string;
}

export function CommsComposeStudentParent({ tenantId }: CommsComposeStudentParentProps) {
  const { termId, activeTerm, hasWorkingTerm } = useSchoolAcademic();
  const sendMessage = useSendStudentParentMessage(tenantId);
  const studentsQuery = useStudents(tenantId, { status: 'enrolled' });

  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const students = studentsQuery.data?.students ?? [];
  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students.slice(0, 25);
    return students
      .filter(
        (s) =>
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          s.admissionNo.toLowerCase().includes(q),
      )
      .slice(0, 25);
  }, [students, search]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? null;

  const form = useForm<z.infer<typeof sendStudentParentMessageRequest>>({
    resolver: zodResolver(sendStudentParentMessageRequest),
    defaultValues: { termId: '', studentId: '', subject: '', body: '' },
  });

  const canSend = Boolean(termId && selectedStudentId);

  async function onSubmit(values: z.infer<typeof sendStudentParentMessageRequest>) {
    try {
      await sendMessage.mutateAsync(values);
      form.reset({
        termId: values.termId,
        studentId: values.studentId,
        subject: '',
        body: '',
      });
      form.clearErrors('root');
    } catch (err) {
      form.setError('root', { message: academicErrorMessage(err) });
    }
  }

  function selectStudent(studentId: string) {
    setSelectedStudentId(studentId);
    form.setValue('studentId', studentId);
    if (termId) form.setValue('termId', termId);
  }

  return (
    <SmartFormPanel
      header={
        <SmartFormPanelHeader
          icon={UserRound}
          title="Message a student's parents"
          subtitle={
            hasWorkingTerm
              ? `Delivered to verified parent accounts for ${activeTerm?.name ?? 'the current term'}. Parents can reply.`
              : 'No working term is set. Configure and open a term in Academic sessions first.'
          }
        />
      }
      footer={
        <div className="flex justify-end px-5 py-4">
          <button
            type="submit"
            form="comms-student-parent-form"
            className={ACADEMIC_UI.btnPrimary}
            disabled={!canSend || sendMessage.isPending}
          >
            {sendMessage.isPending ? 'Sending…' : 'Send to parents'}
          </button>
        </div>
      }
    >
      {!hasWorkingTerm ? (
        <p className="text-[13px] text-neutral-500">Open a term in Academic sessions before sending messages.</p>
      ) : (
        <Form {...form}>
          <form id="comms-student-parent-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormSubmitError message={form.formState.errors.root?.message ?? null} />

            <SmartFormSection title="Student">
              <input type="hidden" {...form.register('termId')} value={termId ?? ''} />
              <input type="hidden" {...form.register('studentId')} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search enrolled students…"
                className={smartInputClass}
              />
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50/50 p-1">
                {filteredStudents.map((student) => {
                  const active = selectedStudentId === student.id;
                  return (
                    <li key={student.id}>
                      <button
                        type="button"
                        onClick={() => selectStudent(student.id)}
                        className={cn(
                          'flex w-full min-h-[44px] items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                          active
                            ? 'bg-brand-50 font-semibold text-brand-900 ring-1 ring-brand-200/60'
                            : 'text-neutral-800 hover:bg-white',
                        )}
                      >
                        <span>
                          {student.firstName} {student.lastName}
                        </span>
                        <span className="text-[11px] font-medium text-neutral-500">
                          {student.admissionNo}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {selectedStudent ? (
                <p className="text-[12px] font-medium text-neutral-500">
                  Messaging parents of {selectedStudent.firstName} {selectedStudent.lastName}.
                </p>
              ) : (
                <FormMessage>{form.formState.errors.studentId?.message}</FormMessage>
              )}
            </SmartFormSection>

            <SmartFormSection title="Subject">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="e.g. Follow-up on attendance" className={smartInputClass} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SmartFormSection>

            <SmartFormSection title="Message">
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        rows={6}
                        placeholder="Write your message to this student's parents…"
                        className="rounded-xl border-neutral-200 bg-white text-[13px] leading-relaxed focus:border-brand-300 focus:ring-2 focus:ring-brand-200/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SmartFormSection>
          </form>
        </Form>
      )}
    </SmartFormPanel>
  );
}
