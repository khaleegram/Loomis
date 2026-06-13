'use client';

import { useMemo } from 'react';
import type { StaffDirectoryEntryResponse } from '@loomis/contracts';
import { AlertTriangle, Clock, GraduationCap, Shield, TrendingUp } from 'lucide-react';

import { formatRoleLabel } from '@/components/school/school-nav-config';
import { SEMANTIC } from '@/lib/design/surfaces';
import { computeVacantSingletonRoles } from '@/lib/staff/staff-labels';

interface StaffInsightsProps {
  staff: StaffDirectoryEntryResponse[];
}

interface InsightCard {
  id: string;
  icon: typeof AlertTriangle;
  iconBg: string;
  title: string;
  description: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
}

export function StaffInsights({ staff }: StaffInsightsProps) {
  const insights = useMemo<InsightCard[]>(() => {
    const cards: InsightCard[] = [];

    const vacantSingletonRoles = computeVacantSingletonRoles(staff);
    if (vacantSingletonRoles.length > 0) {
      const labels = vacantSingletonRoles.map((role) => formatRoleLabel(role)).join(', ');
      cards.push({
        id: 'vacant-singleton-roles',
        icon: AlertTriangle,
        iconBg: SEMANTIC.danger.icon,
        title: `Unassigned critical ${vacantSingletonRoles.length === 1 ? 'role' : 'roles'}`,
        description: `No active ${labels}. Assign staff or invite someone — this flag stays until coverage is restored.`,
        action: 'Assign roles',
        priority: 'high',
      });
    }

    // Insight: Invitations expiring within 24 hours
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const expiringSoon = staff.filter(
      (m) =>
        m.status === 'pending' &&
        m.pendingInvitation &&
        !m.pendingInvitation.isExpired &&
        new Date(m.pendingInvitation.expiresAt).getTime() - now < twentyFourHours,
    );

    if (expiringSoon.length > 0) {
      cards.push({
        id: 'expiring-invites',
        icon: Clock,
        iconBg: SEMANTIC.warning.icon,
        title: `${expiringSoon.length} invitation${expiringSoon.length > 1 ? 's' : ''} expiring soon`,
        description: `${expiringSoon.map((m) => m.fullName).join(', ')} ${expiringSoon.length === 1 ? 'has' : 'have'} not accepted. ${expiringSoon.length === 1 ? 'This' : 'These'} invitation${expiringSoon.length === 1 ? '' : 's'} will expire within 24 hours.`,
        action: 'Resend invitations',
        priority: 'high',
      });
    }

    // Insight: Expired invitations
    const expiredInvites = staff.filter(
      (m) => m.status === 'pending' && m.pendingInvitation?.isExpired,
    );
    if (expiredInvites.length > 0) {
      cards.push({
        id: 'expired-invites',
        icon: AlertTriangle,
        iconBg: SEMANTIC.danger.icon,
        title: `${expiredInvites.length} expired invitation${expiredInvites.length > 1 ? 's' : ''}`,
        description: `${expiredInvites.map((m) => m.fullName).join(', ')} never accepted. Resend or remove ${expiredInvites.length === 1 ? 'this' : 'these'} invitation${expiredInvites.length === 1 ? '' : 's'}.`,
        action: 'Review invitations',
        priority: 'high',
      });
    }

    // Insight: Deactivated staff count
    const deactivated = staff.filter((m) => m.status === 'deactivated');
    if (deactivated.length > 0) {
      cards.push({
        id: 'deactivated-staff',
        icon: Shield,
        iconBg: 'bg-neutral-100 text-neutral-600',
        title: `${deactivated.length} deactivated staff member${deactivated.length > 1 ? 's' : ''}`,
        description: 'Deactivated accounts retain historical records. Consider archiving or reactivating if needed.',
        action: 'View deactivated',
        priority: 'low',
      });
    }

    // Insight: Active workforce health
    const active = staff.filter((m) => m.status === 'active');
    const total = staff.length;
    if (total > 0) {
      const activePct = Math.round((active.length / total) * 100);
      const healthMessage =
        activePct >= 80
          ? 'Your workforce is healthy with strong active participation.'
          : activePct >= 50
            ? 'Consider following up on pending and deactivated accounts.'
            : 'A significant portion of your staff is not active. Review pending invitations.';

      cards.push({
        id: 'workforce-health',
        icon: TrendingUp,
        iconBg: 'bg-brand-100 text-brand-700',
        title: `${activePct}% workforce activation`,
        description: healthMessage,
        priority: activePct >= 80 ? 'low' : activePct >= 50 ? 'medium' : 'high',
      });
    }

    // Insight: Staff with teacher role (potential teaching coverage)
    const teachers = staff.filter(
      (m) => m.primaryRole === 'teacher' || m.roleExtensions.includes('teacher'),
    );
    if (teachers.length > 0) {
      cards.push({
        id: 'teaching-coverage',
        icon: GraduationCap,
        iconBg: 'bg-accent-purple-100 text-accent-purple-600',
        title: `${teachers.length} teaching staff`,
        description: `${teachers.length === 1 ? 'One teacher covers' : `${teachers.length} teachers cover`} academic assignments. Review subject allocation to ensure balanced workloads.`,
        priority: 'low',
      });
    }

    return cards.slice(0, 4);
  }, [staff]);

  // Priority border color
  const priorityBorder = (p: InsightCard['priority']) => {
    switch (p) {
      case 'high':
        return SEMANTIC.danger.accent;
      case 'medium':
        return SEMANTIC.warning.accent;
      case 'low':
        return 'border-l-brand-200';
    }
  };

  if (insights.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-400">
          Staff Insights
        </h2>
        <span className="h-px flex-1 bg-neutral-100" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
        {insights.map((insight) => {
          const Icon = insight.icon;
          return (
            <div
              key={insight.id}
              className={`card group relative overflow-hidden rounded-2xl border-l-4 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${priorityBorder(insight.priority)}`}
            >
              {/* Subtle background gradient */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-50/30 to-transparent" />

              <div className="relative z-10">
                <div className="mb-3 flex items-start gap-3">
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${insight.iconBg}`}>
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[13px] font-bold leading-snug text-neutral-900">
                      {insight.title}
                    </h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
                      {insight.description}
                    </p>
                  </div>
                </div>
                {insight.action ? (
                  <div className="mt-2 ml-11">
                    <span className="text-[11px] font-semibold text-brand-600 transition-colors group-hover:text-brand-700">
                      {insight.action} →
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
