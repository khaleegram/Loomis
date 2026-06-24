'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  CalendarDays,
  GraduationCap,
  Layers,
  Lock,
  Settings2,
  Users,
} from 'lucide-react';

import { BRONZE } from '@/components/dashboard/dashboard-primitives';
import type { AcademicHubMetrics } from '@/lib/academic/academic-metrics';
import { cn } from '@loomis/ui-web';

interface BentoTile {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
  gradient: string;
  stat: string;
  span: 'hero' | 'tall' | 'wide' | 'default';
  accent?: string;
  badge?: string;
  badgeTone?: 'gold' | 'brand' | 'neutral';
}

interface AcademicBentoGridProps {
  metrics: AcademicHubMetrics;
  yearId: string | null;
  termId: string | null;
}

const BADGE_TONE: Record<NonNullable<BentoTile['badgeTone']>, string> = {
  gold: 'bg-gold-100 text-gold-800 ring-1 ring-gold-200/60',
  brand: 'bg-brand-100 text-brand-800 ring-1 ring-brand-200/60',
  neutral: 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200/60',
};

export function AcademicBentoGrid({ metrics, yearId, termId }: AcademicBentoGridProps) {
  const platformFeeHref = '/school/finance/platform-fee';

  const tiles: BentoTile[] = [
    {
      id: 'sessions',
      title: 'Session studio',
      subtitle: 'Years, terms & lifecycle',
      href: '/school/academic/sessions',
      icon: Settings2,
      gradient: BRONZE.gradients.g1,
      stat: metrics.openTermName ?? 'No open term',
      span: 'hero',
    },
    {
      id: 'census',
      title: 'Platform fee',
      subtitle: 'Loomis billing',
      href: platformFeeHref,
      icon: Lock,
      gradient: BRONZE.gradients.g2,
      stat:
        metrics.termStatus === 'census_locked'
          ? 'Recorded'
          : metrics.termStatus === 'open'
            ? 'Auto on date'
            : 'Needs open term',
      span: 'tall',
      accent: undefined,
      badge: undefined,
      badgeTone: 'gold',
    },
    {
      id: 'calendar',
      title: 'Calendar',
      subtitle: 'Key dates',
      href: '/school/academic/calendar',
      icon: CalendarDays,
      gradient: BRONZE.gradients.g3,
      stat: metrics.openTermName ?? '—',
      span: 'default',
    },
    {
      id: 'promotions',
      title: 'Promotions',
      subtitle: 'Year-end review',
      href: '/school/academic/promotions',
      icon: Users,
      gradient: BRONZE.gradients.g4,
      stat:
        metrics.stagedPromotions > 0
          ? `${metrics.stagedPromotions} pending`
          : `${metrics.confirmedPromotions} confirmed`,
      span: 'default',
      badge: metrics.stagedPromotions > 0 ? `${metrics.stagedPromotions} to review` : undefined,
      badgeTone: 'brand',
    },
    {
      id: 'structure',
      title: 'Class structure',
      subtitle: 'Levels & progression',
      href: '/school/academic/structure',
      icon: Layers,
      gradient: BRONZE.gradients.g4,
      stat: 'Levels & arms',
      span: 'default',
    },
    {
      id: 'graduation',
      title: 'Graduation',
      subtitle: 'Terminal cohort',
      href: '/school/academic/graduation',
      icon: GraduationCap,
      gradient: BRONZE.gradients.card,
      stat: `${metrics.graduatedCount} records`,
      span: 'wide',
    },
  ];

  return (
    <div className="grid auto-rows-[minmax(132px,auto)] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile, index) => {
        const Icon = tile.icon;
        return (
          <Link
            key={tile.id}
            href={tile.href}
            style={{ animationDelay: `${index * 40}ms` }}
            className={cn(
              'card group relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg',
              tile.span === 'hero' && 'sm:col-span-2 sm:row-span-2',
              tile.span === 'tall' && 'sm:row-span-2',
              tile.span === 'wide' && 'sm:col-span-2',
              tile.accent,
            )}
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full opacity-[0.1] blur-xl transition-opacity duration-300 group-hover:opacity-20"
              style={{ background: tile.gradient }}
            />

            {/* Hover accent bar */}
            <div
              className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
              style={{ background: tile.gradient }}
            />

            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between gap-2">
                <span
                  className="flex size-10 items-center justify-center rounded-xl text-white shadow-sm transition-transform duration-200 group-hover:scale-105"
                  style={{ background: tile.gradient }}
                >
                  <Icon aria-hidden className="size-[18px]" />
                </span>
                <div className="flex flex-col items-end gap-1.5">
                  {tile.badge && tile.badgeTone ? (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                        BADGE_TONE[tile.badgeTone],
                        tile.id === 'census' && metrics.termStatus === 'open' && 'animate-pulse',
                      )}
                    >
                      {tile.badge}
                    </span>
                  ) : null}
                  <ArrowUpRight
                    aria-hidden
                    className="size-4 text-neutral-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-700"
                  />
                </div>
              </div>

              <div className="mt-auto pt-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                  {tile.subtitle}
                </p>
                <p
                  className="mt-1 text-neutral-900 transition-colors group-hover:text-brand-900"
                  style={{
                    fontSize: tile.span === 'hero' ? '1.375rem' : '1.0625rem',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {tile.title}
                </p>
                {tile.span === 'hero' ? (
                  <p className="mt-2 max-w-xs text-[12px] leading-relaxed text-neutral-500">
                    Configure academic years, open terms, and close when the term ends.
                  </p>
                ) : null}
                <p className="mt-2.5 text-[11px] font-semibold text-brand-700/90">{tile.stat}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
