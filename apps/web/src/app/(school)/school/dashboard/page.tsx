'use client';

import Link from 'next/link';
import { can, type Capability } from '@loomis/core';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@loomis/ui-web';

import { PageBody, PageHeader } from '@/components/layout/page-header';
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
    title: 'Settings',
    description: 'Appearance, theme, sessions, and registered devices.',
    href: '/school/settings',
    capability: 'attendance.view',
  },
];

const ALWAYS_VISIBLE_HREFS = new Set(['/school/settings']);

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
          <Card>
            <CardHeader>
              <CardTitle>No quick actions yet</CardTitle>
              <CardDescription>
                No modules are available for your role. Use Settings to manage your account security.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild>
                <Link href="/school/settings">Open settings</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <li key={card.href}>
                <Card className="h-full shadow-card">
                  <CardHeader>
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={card.href}>Open</Link>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}
