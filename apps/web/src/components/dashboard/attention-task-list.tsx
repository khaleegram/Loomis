'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@loomis/ui-web';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SEMANTIC } from '@/lib/design/surfaces';
import type { AttentionTask } from '@/lib/leadership/leadership-attention';

interface AttentionTaskListProps {
  tasks: AttentionTask[];
  emptyTitle?: string;
  emptyDescription?: string;
}

const URGENCY_CLASS: Record<AttentionTask['urgency'], string> = {
  attention: SEMANTIC.warning.accent,
  ready: 'border-l-emerald-500',
  normal: 'border-l-neutral-300',
};

export function AttentionTaskList({
  tasks,
  emptyTitle = 'All clear',
  emptyDescription = 'Nothing needs your attention right now.',
}: AttentionTaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className={cn(ACADEMIC_UI.dataPanel, 'p-8 text-center sm:p-10')}>
        <p className="text-[15px] font-semibold text-neutral-800">{emptyTitle}</p>
        <p className="mx-auto mt-2 max-w-md text-[13px] text-neutral-500">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={cn(
            ACADEMIC_UI.dataPanel,
            'border-l-4 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-5',
            URGENCY_CLASS[task.urgency],
          )}
        >
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-neutral-900">{task.title}</p>
            <p className="mt-1 text-[13px] text-neutral-500">{task.description}</p>
          </div>
          <Link
            href={task.href}
            className={cn(
              ACADEMIC_UI.btnPrimary,
              'mt-3 inline-flex shrink-0 items-center gap-1.5 sm:mt-0',
            )}
          >
            {task.cta}
            <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        </div>
      ))}
    </div>
  );
}
