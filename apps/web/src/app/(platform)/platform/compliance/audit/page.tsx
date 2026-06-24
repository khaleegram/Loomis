'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuditLogSearch, useExportAuditLog, usePlatformTenants, useStepUpMfa } from '@loomis/api-client';
import type { AuditLogEntryResponse, AuditSensitivity } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  FilterChipBar,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
} from '@loomis/ui-web';
import { FileSearch, Search, Shield, Download } from 'lucide-react';
import { uuidv7 } from 'uuidv7';

import { StepUpMfaFields } from '@/components/academic/step-up-mfa-fields';
import { PlatformConsoleHero } from '@/components/platform/platform-console-hero';
import { PageBody } from '@/components/platform/platform-shell';
import {
  FormSubmitError,
  SmartFormHeader,
  SmartFormPanel,
  SmartFormPanelHeader,
  SmartFormSection,
  smartInputClass,
} from '@/components/shared/smart-form';
import { PLATFORM_PAGE_CLASS, PLATFORM_UI } from '@/lib/platform/platform-ui';
import { SURFACES } from '@/lib/design/surfaces';
import type { AuditLogFilters } from '@loomis/api-client';

const SENSITIVITIES: AuditSensitivity[] = [
  'standard',
  'financial',
  'pii',
  'child_pii',
  'privileged',
  'security',
];

const exportFormSchema = z.object({
  reason: z.string().min(10, 'Provide a business reason (min 10 characters)'),
  mfaCode: z.string().length(6, 'Enter 6-digit code'),
});

type ExportForm = z.infer<typeof exportFormSchema>;

