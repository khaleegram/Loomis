'use client';

import Link from 'next/link';
import { cn } from '@loomis/ui-web';
import type { LucideIcon } from 'lucide-react';

import { AttentionStrip } from '@/components/dashboard/attention-strip';
import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SEMANTIC, SURFACES } from '@/lib/design/surfaces';
import type { SchoolTermPulse } from '@/lib/leadership/leadership-attention';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export interface SchoolOwnerHeroProps {
  variant: 'core' | 'advanced';
  displayName?: string | null;
  schoolName: string;
  schoolTermPulse: SchoolTermPulse;
  actionCount: number;
  stripItems: Array<{
    label: string;
    value: string;
    hint: string;
    tone?: 'ok' | 'warn' | 'neutral';
    icon: LucideIcon;
    gradient: string;
  }>;
  workflowInboxHref?: string;
}

export function SchoolOwnerHero({
  variant,
  displayName,
  schoolName,
  schoolTermPulse,
  actionCount,
  stripItems,
  workflowInboxHref,
}: SchoolOwnerHeroProps) {
  const firstName = displayName?.split(' ')[0];

  return (
    <div className="hero-panel rounded-2xl">
      <div
        className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8"
        style={{ background: SURFACES.hero }}
      >
        <div
          className="pointer-events-none absolute -right-8 top-6 size-44 rounded-full bg-gold-300/20 blur-3xl dark:bg-primary/10"
          aria-hidden
        />
        <p className={ACADEMIC_UI.sectionLabel}>
          {schoolName} · School Owner{variant === 'advanced' ? ' · Advanced' : ''}
        </p>
        <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
          {firstName ? `${greeting()}, ${firstName}` : schoolTermPulse.headline}
        </h1>
        <p className={ACADEMIC_UI.pageDesc}>{schoolTermPulse.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold',
              actionCount > 0
                ? 'border-gold-300/70 bg-gold-50/90 text-gold-900'
                : 'border-emerald-200/80 bg-emerald-50/90 text-emerald-800',
            )}
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                actionCount > 0 ? 'bg-gold-500' : 'bg-emerald-500',
              )}
            />
            {actionCount > 0
              ? `${actionCount} item${actionCount === 1 ? '' : 's'} need attention`
              : 'School is running smoothly'}
          </span>
          <span className="hero-pill">{schoolTermPulse.termLabel}</span>
          {workflowInboxHref ? (
            <Link
              href={workflowInboxHref}
              className={`inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-medium ${SEMANTIC.cta.primary}`}
            >
              Open approvals
            </Link>
          ) : null}
        </div>

        <AttentionStrip items={stripItems} />
      </div>
    </div>
  );
}
