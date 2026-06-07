'use client';

import { Badge, Card, CardContent, CardHeader, CardTitle } from '@loomis/ui-web';
import { BookOpen, Download } from 'lucide-react';
import { Button } from '@loomis/ui-web';

import { PageBody, PageHeader } from '@/components/parent/parent-shell';
import { useAuth } from '@/lib/auth/auth-context';

const MOCK_RESULTS = [
  { subject: 'Mathematics', score: 78, grade: 'B2', remark: 'Very Good' },
  { subject: 'English Language', score: 82, grade: 'A3', remark: 'Excellent' },
  { subject: 'Basic Science', score: 65, grade: 'C4', remark: 'Good' },
  { subject: 'Social Studies', score: 71, grade: 'B3', remark: 'Very Good' },
  { subject: 'Computer Studies', score: 88, grade: 'A2', remark: 'Excellent' },
  { subject: 'Civic Education', score: 60, grade: 'C5', remark: 'Good' },
  { subject: 'Business Studies', score: 74, grade: 'B2', remark: 'Very Good' },
  { subject: 'French', score: 55, grade: 'C6', remark: 'Fair' },
];

export default function ResultsPage() {
  const { session } = useAuth();
  const isStudent = session?.role === 'student';

  return (
    <>
      <PageHeader
        title={isStudent ? 'My Results' : "Child's Results"}
        description="Term results and report cards — US-PAR-003 / US-STU-001"
        actions={
          <Button variant="outline" size="sm">
            <Download className="mr-1.5 size-4" /> Download Report
          </Button>
        }
      />
      <PageBody>
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Badge variant="gold">First Term 2025/2026</Badge>
          <Badge variant="outline">Published</Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="size-5 text-brand-600" /> Subject Results</CardTitle></CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {MOCK_RESULTS.map((r) => (
                  <div key={r.subject} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{r.subject}</p>
                      <p className="text-xs text-muted-foreground">{r.remark}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{r.score}%</p>
                      <Badge variant={r.score >= 70 ? 'success' : r.score >= 50 ? 'warning' : 'destructive'}>{r.grade}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Term Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Average</p>
                  <p className="mt-1 font-serif text-2xl font-semibold">71.6%</p>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Position</p>
                  <p className="mt-1 font-serif text-2xl font-semibold">8th</p>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Out of</p>
                  <p className="mt-1 font-serif text-2xl font-semibold">32</p>
                </div>
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Attendance</p>
                  <p className="mt-1 font-serif text-2xl font-semibold">87%</p>
                </div>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class Teacher Remark</p>
                <p className="mt-1 text-sm">A consistent student who shows steady improvement. Keep up the good work in Mathematics.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
