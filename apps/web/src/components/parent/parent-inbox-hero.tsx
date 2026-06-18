'use client';

import { Bell, CheckCircle2, Inbox, MessageSquare } from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';

interface ParentInboxHeroProps {
  unreadCount: number;
  totalCount: number;
  schoolCount: number;
  isLoading?: boolean;
}

export function ParentInboxHero({
  unreadCount,
  totalCount,
  schoolCount,
  isLoading,
}: ParentInboxHeroProps) {
  const stats = [
    {
      label: 'Unread',
      value: isLoading ? '—' : String(unreadCount),
      hint: unreadCount === 1 ? 'New message' : 'New messages',
      icon: Bell,
      gradient: unreadCount > 0 ? SURFACES.kpi.g4 : SURFACES.kpi.g2,
    },
    {
      label: 'In inbox',
      value: isLoading ? '—' : String(totalCount),
      hint: 'All notifications',
      icon: Inbox,
      gradient: SURFACES.kpi.g3,
    },
    {
      label: 'Schools',
      value: isLoading ? '—' : String(schoolCount),
      hint: schoolCount === 1 ? 'Linked school' : 'Linked schools',
      icon: MessageSquare,
      gradient: SURFACES.kpi.g1,
    },
    {
      label: 'Status',
      value: isLoading ? '—' : unreadCount > 0 ? 'Action needed' : 'All read',
      hint: unreadCount > 0 ? 'Open unread messages' : 'Inbox is clear',
      icon: CheckCircle2,
      gradient: unreadCount > 0 ? SURFACES.kpi.g4 : SURFACES.kpi.g2,
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
      <div
        className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8 lg:pt-10"
        style={{ background: SURFACES.hero }}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-400/10 blur-3xl" aria-hidden />

        <div className="relative min-w-0">
          <p className={ACADEMIC_UI.sectionLabel}>Family portal · communication hub</p>
          <h1 className="text-neutral-900" style={ACADEMIC_PAGE_TITLE_STYLE}>
            Inbox
          </h1>
          <p className={ACADEMIC_UI.pageDesc}>
            Announcements and class messages from every linked school — reply to your class teacher
            when allowed.
          </p>
        </div>

        <div className="relative z-10 -mb-24 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="card overflow-hidden rounded-xl p-4 sm:p-5">
                <div className="mb-3">
                  <span
                    className="flex size-8 items-center justify-center rounded-xl text-white shadow-sm sm:size-9"
                    style={{ background: stat.gradient }}
                  >
                    <Icon aria-hidden className="size-3.5 sm:size-4" />
                  </span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                  {stat.label}
                </p>
                <p
                  className="mt-1 tabular-nums leading-none text-neutral-900"
                  style={{
                    fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] font-medium text-neutral-500">{stat.hint}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
