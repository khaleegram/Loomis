import { useQuery } from '@tanstack/react-query';
import type { AuditLogExportRequest, AuditLogExportResponse, AuditLogSearchResponse } from '@loomis/contracts';
import type { StepUpAction } from '@loomis/contracts';
import { useApiClient } from '../context.js';
import { queryKeys } from '../keys.js';
import type { AuditLogFilters } from '../keys.js';
import type { StepUpTokenResult } from '../../mutations/financial-mutation.js';
import { useFinancialMutation } from '../../mutations/useFinancialMutation.js';

const AUDIT_STALE_MS = 15_000;

function buildAuditQuery(filters: AuditLogFilters): string {
  const params = new URLSearchParams();
  if (filters.actorUserId) params.set('actorUserId', filters.actorUserId);
  if (filters.tenantId) params.set('tenantId', filters.tenantId);
  if (filters.action) params.set('action', filters.action);
  if (filters.sensitivity) params.set('sensitivity', filters.sensitivity);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.cursor) params.set('cursor', filters.cursor);
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useAuditLogSearch(filters: AuditLogFilters, enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.platform.auditLog(filters),
    queryFn: () =>
      client.get<AuditLogSearchResponse>(`/platform/audit/events${buildAuditQuery(filters)}`),
    staleTime: AUDIT_STALE_MS,
    enabled,
  });
}

export interface UseExportAuditLogConfig {
  ensureStepUpToken: (action: StepUpAction) => Promise<StepUpTokenResult>;
}

export function useExportAuditLog(config: UseExportAuditLogConfig) {
  const { ensureStepUpToken } = config;
  return useFinancialMutation<AuditLogExportRequest, AuditLogExportResponse>({
    endpoint: '/platform/audit/export',
    action: 'data_export',
    ensureStepUpToken,
    invalidates: [queryKeys.platform.auditLog()],
  });
}
