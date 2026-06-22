import { WorkflowModuleGuard } from '@/components/workflow/workflow-module-guard';

export default function WorkflowsLayout({ children }: { children: React.ReactNode }) {
  return <WorkflowModuleGuard>{children}</WorkflowModuleGuard>;
}
