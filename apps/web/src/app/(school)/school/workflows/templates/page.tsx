'use client';

import { useMemo, useState } from 'react';
import {
  DEFAULT_WORKFLOW_CHAINS,
  upsertWorkflowTemplateRequest,
  type WorkflowTemplateResponse,
  type WorkflowType,
} from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Skeleton,
  cn,
} from '@loomis/ui-web';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { WorkflowTemplatesHero } from '@/components/workflow/workflow-templates-hero';
import { PageBody } from '@/components/school/school-shell';
import { formatRoleLabel } from '@/components/school/school-nav-config';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { useCan } from '@/lib/auth/use-capability';
import { formatWorkflowTypeLabel } from '@/lib/workflow/workflow-labels';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { useApiClient, useIdempotentMutation } from '@loomis/api-client';

const pageClass = 'max-w-[1400px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8';

const TENANT_WORKFLOW_TYPES = (
  Object.entries(DEFAULT_WORKFLOW_CHAINS) as [WorkflowType, (typeof DEFAULT_WORKFLOW_CHAINS)[WorkflowType]][]
)
  .filter(([, cfg]) => cfg.scope === 'tenant')
  .map(([type]) => type);

interface WorkflowTemplatesListResponse {
  templates: WorkflowTemplateResponse[];
}

const templateEditorSchema = z.object({
  stepTimeoutHours: z.coerce.number().int().positive(),
  isActive: z.boolean(),
});

type TemplateEditorValues = z.infer<typeof templateEditorSchema>;

function isTenantOverride(template: WorkflowTemplateResponse): boolean {
  return template.updatedAt !== new Date(0).toISOString();
}

