'use client';

import { BookOpen, GraduationCap, Shield, Users } from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';

interface TeachingAssignmentsHeroProps {
  termLabel: string | null;
  classCount: number;
  classTeachersSet: number;
  subjectsAssigned: number;
  subjectSlots: number;
  isLoading?: boolean;
}

export function TeachingAssignmentsHero({
  termLabel,
  classCount,
  classTeachersSet,
  subjectsAssigned,
  subjectSlots,
  isLoading,
}: TeachingAssignmentsHeroProps) {
  const coverage =
    subjectSlots > 0 ? Math.round((subjectsAssigned / subjectSlots) * 100) : 0;

  const stats = [
    {
      label: 'Classes',
      value: isLoading ? '—' : String(classCount),
      hint: termLabel ?? 'Current term',
      icon: Users,
      gradient: SURFACES.kpi.g1,
    },
    {
      label: 'Class teachers',
      value: isLoading ? '—' : `${classTeachersSet}/${classCount}`,
      hint: 'One per class arm',
      icon: Shield,
      gradient: SURFACES.kpi.g2,
    },
    {
      label: 'Subject slots filled',
      value: isLoading ? '—' : `${subjectsAssigned}/${subjectSlots}`,
      hint: `${coverage}% coverage`,
      icon: BookOpen,
      gradient: SURFACES.kpi.g3,
    },
    {
      label: 'Teaching roster',
      value: isLoading ? '—' : termLabel ? 'Active' : 'No term',
      hint: 'Subjects + class teachers',
      icon: GraduationCap,
      gradient: SURFACES.kpi.g4,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl" style={{ background: SURFACES.hero }}>
      <div className="relative px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
        <p className={ACADEMIC_UI.sectionLabel}>Teaching</p>
        <h1 className={ACADEMIC_UI.pageTitle} style={ACADEMIC_PAGE_TITLE_STYLE}>
          Who teaches what
        </h1>
        <p className="mt-1 max-w-xl text-[13px] text-neutral-500">
          Assign subjects to teachers and pick a class teacher for each arm. Teachers only see
          gradebook and timetable slots they are assigned to.
        </p>
      </div>

      <div className="relative -mt-10 grid grid-cols-2 gap-3 px-4 pb-5 sm:grid-cols-4 sm:px-6 lg:px-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/60 bg-white/95 p-4 shadow-sm backdrop-blur-sm"
            >
              <div
                className="mb-3 flex size-9 items-center justify-center rounded-xl text-neutral-800"
                style={{ background: stat.gradient }}
              >
                <Icon aria-hidden className="size-4" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                {stat.label}
              </p>
              <p className="mt-1 text-xl font-extrabold tabular-nums text-neutral-900">{stat.value}</p>
              <p className="mt-0.5 text-[11px] text-neutral-400">{stat.hint}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
