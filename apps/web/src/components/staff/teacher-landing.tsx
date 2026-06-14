'use client';

import Link from 'next/link';
import { BookOpen, Calendar, ClipboardList } from 'lucide-react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

interface TeacherLandingProps {
  displayName?: string | null;
}

const LINKS = [
  {
    href: '/school/timetable',
    icon: Calendar,
    label: 'My schedule',
    description: 'See your subjects and weekly teaching periods.',
  },
  {
    href: '/school/assignments',
    icon: ClipboardList,
    label: 'Assignments',
    description: 'Create homework and grade submissions.',
  },
  {
    href: '/school/gradebook',
    icon: BookOpen,
    label: 'Gradebook',
    description: 'Enter scores for your assigned subjects.',
  },
] as const;

export function TeacherLanding({ displayName }: TeacherLandingProps) {
  const firstName = displayName?.split(' ')[0];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-brand-100/50 bg-white p-5 sm:p-6">
        <p className={ACADEMIC_UI.sectionLabel}>Teacher</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900">
          {firstName ? `${firstName}'s desk` : 'Teacher desk'}
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-neutral-500">
          Your teaching schedule, assignments, and gradebook. Start with{' '}
          <Link href="/school/timetable" className="font-semibold text-brand-700 hover:underline">
            My schedule
          </Link>{' '}
          to see this term&apos;s periods.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${ACADEMIC_UI.interactiveCard} block p-5`}
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-700">
                <Icon className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-[15px] font-bold text-neutral-900">{item.label}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-500">{item.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
