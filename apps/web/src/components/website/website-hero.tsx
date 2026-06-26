'use client';

import type { WebsiteSiteResponse } from '@loomis/contracts';
import { cn } from '@loomis/ui-web';
import { ExternalLink, Globe, Layers, Sparkles } from 'lucide-react';

import { SURFACES } from '@/lib/design/surfaces';
import { schoolPublicSiteUrl } from '@/lib/website/public-site-url';

interface WebsiteHeroProps {
  site: WebsiteSiteResponse;
  canPublish: boolean;
  actions?: React.ReactNode;
}

function statusLabel(status: WebsiteSiteResponse['status']): string {
  switch (status) {
    case 'published':
      return 'Live';
    case 'unpublished':
      return 'Unpublished';
    default:
      return 'Draft';
  }
}

function statusClass(status: WebsiteSiteResponse['status']): string {
  switch (status) {
    case 'published':
      return 'bg-accent-green-100 text-accent-green-800';
    case 'unpublished':
      return 'bg-neutral-100 text-neutral-600';
    default:
      return 'bg-gold-100 text-gold-800';
  }
}

export function WebsiteHero({ site, canPublish, actions }: WebsiteHeroProps) {
  const publicUrl = schoolPublicSiteUrl(site.slug);
  const enabledSections = site.sections.filter((s) => s.enabled).length;

  const stats = [
    {
      label: 'Status',
      value: statusLabel(site.status),
      hint: site.publishedAt ? `Last live ${new Date(site.publishedAt).toLocaleDateString()}` : 'Not published yet',
      icon: Globe,
      gradient: SURFACES.kpi.g1,
    },
    {
      label: 'Sections',
      value: String(enabledSections),
      hint: `${site.sections.length} total blocks`,
      icon: Layers,
      gradient: SURFACES.kpi.g2,
    },
    {
      label: 'Template',
      value: site.templateId.replace('_', ' '),
      hint: 'Change below',
      icon: Sparkles,
      gradient: SURFACES.kpi.g3,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand-100/40 shadow-sm">
      <div
        className="px-4 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-10"
        style={{ background: SURFACES.hero }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
          School website
        </p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
              Your public website
            </h1>
            <p className="mt-2 max-w-xl text-sm text-neutral-600">
              Free professional site on{' '}
              <span className="font-medium text-neutral-800">loomis.digital</span> — edit sections,
              preview, and publish when ready.
            </p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
              statusClass(site.status),
            )}
          >
            {statusLabel(site.status)}
          </span>
          {site.status === 'published' ? (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[36px] items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
            >
              {publicUrl.replace('https://', '')}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : (
            <span className="text-sm text-neutral-500">
              Will be at {publicUrl.replace('https://', '')}
            </span>
          )}
        </div>
      </div>

      <div className="relative z-10 -mt-10 grid grid-cols-1 gap-3 px-4 sm:grid-cols-3 sm:px-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/60 bg-white p-4 shadow-md"
            style={{ background: stat.gradient }}
          >
            <div className="flex items-center gap-2 text-neutral-600">
              <stat.icon className="size-4" aria-hidden />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]">{stat.label}</span>
            </div>
            <p className="mt-2 text-xl font-extrabold capitalize text-neutral-900">{stat.value}</p>
            <p className="mt-1 text-xs text-neutral-500">{stat.hint}</p>
          </div>
        ))}
      </div>

      {!canPublish ? (
        <p className="px-4 pb-4 pt-2 text-xs text-neutral-500 sm:px-8">
          Only the school owner or principal can publish. You can still edit sections.
        </p>
      ) : null}
    </section>
  );
}