export default function AuditLogPage() {
  const [draftFilters, setDraftFilters] = useState<AuditLogFilters>({ limit: 50 });
  const [appliedFilters, setAppliedFilters] = useState<AuditLogFilters>({ limit: 50 });
  const [exportOpen, setExportOpen] = useState(false);
  const exportIdempotencyRef = useRef(uuidv7());

  const exportForm = useForm<ExportForm>({
    resolver: zodResolver(exportFormSchema),
    defaultValues: { reason: '', mfaCode: '' },
  });

  const stepUp = useStepUpMfa();
  const ensureStepUpToken = useCallback(async () => {
    const code = exportForm.getValues('mfaCode');
    const res = await stepUp.mutateAsync({ action: 'data_export', code });
    return { mfaToken: res.mfaToken, expiresAt: res.expiresAt };
  }, [stepUp, exportForm]);

  const exportAudit = useExportAuditLog({ ensureStepUpToken });

  const { data, isLoading, isError } = useAuditLogSearch(appliedFilters);
  const { data: tenantsData } = usePlatformTenants();

  const schoolNameByTenantId = useMemo(() => {
    const map = new Map<string, string>();
    for (const tenant of tenantsData?.tenants ?? []) {
      map.set(tenant.id, tenant.name);
    }
    return map;
  }, [tenantsData?.tenants]);

  const chips = useMemo(() => {
    const list: { key: string; label: string; value: string }[] = [];
    if (appliedFilters.actorUserId)
      list.push({ key: 'actorUserId', label: 'Actor', value: appliedFilters.actorUserId });
    if (appliedFilters.tenantId)
      list.push({
        key: 'tenantId',
        label: 'School',
        value: schoolNameByTenantId.get(appliedFilters.tenantId) ?? 'School',
      });
    if (appliedFilters.action)
      list.push({ key: 'action', label: 'Action', value: appliedFilters.action });
    if (appliedFilters.sensitivity)
      list.push({ key: 'sensitivity', label: 'Sensitivity', value: appliedFilters.sensitivity });
    if (appliedFilters.from)
      list.push({ key: 'from', label: 'From', value: appliedFilters.from.slice(0, 10) });
    if (appliedFilters.to)
      list.push({ key: 'to', label: 'To', value: appliedFilters.to.slice(0, 10) });
    return list;
  }, [appliedFilters, schoolNameByTenantId]);

  function applySearch() {
    setAppliedFilters({ ...draftFilters, cursor: undefined });
  }

  function removeChip(key: string) {
    const next = { ...appliedFilters, [key]: undefined, cursor: undefined };
    setAppliedFilters(next);
    setDraftFilters(next);
  }

  async function handleExport(values: ExportForm) {
    try {
      await exportAudit.mutateFinancialAsync({
        filters: appliedFilters,
        format: 'csv',
        reason: values.reason,
      });
      setExportOpen(false);
      exportForm.reset();
      exportIdempotencyRef.current = uuidv7();
    } catch (error) {
      exportForm.setError('root', {
        message: error instanceof Error ? error.message : 'Export failed',
      });
      exportIdempotencyRef.current = uuidv7();
    }
  }

  return (
    <PageBody className={PLATFORM_PAGE_CLASS}>
      <div className="space-y-6">
        <PlatformConsoleHero
          sectionLabel="Compliance · audit"
          title="Audit log"
          description="Search and export immutable audit events — US-AUD-001"
          isLoading={isLoading}
          actions={
            <button type="button" className={PLATFORM_UI.btnSecondary} onClick={() => setExportOpen(true)}>
              <Download aria-hidden className="size-4" />
              Export
            </button>
          }
          stats={[
            {
              label: 'Results',
              value: String(data?.entries.length ?? 0),
              hint: 'Current page',
              icon: FileSearch,
              gradient: SURFACES.kpi.g1,
            },
            {
              label: 'Filters',
              value: String(chips.length),
              hint: 'Active constraints',
              icon: Search,
              gradient: SURFACES.kpi.g2,
            },
            {
              label: 'Sensitivity',
              value: data?.sensitiveQuery ? 'Elevated' : 'Normal',
              hint: 'Query classification',
              icon: Shield,
              gradient: data?.sensitiveQuery ? SURFACES.kpi.g4 : SURFACES.kpi.g3,
            },
            {
              label: 'Export',
              value: 'MFA',
              hint: 'Step-up required',
              icon: Download,
              gradient: SURFACES.kpi.g4,
            },
          ]}
        />

        <SmartFormPanel
          header={
            <SmartFormPanelHeader
              title="Investigator console"
              subtitle="Filter immutable audit events before export."
            />
          }
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Actor user ID"
              className={smartInputClass}
              value={draftFilters.actorUserId ?? ''}
              onChange={(e) =>
                setDraftFilters((f) => ({ ...f, actorUserId: e.target.value || undefined }))
              }
            />
            <Input
              placeholder="Tenant ID"
              className={smartInputClass}
              value={draftFilters.tenantId ?? ''}
              onChange={(e) =>
                setDraftFilters((f) => ({ ...f, tenantId: e.target.value || undefined }))
              }
            />
            <Input
              placeholder="Action type"
              className={smartInputClass}
              value={draftFilters.action ?? ''}
              onChange={(e) =>
                setDraftFilters((f) => ({ ...f, action: e.target.value || undefined }))
              }
            />
            <Select
              value={draftFilters.sensitivity ?? ''}
              onValueChange={(v) =>
                setDraftFilters((f) => ({
                  ...f,
                  sensitivity: v ? (v as AuditSensitivity) : undefined,
                }))
              }
            >
              <SelectTrigger className={smartInputClass}>
                <SelectValue placeholder="Sensitivity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All sensitivities</SelectItem>
                {SENSITIVITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" className={PLATFORM_UI.btnPrimary} onClick={applySearch}>
              <Search aria-hidden className="size-4" />
              Search
            </button>
            <FilterChipBar
              chips={chips}
              onRemove={removeChip}
              onClearAll={() => {
                const empty = { limit: 50 };
                setDraftFilters(empty);
                setAppliedFilters(empty);
              }}
            />
          </div>
        </SmartFormPanel>

        {data?.sensitiveQuery ? (
          <Alert variant="destructive">
            <AlertTitle>Sensitive query</AlertTitle>
            <AlertDescription>
              This filter combination will generate an alert for the Platform Owner.
            </AlertDescription>
          </Alert>
        ) : null}

        {isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load audit log. Ensure the audit read API is available (
              <code className="text-xs">GET /platform/audit/events</code>).
            </AlertDescription>
          </Alert>
        ) : (
          <div className={`${PLATFORM_UI.dataPanel} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead className={PLATFORM_UI.tableHeader}>
                  <tr>
                    {['Timestamp', 'Action', 'Resource', 'Sensitivity', 'Result'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-t border-brand-50/80">
                        <td colSpan={5} className="px-4 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : (data?.entries ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-[13px] text-neutral-500">
                        No audit events match your filters
                      </td>
                    </tr>
                  ) : (
                    (data?.entries ?? []).map((entry: AuditLogEntryResponse) => (
                      <tr key={entry.id} className="border-t border-brand-50/80">
                        <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-neutral-700">
                          {new Date(entry.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-neutral-800">{entry.action}</td>
                        <td className="px-4 py-3 text-[11px] text-neutral-700">
                          {entry.resourceType.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-neutral-600">{entry.sensitivity}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-neutral-600">{entry.result}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <SmartFormHeader
            surface="dialog"
            eyebrow="Data export"
            title="Confirm audit export"
            description="Logged as a data access event. Step-up MFA is required."
          />
          <div className="space-y-4 px-6 py-5">
            <Alert>
              <AlertDescription className="text-[12px]">
                Exporting approximately {data?.entries.length ?? 0} visible records with current
                filters.
              </AlertDescription>
            </Alert>
            <Form {...exportForm}>
              <form className="space-y-4" onSubmit={exportForm.handleSubmit(handleExport)}>
                <FormSubmitError message={exportForm.formState.errors.root?.message ?? null} />
                <SmartFormSection title="Business reason">
                  <FormField
                    control={exportForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Why is this export required?"
                            className="rounded-xl border-neutral-200 bg-white text-[13px] focus:border-brand-300 focus:ring-2 focus:ring-brand-200/50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SmartFormSection>
                <SmartFormSection title="Step-up MFA">
                  <StepUpMfaFields control={exportForm.control} name="mfaCode" />
                </SmartFormSection>
                <DialogFooter className="gap-2 border-t border-neutral-100 bg-neutral-50/50 px-0 pb-0 pt-4 sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => setExportOpen(false)}>
                    Cancel
                  </Button>
                  <button type="submit" className={PLATFORM_UI.btnPrimary} disabled={exportAudit.isPending}>
                    {exportAudit.isPending ? 'Exporting…' : 'Confirm export'}
                  </button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </PageBody>
  );
}
