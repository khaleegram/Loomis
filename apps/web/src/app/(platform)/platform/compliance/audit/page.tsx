'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuditLogSearch, useExportAuditLog, useStepUpMfa } from '@loomis/api-client';
import type { AuditLogEntryResponse, AuditSensitivity } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FilterChipBar,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@loomis/ui-web';
import { Download, Search } from 'lucide-react';
import { uuidv7 } from 'uuidv7';

import { StepUpMfaFields } from '@/components/academic/step-up-mfa-fields';
import { PageBody, PageHeader } from '@/components/platform/platform-shell';
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

  const chips = useMemo(() => {
    const list: { key: string; label: string; value: string }[] = [];
    if (appliedFilters.actorUserId)
      list.push({ key: 'actorUserId', label: 'Actor', value: appliedFilters.actorUserId });
    if (appliedFilters.tenantId)
      list.push({ key: 'tenantId', label: 'Tenant', value: appliedFilters.tenantId.slice(0, 8) + '…' });
    if (appliedFilters.action)
      list.push({ key: 'action', label: 'Action', value: appliedFilters.action });
    if (appliedFilters.sensitivity)
      list.push({ key: 'sensitivity', label: 'Sensitivity', value: appliedFilters.sensitivity });
    if (appliedFilters.from)
      list.push({ key: 'from', label: 'From', value: appliedFilters.from.slice(0, 10) });
    if (appliedFilters.to)
      list.push({ key: 'to', label: 'To', value: appliedFilters.to.slice(0, 10) });
    return list;
  }, [appliedFilters]);

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
    <>
      <PageHeader
        title="Audit Log"
        description="Search and export immutable audit events — US-AUD-001"
        actions={
          <Button size="sm" variant="outline" onClick={() => setExportOpen(true)}>
            <Download aria-hidden className="mr-1.5 size-4" />
            Export
          </Button>
        }
      />
      <PageBody>
        {/* Sticky filter bar — Investigator Console */}
        <div className="sticky top-0 z-10 -mx-6 mb-6 border-b border-neutral-200 bg-neutral-50/95 px-6 py-4 backdrop-blur dark:border-forest-800 dark:bg-forest-950/95">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Actor user ID"
              value={draftFilters.actorUserId ?? ''}
              onChange={(e) =>
                setDraftFilters((f) => ({ ...f, actorUserId: e.target.value || undefined }))
              }
            />
            <Input
              placeholder="Tenant ID"
              value={draftFilters.tenantId ?? ''}
              onChange={(e) =>
                setDraftFilters((f) => ({ ...f, tenantId: e.target.value || undefined }))
              }
            />
            <Input
              placeholder="Action type"
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
              <SelectTrigger>
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
            <Button size="sm" onClick={applySearch}>
              <Search aria-hidden className="mr-1.5 size-4" />
              Search
            </Button>
            <FilterChipBar chips={chips} onRemove={removeChip} onClearAll={() => {
              const empty = { limit: 50 };
              setDraftFilters(empty);
              setAppliedFilters(empty);
            }} />
          </div>
        </div>

        {data?.sensitiveQuery ? (
          <Alert variant="destructive" className="mb-4">
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
          <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-forest-800 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Sensitivity</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (data?.entries ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center font-sans text-sm text-muted-foreground">
                      No audit events match your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.entries ?? []).map((entry: AuditLogEntryResponse) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {new Date(entry.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{entry.action}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {entry.resourceType}
                        {entry.resourceId ? ` · ${entry.resourceId.slice(0, 8)}` : ''}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{entry.sensitivity}</TableCell>
                      <TableCell className="font-mono text-xs">{entry.result}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </PageBody>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Confirm Audit Export</DialogTitle>
            <DialogDescription>
              This export will be logged as a data access event. Step-up MFA is required.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertDescription className="text-xs">
              You are exporting approximately {data?.entries.length ?? 0} visible records with
              the current filters. All export actions are immutable audit events.
            </AlertDescription>
          </Alert>
          <Form {...exportForm}>
            <form className="space-y-4" onSubmit={exportForm.handleSubmit(handleExport)}>
              {exportForm.formState.errors.root ? (
                <Alert variant="destructive">
                  <AlertDescription>{exportForm.formState.errors.root.message}</AlertDescription>
                </Alert>
              ) : null}
              <FormField
                control={exportForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business reason</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Why is this export required?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <StepUpMfaFields control={exportForm.control} name="mfaCode" />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setExportOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={exportAudit.isPending}>
                  {exportAudit.isPending ? 'Exporting…' : 'Confirm Export'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
