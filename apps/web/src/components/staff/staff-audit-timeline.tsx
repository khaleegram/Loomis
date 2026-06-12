'use client';

import type { StaffDetailResponse } from '@loomis/contracts';
import { Clock, Mail, Shield, UserCheck, UserX, BookOpen, Users } from 'lucide-react';
import { formatRoleLabel } from '@/components/school/school-nav-config';
import { SEMANTIC } from '@/lib/design/surfaces';

interface AuditEvent {
  id: string;
  icon: typeof Clock;
  iconBg: string;
  iconColor: string;
  date: Date;
  title: string;
  description: string;
  type: 'created' | 'role' | 'assignment' | 'deactivation' | 'reactivation' | 'invitation';
}

interface StaffAuditTimelineProps {
  staff: StaffDetailResponse;
  className?: string;
}

export function StaffAuditTimeline({ staff, className }: StaffAuditTimelineProps) {
  const events: AuditEvent[] = [];

  // Invitation sent (always present at creation)
  if (staff.createdAt) {
    events.push({
      id: 'created',
      icon: Mail,
      iconBg: 'bg-brand-50',
      iconColor: 'text-brand-600',
      date: new Date(staff.createdAt),
      title: 'Staff profile created',
      description: `Invitation sent to ${staff.email}`,
      type: 'created',
    });
  }

  // Invitation accepted
  if (staff.joinedAt) {
    events.push({
      id: 'joined',
      icon: UserCheck,
      iconBg: SEMANTIC.success.iconBg,
      iconColor: SEMANTIC.success.iconColor,
      date: new Date(staff.joinedAt),
      title: 'Invitation accepted',
      description: `${staff.fullName} completed account setup and joined as ${formatRoleLabel(staff.primaryRole)}`,
      type: 'invitation',
    });
  }

  // Current role
  if (staff.primaryRole) {
    events.push({
      id: 'role-current',
      icon: Shield,
      iconBg: 'bg-gold-50',
      iconColor: 'text-gold-600',
      date: staff.updatedAt ? new Date(staff.updatedAt) : new Date(),
      title: 'Current role assignment',
      description: `${formatRoleLabel(staff.primaryRole)}${staff.roleExtensions.length > 0 ? ' + ' + staff.roleExtensions.map((r) => formatRoleLabel(r)).join(', ') : ''}`,
      type: 'role',
    });
  }

  // Subject assignments (show latest)
  const subjectAssignments = staff.subjectAssignments.filter((a) => a.active);
  if (subjectAssignments.length > 0) {
    events.push({
      id: 'assignments',
      icon: BookOpen,
      iconBg: 'bg-accent-purple-50',
      iconColor: 'text-accent-purple-600',
      date: new Date(),
      title: 'Active subject assignments',
      description: `${subjectAssignments.length} subject${subjectAssignments.length > 1 ? 's' : ''} assigned across class arms`,
      type: 'assignment',
    });
  }

  // Class teacher assignments
  const classAssignments = staff.classTeacherAssignments.filter((a) => a.active);
  if (classAssignments.length > 0) {
    events.push({
      id: 'class-teacher',
      icon: Users,
      iconBg: 'bg-accent-teal-50',
      iconColor: 'text-accent-teal-600',
      date: new Date(),
      title: 'Class teacher assignments',
      description: `${classAssignments.length} class${classAssignments.length > 1 ? 'es' : ''} designated`,
      type: 'assignment',
    });
  }

  // Deactivation
  if (staff.status === 'deactivated' && staff.deactivatedAt) {
    events.push({
      id: 'deactivated',
      icon: UserX,
      iconBg: SEMANTIC.danger.iconBg,
      iconColor: SEMANTIC.danger.iconColor,
      date: new Date(staff.deactivatedAt),
      title: 'Account deactivated',
      description: 'All sessions revoked. Role assignments and subject assignments were deactivated.',
      type: 'deactivation',
    });
  }

  // Sort events by date, newest first
  const sorted = events.sort((a, b) => b.date.getTime() - a.date.getTime());

  if (sorted.length === 0) return null;

  return (
    <div className={`card rounded-2xl p-6 ${className ?? ''}`}>
      <h3 className="mb-4 text-[13px] font-bold text-neutral-800">Activity Timeline</h3>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-neutral-100" />

        <div className="space-y-5">
          {sorted.map((event, i) => {
            const Icon = event.icon;
            const formattedDate = event.date.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            const isToday = new Date().toDateString() === event.date.toDateString();
            const dateLabel = isToday ? 'Today' : formattedDate;

            return (
              <div key={event.id} className="relative flex items-start gap-4">
                {/* Timeline dot */}
                <div className="relative z-10 flex size-10 shrink-0 items-center justify-center">
                  <span className={`flex size-9 items-center justify-center rounded-xl ${event.iconBg} ring-4 ring-white`}>
                    <Icon aria-hidden className={`size-4 ${event.iconColor}`} />
                  </span>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                      {dateLabel}
                    </p>
                    {i === 0 ? (
                      <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[9px] font-semibold text-brand-700">
                        Latest
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[13px] font-semibold text-neutral-800">{event.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-neutral-500">{event.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
