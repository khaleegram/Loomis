'use client';

import Link from 'next/link';
import { can, type Capability } from '@loomis/core';
import { Button } from '@loomis/ui-web';

import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useAuth } from '@/lib/auth/auth-context';

interface DashboardCard {
  title: string;
  description: string;
  href: string;
  capability: Capability;
}

const DASHBOARD_CARDS: DashboardCard[] = [
  {
    title: 'Staff directory',
    description: 'View and manage school personnel, roles, and assignments.',
    href: '/school/staff',
    capability: 'staff.onboard',
  },
  {
    title: 'Invite staff',
    description: 'Send an invitation to a new teacher or administrator.',
    href: '/school/staff/invite',
    capability: 'staff.onboard',
  },
  {
    title: 'Admissions',
    description: 'Review applications and manage the admissions pipeline.',
    href: '/school/students/admissions',
    capability: 'admissions.manage',
  },
  {
    title: 'Fee configuration',
    description: 'Configure fee structures and billing for the current term.',
    href: '/school/finance',
    capability: 'fee.configure',
  },
  {
    title: 'Log payment',
    description: 'Record an offline cash or bank payment.',
    href: '/school/finance/payments/log',
    capability: 'payment.log',
  },
  {
    title: 'Verify payments',
    description: 'Review and verify payments logged by cashiers.',
    href: '/school/finance/payments/verify',
    capability: 'payment.verify',
  },
  {
    title: 'Gradebook',
    description: 'Enter or review grades for assigned subjects.',
    href: '/school/gradebook',
    capability: 'gradebook.write',
  },
  {
    title: 'Mark attendance',
    description: 'Record daily attendance for your class.',
    href: '/school/attendance',
    capability: 'attendance.mark',
  },
  {
    title: 'Academic sessions',
    description: 'Manage academic years, terms, and census lock.',
    href: '/school/sessions',
    capability: 'academic_year.manage',
  },
  {
    title: 'Exam results',
    description: 'Configure grading schemes and publish results.',
    href: '/school/exams',
    capability: 'result.publish',
  },
  {
    title: 'Security settings',
    description: 'Review active sessions and registered devices.',
    href: '/school/settings/security',
    capability: 'attendance.view', // shown via alwaysInclude below
  },
];

const ALWAYS_VISIBLE_HREFS = new Set(['/school/settings/security']);

export default function SchoolDashboardPage() {
  const { session } = useAuth();
  const role = session?.role;

  const cards = DASHBOARD_CARDS.filter((card) => {
    if (ALWAYS_VISIBLE_HREFS.has(card.href)) return true;
    if (!role) return false;
    return can(role, card.capability);
  });

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome to your school console. Quick links are based on your role permissions."
      />
      <PageBody>
        {cards.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No quick actions are available for your role yet. Use Settings to manage your account
            security.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <li
                key={card.href}
                className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <h2 className="font-medium text-neutral-900">{card.title}</h2>
                <p className="mt-1 text-sm text-neutral-500">{card.description}</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href={card.href}>Open</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}
