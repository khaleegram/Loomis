'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useWorkflowInboxModule } from '@/lib/workflow/use-workflow-inbox-module';

/** Redirects Core / inbox-disabled tenants away from `/school/workflows/*`. */
export function WorkflowModuleGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const inboxEnabled = useWorkflowInboxModule();

  useEffect(() => {
    if (!inboxEnabled) {
      router.replace('/school/dashboard');
    }
  }, [inboxEnabled, router]);

  if (!inboxEnabled) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return children;
}
