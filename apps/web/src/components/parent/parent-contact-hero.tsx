'use client';

import { Mail, Shield, Smartphone, User } from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';

interface ParentContactHeroProps {
  displayName: string | null;
  email: string | null;
  sessionCount: number;
  isLoading?: boolean;
}

export function ParentContactHero({
  displayName,
  email,
  sessionCount,
  isLoading,
}: ParentContactHeroProps) {
  const stats = [
    {
      label: 'Account',
      value: isLoading ? '—' : (displayName ?? 'Parent'),
      hint: 'Display name',
      icon: User,
      gradient: SURFACES.kpi.g1,
    },
    {
      label: 'Email',
      value: isLoading ? '—' : (email ? 'On file' : '—'),
      hint: 'Primary contact',
      icon: Mail,
      gradient: SURFACES.kpi.g2,
    },
    {
      label: 'Sessions',
      value: isLoading ? '—' : String(sessionCount),
      hint: 'Active devices',
      icon: Shield,
      gradient: SURFACES.kpi.g3,
    },
    {
      label: 'Phone',
      value: 'OTP',
      hint: 'Verified separately',
      icon: Smartphone,
      gradient: SURFACES.kpi.g4,
    },
  ];

  return (
    <div className="hero-panel rounded-2xl">
      <div
        className="relative px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8 lg:pt-10"
        style={{ background: SURFACES.hero }}
      >
        <div className="relative min-w-0">
          <p className={ACADEMIC_UI.sectionLabel}>Family portal · account</p>
          <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
            Contact & privacy
          </h1>
          <p className={ACADEMIC_UI.pageDesc}>
            Update your contact details and manage notification preferences — US-PAR-005.
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
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">{stat.label}</p>
                <p
                  className="mt-1 truncate leading-none text-neutral-900"
                  style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', fontWeight: 800, letterSpacing: '-0.02em' }}
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
