'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Skeleton } from '@loomis/ui-web';
import { Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { useCan } from '@/lib/auth/use-capability';
import { useApiClient } from '@loomis/api-client';
import { useQuery } from '@tanstack/react-query';

const WORKFLOW_TYPES = [
  { key: 'refund_approval', label: 'Refund Approval' },
  { key: 'grade_correction', label: 'Grade Correction' },
  { key: 'fee_structure_amendment', label: 'Fee Structure Amendment' },
  { key: 'student_transfer', label: 'Student Transfer' },
  { key: 'psf_rate_override', label: 'PSF Rate Override' },
  { key: 'privileged_change', label: 'Privileged Change' },
];

const templateSchema = z.object({
  workflowType: z.string(),
  approverRoles: z.string(),
  escalationTimeoutHours: z.coerce.number().min(1, 'Must be at least 1'),
  autoEscalate: z.boolean().optional(),
});

type TemplateForm = z.infer<typeof templateSchema>;

interface WorkflowTemplate {
  workflowType: string;
  approverRoles?: string[];
  escalationTimeoutHours?: number;
  autoEscalate?: boolean;
}

interface WorkflowTemplatesResponse {
  templates?: WorkflowTemplate[];
}

export default function WorkflowTemplatesPage() {
  const tenantId = useTenantId();
  const client = useApiClient();
  const canConfigure = useCan('staff.onboard');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['workflow', tenantId, 'templates'],
    queryFn: () => client.get<WorkflowTemplatesResponse>(`/tenants/${tenantId}/workflows/templates`),
    enabled: Boolean(tenantId),
  });

  const templates = data?.templates ?? [];

  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      workflowType: '',
      approverRoles: 'principal,accountant',
      escalationTimeoutHours: 72,
      autoEscalate: true,
    },
  });

  async function onSave(values: TemplateForm) {
    try {
      await client.patch(`/tenants/${tenantId}/workflows/templates/${values.workflowType}`, {
        approverRoles: values.approverRoles.split(',').map((r) => r.trim()),
        escalationTimeoutHours: values.escalationTimeoutHours,
        autoEscalate: values.autoEscalate ?? false,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // handled
    }
  }

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Workflow Templates" />
        <PageBody><p className="text-sm text-destructive">No tenant context.</p></PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Workflow Templates"
        description="Configure approval chains for your school — US-WRK-001"
      />
      <PageBody>
        {!canConfigure ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <p className="text-sm text-muted-foreground">You do not have permission to configure workflow templates.</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Workflow Types</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {WORKFLOW_TYPES.map((wt) => {
                    const existing = templates.find((t) => t.workflowType === wt.key);
                    return (
                      <button
                        key={wt.key}
                        type="button"
                        onClick={() => {
                          setSelectedType(wt.key);
                          form.setValue('workflowType', wt.key);
                          if (existing) {
                            form.setValue('approverRoles', (existing.approverRoles ?? []).join(', '));
                            form.setValue('escalationTimeoutHours', existing.escalationTimeoutHours ?? 72);
                            form.setValue('autoEscalate', existing.autoEscalate ?? true);
                          }
                        }}
                        className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                          selectedType === wt.key
                            ? 'border-brand-500 bg-brand-50 dark:border-mint-400 dark:bg-forest-800'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{wt.label}</span>
                          {existing ? (
                            <span className="text-[10px] text-success">Configured</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Default</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {selectedType ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Configure: {WORKFLOW_TYPES.find((w) => w.key === selectedType)?.label}</CardTitle></CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
                      <FormField control={form.control} name="approverRoles" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Approver Roles</FormLabel>
                          <FormControl><Input placeholder="principal, accountant, school_owner" {...field} /></FormControl>
                          <p className="text-xs text-muted-foreground">Comma-separated role names in approval order</p>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="escalationTimeoutHours" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Escalation Timeout (hours)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="flex justify-end gap-2">
                        <Button type="submit" disabled={saved}>
                          <Save className="mr-1.5 size-4" />
                          {saved ? 'Saved!' : 'Save Template'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-16">
                  <p className="text-sm text-muted-foreground">Select a workflow type to configure.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </PageBody>
    </>
  );
}
