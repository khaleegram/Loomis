'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSendClassMessage, useTermEnrollmentRoster } from '@loomis/api-client';
import { sendClassMessageRequest } from '@loomis/contracts';
import { Form, FormControl, FormField, FormItem, FormMessage, Input, Textarea } from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { MessageCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { AcademicScopePicker } from '@/components/academic/ops/academic-scope-picker';
import { CommsStudentRosterPicker } from '@/components/comms/comms-student-roster-picker';
import {
  ChipOptionPicker,
  FormSubmitError,
  SmartFormPanel,
  SmartFormPanelHeader,
  SmartFormSection,
  smartInputClass,
} from '@/components/shared/smart-form';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { classArmOptions } from '@/lib/academic/use-academic-ops-context';
import type { ClassArmResponse, ClassLevelResponse } from '@loomis/contracts';
import type { Dispatch, SetStateAction } from 'react';

type RecipientMode = 'whole_class' | 'selected_students';

const RECIPIENT_OPTIONS = [
  { value: 'whole_class' as const, label: 'Whole class' },
  { value: 'selected_students' as const, label: 'Selected students' },
];

interface CommsClassScope {
  arms: ClassArmResponse[];
  levels: ClassLevelResponse[];
  termId: string | null;
  classArmId: string | null;
  setClassArmId: Dispatch<SetStateAction<string | null>>;
}

interface CommsComposeClassMessageProps {
  tenantId: string;
  ctx: CommsClassScope;
}

export function CommsComposeClassMessage({ tenantId, ctx }: CommsComposeClassMessageProps) {
  const sendClassMessage = useSendClassMessage(tenantId);
  const arms = classArmOptions(ctx.arms, ctx.levels);
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('whole_class');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [recipientError, setRecipientError] = useState<string | null>(null);

  const rosterQuery = useTermEnrollmentRoster(tenantId, ctx.termId ?? '');
  const classStudents = useMemo(() => {
    if (!ctx.classArmId) return [];
    return (rosterQuery.data?.entries ?? []).filter((entry) => entry.classArmId === ctx.classArmId);
  }, [ctx.classArmId, rosterQuery.data?.entries]);

  const form = useForm<z.infer<typeof sendClassMessageRequest>>({
    resolver: zodResolver(sendClassMessageRequest),
    defaultValues: { termId: '', classArmId: '', subject: '', body: '' },
  });

  useEffect(() => {
    if (ctx.termId) form.setValue('termId', ctx.termId);
    if (ctx.classArmId) form.setValue('classArmId', ctx.classArmId);
  }, [ctx.termId, ctx.classArmId, form]);

  useEffect(() => {
    setSelectedStudentIds([]);
    setRecipientError(null);
  }, [ctx.classArmId, ctx.termId]);

  async function onSubmit(values: z.infer<typeof sendClassMessageRequest>) {
    setRecipientError(null);
    if (recipientMode === 'selected_students' && selectedStudentIds.length === 0) {
      setRecipientError('Select at least one student.');
      return;
    }

    const payload: z.infer<typeof sendClassMessageRequest> = {
      ...values,
      ...(recipientMode === 'selected_students' ? { studentIds: selectedStudentIds } : {}),
    };

    try {
      await sendClassMessage.mutateAsync(payload);
      form.reset({
        termId: values.termId,
        classArmId: values.classArmId,
        subject: '',
        body: '',
      });
      setSelectedStudentIds([]);
      form.clearErrors('root');
    } catch (err) {
      form.setError('root', { message: academicErrorMessage(err) });
    }
  }

  const canSend = Boolean(ctx.termId && ctx.classArmId);
  const submitLabel =
    recipientMode === 'selected_students' && selectedStudentIds.length > 0
      ? `Send to ${selectedStudentIds.length} student${selectedStudentIds.length === 1 ? '' : 's'}' parents`
      : 'Send to class parents';

  return (
    <div className="space-y-4">
      <AcademicScopePicker
        classArmOptions={arms}
        classArmId={ctx.classArmId}
        onClassArmChange={ctx.setClassArmId}
        selectedClassMeta="Message all parents or selected students' parents"
      />

      <SmartFormPanel
        header={
          <SmartFormPanelHeader
            icon={MessageCircle}
            title="Message parents"
            subtitle="Reach every parent in your class, or choose specific students. Parents can reply directly to you."
          />
        }
        footer={
          <div className="flex justify-end px-5 py-4">
            <button
              type="submit"
              form="comms-class-form"
              className={ACADEMIC_UI.btnPrimary}
              disabled={!canSend || sendClassMessage.isPending}
            >
              {sendClassMessage.isPending ? 'Sending…' : submitLabel}
            </button>
          </div>
        }
      >
        {!canSend ? (
          <p className="text-[13px] text-neutral-500">Select your class above before composing.</p>
        ) : (
          <Form {...form}>
            <form id="comms-class-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormSubmitError message={form.formState.errors.root?.message ?? null} />

              <SmartFormSection title="Recipients">
                <ChipOptionPicker
                  options={RECIPIENT_OPTIONS}
                  value={recipientMode}
                  onChange={(mode) => {
                    setRecipientMode(mode);
                    setRecipientError(null);
                    if (mode === 'whole_class') setSelectedStudentIds([]);
                  }}
                />
                {recipientMode === 'selected_students' ? (
                  <div className="mt-3">
                    <CommsStudentRosterPicker
                      students={classStudents}
                      selectedIds={selectedStudentIds}
                      onChange={setSelectedStudentIds}
                      isLoading={rosterQuery.isLoading}
                    />
                    {recipientError ? (
                      <p className="mt-2 text-[12px] font-medium text-red-600">{recipientError}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-[12px] text-neutral-500">
                    All verified parent accounts linked to students in this class will receive the message.
                  </p>
                )}
              </SmartFormSection>

              <SmartFormSection title="Subject">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="e.g. Week 4 homework reminder" className={smartInputClass} {...field} />
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
                          placeholder="Share class-specific updates with parents…"
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
    </div>
  );
}
