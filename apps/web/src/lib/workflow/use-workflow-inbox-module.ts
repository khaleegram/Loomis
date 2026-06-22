'use client';

import { workflowsInboxEnabled } from '@loomis/core';

import { useTenantExperience } from '@/lib/tenant/use-tenant-experience';

/** True when Advanced+ tenant has the Workflow Inbox module enabled (Sprint 9). */
export function useWorkflowInboxModule(): boolean {
  const { experienceTier, flags, isLoading } = useTenantExperience();
  if (isLoading) return false;
  return workflowsInboxEnabled(experienceTier, flags);
}
