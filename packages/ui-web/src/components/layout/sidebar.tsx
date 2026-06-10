'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils.js';

/* ─── Brand ──────────────────────────────────────────────────── */

export interface SidebarBrandProps {
  href?: string;
  title?: string;
  subtitle: string;
  collapsed?: boolean;
  className?: string;
}

export function SidebarBrand({
  href = '#',
  title = 'Loomis',
  subtitle,
  collapsed,
  className,
}: SidebarBrandProps) {
  if (collapsed) {
    return (
      <a
        href={href}
        className={cn(
          'flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm',
          className,
        )}
      >
        L
      </a>
    );
  }

  return (
    <a
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-xl p-1 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        className,
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm">
        L
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold tracking-tight text-neutral-900">{title}</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
          {subtitle}
        </p>
      </div>
    </a>
  );
}

/* ─── Section label ───────────────────────────────────────────── */

export interface SidebarSectionLabelProps {
  children: ReactNode;
  className?: string;
}

export function SidebarSectionLabel({ children, className }: SidebarSectionLabelProps) {
  return (
    <p
      className={cn(
        'mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400',
        className,
      )}
    >
      {children}
    </p>
  );
}

/* ─── Nav item ────────────────────────────────────────────────── */

export interface SidebarNavItemProps {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  collapsed?: boolean;
  badge?: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function SidebarNavItem({
  label,
  icon: Icon,
  active,
  collapsed,
  badge,
  href,
  onClick,
  className,
}: SidebarNavItemProps) {
  const inner = (
    <>
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
          active
            ? 'bg-black text-white'
            : 'text-neutral-400 group-hover:bg-neutral-100 group-hover:text-neutral-700',
        )}
      >
        <Icon aria-hidden className="size-[18px]" />
      </span>
      {!collapsed ? (
        <span className="truncate text-[13.5px]">{label}</span>
      ) : null}
      {!collapsed && badge ? <span className="ml-auto">{badge}</span> : null}
    </>
  );

  const base = cn(
    'group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/40',
    collapsed && 'justify-center px-2',
    active
      ? 'text-neutral-900'
      : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900',
    className,
  );

  if (href) {
    return (
      <a href={href} aria-current={active ? 'page' : undefined} className={base} title={collapsed ? label : undefined}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={base} title={collapsed ? label : undefined}>
      {inner}
    </button>
  );
}

/* ─── Trust card ──────────────────────────────────────────────── */

export interface SidebarTrustCardProps {
  className?: string;
}

export function SidebarTrustCard({ className }: SidebarTrustCardProps) {
  return (
    <div
      className={cn(
        'mx-3 mb-3 rounded-2xl border border-brand-100/80 bg-gradient-to-br from-brand-50 to-indigo-50/60 px-4 py-4',
        className,
      )}
    >
      <div className="mb-2 flex size-8 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-200">
        <ShieldCheck aria-hidden className="size-4" />
      </div>
      <p className="text-[13px] font-semibold leading-snug text-neutral-800">
        Secure. Compliant. Trusted.
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
        Your data is protected with bank-level security.
      </p>
      <a
        href="#"
        className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600 hover:text-brand-700"
      >
        Learn more <span aria-hidden>→</span>
      </a>
    </div>
  );
}

/* ─── User profile ────────────────────────────────────────────── */

export interface SidebarUserProfileProps {
  name: string;
  role: string;
  initials: string;
  online?: boolean;
  collapsed?: boolean;
  /** Optional click handler for the profile area */
  onClick?: () => void;
}

export function SidebarUserProfile({
  name,
  role,
  initials,
  online = true,
  collapsed,
  onClick,
}: SidebarUserProfileProps) {
  if (collapsed) {
    return (
      <div className="flex justify-center py-2">
        <div className="relative">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent-purple-500 text-xs font-bold text-white">
            {initials}
          </span>
          {online ? (
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-accent-green-500" aria-hidden />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-neutral-50"
    >
      <div className="relative shrink-0">
        <span className="flex size-9 items-center justify-center rounded-full bg-accent-purple-500 text-xs font-bold text-white">
          {initials}
        </span>
        {online ? (
          <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-accent-green-500" aria-hidden />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[13px] font-semibold text-neutral-900">{name}</p>
        <p className="truncate text-[11px] text-neutral-500">{role}</p>
      </div>
      {online ? (
        <span className="text-[10px] font-semibold text-accent-green-600">Online</span>
      ) : null}
    </button>
  );
}

/* ─── Frame ───────────────────────────────────────────────────── */

export interface SidebarFrameProps {
  children: ReactNode;
  footer?: ReactNode;
  collapsed?: boolean;
  className?: string;
}

export function SidebarFrame({ children, footer, collapsed, className }: SidebarFrameProps) {
  return (
    <aside
      className={cn(
        'relative flex shrink-0 flex-col border-r border-black/[0.07] bg-white shadow-[2px_0_16px_rgba(0,0,0,0.05)] transition-[width] duration-200',
        collapsed ? 'w-[72px]' : 'w-[240px]',
        className,
      )}
    >
      <div className="flex-1 overflow-y-auto">{children}</div>
      {footer ? (
        <div className="border-t border-neutral-100 px-2 py-3">{footer}</div>
      ) : null}
    </aside>
  );
}
