'use client';

import type { StudentResponse } from '@loomis/contracts';
import {
  BookOpen,
  Calendar,
  GraduationCap,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react';

import { SEMANTIC } from '@/lib/design/surfaces';
import { formatCalendarDate, studentDisplayName } from '@/lib/student/student-labels';

interface TimelineEvent {
  id: string;
  icon: typeof Calendar;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  date: Date;
}

interface StudentTimelineProps {
  student: StudentResponse;
}

export function StudentTimeline({ student }: StudentTimelineProps) {
  const events: TimelineEvent[] = [];

  // Admission created
  if (student.createdAt) {
    events.push({
      id: 'admitted',
      icon: UserPlus,
      iconBg: 'bg-gold-50',
      iconColor: 'text-gold-600',
      title: 'Student admitted',
      description: `File #${student.admissionNo} · ${studentDisplayName(student.firstName, student.lastName)} added to the registry`,
      date: new Date(student.createdAt),
    });
  }

  // Enrollment placeholder (real enrollment data comes from profile)
  if (student.status === 'enrolled') {
    events.push({
      id: 'enrolled',
      icon: BookOpen,
      iconBg: 'bg-brand-50',
      iconColor: 'text-brand-600',
      title: 'Currently enrolled',
      description: 'Active in the current academic term',
      date: new Date(student.updatedAt),
    });
  }

  // Identity attestation
  if (student.identityAttestationType && student.identityAttestedAt) {
    events.push({
      id: 'attestation',
      icon: Shield,
      iconBg: SEMANTIC.success.iconBg,
      iconColor: SEMANTIC.success.iconColor,
      title: 'Identity attested',
      description: `${student.identityAttestationType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} on file`,
      date: new Date(student.identityAttestedAt),
    });
  }

  // Graduation
  if (student.status === 'graduated') {
    events.push({
      id: 'graduated',
      icon: GraduationCap,
      iconBg: 'bg-purple-50',
      iconColor: 'text-accent-purple-600',
      title: 'Graduated',
      description: 'Student has completed their programme',
      date: new Date(student.updatedAt),
    });
  }

  // Transferred out
  if (student.status === 'transferred_out') {
    events.push({
      id: 'transferred',
      icon: Users,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      title: 'Transferred out',
      description: 'Student has moved to another school',
      date: new Date(student.updatedAt),
    });
  }

  const sorted = events.sort((a, b) => b.date.getTime() - a.date.getTime());

  if (sorted.length === 0) return null;

  return (
    <div className="card rounded-2xl p-6">
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