export default function WorkflowTemplatesPage() {
  const tenantId = useTenantId();
  const client = useApiClient();
  const canConfigure = useCan('staff.role.assign');
  const [selectedType, setSelectedType] = useState<WorkflowType | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const templatesQuery = useQuery({
    queryKey: ['workflow', tenantId, 'templates'],
    queryFn: () => client.get<WorkflowTemplatesListResponse>(`/tenants/${tenantId}/workflows/templates`),
    enabled: Boolean(tenantId),
  });

  const templates = templatesQuery.data?.templates ?? [];

  const saveTemplate = useIdempotentMutation({
    mutationFn: (client, body: z.infer<typeof upsertWorkflowTemplateRequest>, idempotencyKey) =>
      client.put<WorkflowTemplateResponse>(
        `/tenants/${tenantId}/workflows/templates/${selectedType}`,
        body,
        { idempotencyKey },
      ),
    invalidates: [['workflow', tenantId, 'templates']],
  });

  const form = useForm<TemplateEditorValues>({
    resolver: zodResolver(templateEditorSchema),
    defaultValues: { stepTimeoutHours: 48, isActive: true },
  });

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.workflowType === selectedType) ?? null,
    [templates, selectedType],
  );

  const metrics = useMemo(() => {
    const tenantTemplates = templates.filter((t) => TENANT_WORKFLOW_TYPES.includes(t.workflowType));
    return {
      configuredCount: tenantTemplates.filter(isTenantOverride).length,
      tenantTypeCount: TENANT_WORKFLOW_TYPES.length,
      mandatoryCount: tenantTemplates.filter((t) => t.isMandatory).length,
    };
  }, [templates]);

  function selectType(type: WorkflowType) {
    setSelectedType(type);
    setSaveError(null);
    const template = templates.find((row) => row.workflowType === type);
    const timeout = template?.approverChain[0]?.timeoutHours ?? DEFAULT_WORKFLOW_CHAINS[type].chain[0]?.timeoutHours ?? 48;
    form.reset({
      stepTimeoutHours: timeout ?? 48,
      isActive: template?.isActive ?? true,
    });
  }

  async function onSave(values: TemplateEditorValues) {
    if (!selectedType) return;
    setSaveError(null);
    const baseChain =
      selectedTemplate?.approverChain ?? DEFAULT_WORKFLOW_CHAINS[selectedType].chain;
    const approverChain = baseChain.map((step, index) => ({
      ...step,
      timeoutHours: index === 0 ? values.stepTimeoutHours : step.timeoutHours ?? values.stepTimeoutHours,
    }));
    try {
      await saveTemplate.mutateAsync({ approverChain, isActive: values.isActive });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(academicErrorMessage(err));
    }
  }

  if (!tenantId) {
    return (
      <PageBody className={pageClass}>
        <Alert variant="destructive">
          <AlertDescription>No tenant context.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!canConfigure) {
    return (
      <PageBody className={pageClass}>
        <div className={`${ACADEMIC_UI.dataPanel} p-12 text-center`}>
          <p className="text-[15px] font-semibold text-neutral-800">Access restricted</p>
          <p className="mt-2 text-[13px] text-neutral-500">
            Only the school owner or principal can configure workflow templates.
          </p>
        </div>
      </PageBody>
    );
  }

  return (
    <PageBody className={pageClass}>
      <div className="space-y-6">
        <WorkflowTemplatesHero
          configuredCount={metrics.configuredCount}
          tenantTypeCount={metrics.tenantTypeCount}
          mandatoryCount={metrics.mandatoryCount}
          isLoading={templatesQuery.isLoading}
        />

        {templatesQuery.isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className={`${ACADEMIC_UI.dataPanel} p-5 sm:p-6`}>
              <p className={ACADEMIC_UI.sectionLabel}>Workflow catalogue</p>
              <p className="mt-1 text-[14px] font-semibold text-neutral-900">Select a type</p>
              <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {TENANT_WORKFLOW_TYPES.map((type) => {
                  const template = templates.find((row) => row.workflowType === type);
                  const customised = template ? isTenantOverride(template) : false;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => selectType(type)}
                      className={cn(
                        'w-full rounded-xl border px-4 py-3 text-left transition-colors',
                        selectedType === type
                          ? 'border-brand-400 bg-brand-50/80 ring-1 ring-brand-200/60'
                          : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-semibold text-neutral-900">
                            {formatWorkflowTypeLabel(type)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-neutral-500">
                            {(template?.approverChain ?? DEFAULT_WORKFLOW_CHAINS[type].chain)
                              .map((step) => formatRoleLabel(step.role))
                              .join(' → ')}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                            customised
                              ? 'bg-accent-green-50 text-accent-green-700'
                              : 'bg-neutral-100 text-neutral-500',
                          )}
                        >
                          {customised ? 'Custom' : 'Default'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedType && selectedTemplate ? (
              <div className={`${ACADEMIC_UI.dataPanel} p-5 sm:p-6`}>
                <p className={ACADEMIC_UI.sectionLabel}>Configuration</p>
                <p className="mt-1 text-[14px] font-semibold text-neutral-900">
                  {formatWorkflowTypeLabel(selectedType)}
                </p>

                <div className="mt-4 rounded-xl border border-brand-100/40 bg-brand-50/20 p-4">
                  <p className={ACADEMIC_UI.sectionLabel}>Approver chain</p>
                  <ol className="mt-2 space-y-2">
                    {selectedTemplate.approverChain.map((step, index) => (
                      <li key={`${step.role}-${index}`} className="text-[13px] text-neutral-700">
                        <span className="font-semibold text-neutral-900">
                          {index + 1}. {formatRoleLabel(step.role)}
                        </span>
                        {step.timeoutHours ? (
                          <span className="text-neutral-500"> · {step.timeoutHours}h timeout</span>
                        ) : null}
                        {step.escalatesToRole ? (
                          <span className="text-neutral-500">
                            {' '}
                            → escalates to {formatRoleLabel(step.escalatesToRole)}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSave)} className="mt-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="stepTimeoutHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First-step timeout (hours)</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} className="h-11 max-w-xs" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex items-start gap-3 rounded-xl border border-neutral-200 p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(v) => field.onChange(v === true)}
                              disabled={selectedTemplate.isMandatory}
                            />
                          </FormControl>
                          <div>
                            <FormLabel className="font-normal text-[13px] leading-relaxed">
                              Workflow active for this school
                              {selectedTemplate.isMandatory ? ' (mandatory — cannot disable)' : ''}
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                    {saveError ? (
                      <Alert variant="destructive">
                        <AlertDescription>{saveError}</AlertDescription>
                      </Alert>
                    ) : null}
                    <div className="flex justify-end">
                      <button type="submit" className={ACADEMIC_UI.btnPrimary} disabled={saveTemplate.isPending}>
                        {saved ? 'Saved!' : saveTemplate.isPending ? 'Saving…' : 'Save template'}
                      </button>
                    </div>
                  </form>
                </Form>
              </div>
            ) : (
              <div className={`${ACADEMIC_UI.dataPanel} flex items-center justify-center p-12`}>
                <p className="text-[13px] text-neutral-500">Select a workflow type to configure.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageBody>
  );
}
