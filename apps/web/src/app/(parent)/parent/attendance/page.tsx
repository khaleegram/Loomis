'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@loomis/ui-web';
import { Calendar, Check, Clock, X } from 'lucide-react';

import { PageBody, PageHeader } from '@/components/parent/parent-shell';
import { useAuth } from '@/lib/auth/auth-context';

const MOCK_ATTENDANCE = [
  { date: '2026-06-01', status: 'present' },
  { date: '2026-06-02', status: 'present' },
  { date: '2026-06-03', status: 'late' },
  { date: '2026-06-04', status: 'present' },
  { date: '2026-06-05', status: 'absent' },
  { date: '2026-06-08', status: 'present' },
  { date: '2026-06-09', status: 'present' },
];

const STATUS_ICONS = {
  present: { icon: Check, className: 'text-success' },
  absent: { icon: X, className: 'text-destructive' },
  late: { icon: Clock, className: 'text-warning' },
};

export default function AttendancePage() {
  const { session } = useAuth();
  const isStudent = session?.role === 'student';

  return (
    <>
      <PageHeader
        title={isStudent ? 'My Attendance' : "Child's Attendance"}
        description="Daily attendance record for the current term — US-PAR-002"
      />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Present</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-serif font-semibold text-success">5 days</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Absent</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-serif font-semibold text-destructive">1 day</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Late</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-serif font-semibold text-warning">1 day</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Daily Record</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {MOCK_ATTENDANCE.map((day) => {
                const status = STATUS_ICONS[day.status as keyof typeof STATUS_ICONS];
                const Icon = status.icon;
                return (
                  <div key={day.date} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="size-4 text-muted-foreground" />
                      <span className="text-sm">{new Date(day.date).toLocaleDateString('en-NG', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium capitalize ${status.className}`}>
                      <Icon className="size-4" />
                      {day.status}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
