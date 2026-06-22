import { z } from 'zod';

export const auditSensitivity = z.enum([
  'standard',
  'financial',
  'pii',
  'child_pii',
  'privileged',
  'security',
]);
export type AuditSensitivity = z.infer<typeof auditSensitivity>;

export const auditResult = z.enum(['success', 'denied', 'failed']);
export type AuditResult = z.infer<typeof auditResult>;

export const auditLogEntryResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().nullable(),
  actorUserId: z.string().uuid().nullable(),
  actorType: z.string(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().uuid().nullable(),
  sensitivity: auditSensitivity,
  result: auditResult,
  ipAddress: z.string().nullable(),
  requestId: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type AuditLogEntryResponse = z.infer<typeof auditLogEntryResponse>;

export const auditLogSearchFilters = z.object({
  actorUserId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  action: z.string().optional(),
  sensitivity: auditSensitivity.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(200).optional(),
});
export type AuditLogSearchFilters = z.infer<typeof auditLogSearchFilters>;

export const auditLogSearchResponse = z.object({
  entries: z.array(auditLogEntryResponse),
  nextCursor: z.string().uuid().nullable(),
  totalApprox: z.number().int().nullable(),
  sensitiveQuery: z.boolean(),
});
export type AuditLogSearchResponse = z.infer<typeof auditLogSearchResponse>;

export const auditLogExportRequest = z.object({
  filters: auditLogSearchFilters,
  format: z.enum(['csv', 'json']).default('csv'),
  reason: z.string().min(10).max(500),
});
export type AuditLogExportRequest = z.infer<typeof auditLogExportRequest>;

export const auditLogExportResponse = z.object({
  exportId: z.string().uuid(),
  recordCount: z.number().int(),
  format: z.enum(['csv', 'json']),
  downloadUrl: z.string().url().nullable(),
  message: z.string(),
  /** Inline export payload when synchronous delivery is used (tenant-scoped export). */
  content: z.string().nullable().optional(),
});
export type AuditLogExportResponse = z.infer<typeof auditLogExportResponse>;
