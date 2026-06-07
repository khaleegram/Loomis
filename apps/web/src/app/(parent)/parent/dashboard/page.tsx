'use client';

import { useParentDashboard } from '@loomis/api-client';
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@loomis/ui-web';
import { GraduationCap, Calendar, DollarSign, BookOpen } from 'lucide-react';
import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/parent/parent-shell';
import { useAuth } from '@/lib/auth/auth-context';

export default function ParentDashboardPage() {
  const { session } = useAuth();
  const isStudent = session?.role === 'student';
  const { data, isLoading } = useParentDashboard();

  const cards = (data as any)?.cards ?? [];

  return (
    <>
      <PageHeader
        title={isStudent ? 'My Dashboard' : 'Family Dashboard'}
        description={isStudent ? 'Your academic overview at a glance.' : 'All your linked children across all schools.'}
      />
      <PageBody>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <GraduationCap className="mb-3 size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No linked children yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">Ask your school administrator to link your account.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card: any) => (
              <Card key={card.studentId} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GraduationCap className="size-5 text-brand-600" />
                    {card.studentName ?? 'Student'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">School</span>
                    <span className="font-medium font-mono text-xs">{card.schoolName ?? card.tenantId?.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Class</span>
                    <span className="font-medium">{card.currentClass ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attendance</span>
                    <span className="font-medium">{card.attendanceRate != null ? `${(card.attendanceRate * 100).toFixed(0)}%` : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Latest Result</span>
                    <span className="font-medium">{card.latestResultSummary ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Outstanding Fees</span>
                    <span className="font-medium text-destructive">{card.outstandingFeeMinor ? `₦${(card.outstandingFeeMinor / 100).toLocaleString()}` : 'None'}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Link href="/parent/attendance" className="flex-1 rounded-md bg-muted px-3 py-1.5 text-center text-xs font-medium hover:bg-muted/80 transition-colors">
                      <Calendar className="inline size-3 mr-1" /> Attendance
                    </Link>
                    <Link href="/parent/results" className="flex-1 rounded-md bg-muted px-3 py-1.5 text-center text-xs font-medium hover:bg-muted/80 transition-colors">
                      <BookOpen className="inline size-3 mr-1" /> Results
                    </Link>
                    {!isStudent ? (
                      <Link href="/parent/fees" className="flex-1 rounded-md bg-muted px-3 py-1.5 text-center text-xs font-medium hover:bg-muted/80 transition-colors">
                        <DollarSign className="inline size-3 mr-1" /> Fees
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
