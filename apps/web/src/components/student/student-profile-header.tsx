import type { StudentResponse } from '@loomis/contracts';
import type { ComponentProps, ReactNode } from 'react';
import { Badge, Button } from '@loomis/ui-web';

import { StudentStatusBadge } from '@/components/student/student-status-badge';
import {
  computeAgeYears,
  formatCalendarDate,
  genderLabel,
  studentDisplayName,
  studentInitials,
} from '@/lib/student/student-labels';

interface StudentProfileHeaderProps {
  student: StudentResponse;
  currentClassLabel?: string | null;
  actions?: ReactNode;
}

export function StudentProfileHeader({
  student,
  currentClassLabel,
  actions,
}: StudentProfileHeaderProps) {
  const name = studentDisplayName(student.firstName, student.lastName);
  const age = computeAgeYears(student.dateOfBirth);

  return (
    <div className="overflow-hidden rounded-lg border border-border shadow-card">
      <div className="border-b border-gold/20 bg-gold-50 px-6 py-5 dark:border-gold/30 dark:bg-forest-800/80">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-md border border-gold/30 bg-card font-serif text-lg font-semibold text-brand-600 dark:text-mint-400"
              aria-hidden
            >
              {studentInitials(student.firstName, student.lastName)}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gold-700 dark:text-gold-300">
                File number
              </p>
              <p className="font-mono text-sm font-semibold text-gold-800 dark:text-gold-200">
                {student.admissionNo}
              </p>
              <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-foreground">
                {name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StudentStatusBadge status={student.status} />
                {currentClassLabel ? (
                  <Badge variant="outline">{currentClassLabel}</Badge>
                ) : null}
              </div>
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
      <dl className="grid gap-4 bg-card px-6 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Date of birth</dt>
          <dd className="mt-0.5 text-sm font-medium text-foreground">
            {formatCalendarDate(student.dateOfBirth)}
            <span className="ml-1 text-muted-foreground">({age} yrs)</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Gender</dt>
          <dd className="mt-0.5 text-sm font-medium text-foreground">
            {genderLabel(student.gender)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Identity attestation</dt>
          <dd className="mt-0.5 text-sm font-medium text-foreground">
            {student.identityAttestationType ? 'On file' : 'Not recorded'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Registered</dt>
          <dd className="mt-0.5 text-sm font-medium text-foreground">
            {formatCalendarDate(student.createdAt.slice(0, 10))}
          </dd>
        </div>
      </dl>
    </div>
  );
}

interface StudentProfileHeaderSkeletonProps {
  actions?: ReactNode;
}

export function StudentProfileHeaderSkeleton({ actions }: StudentProfileHeaderSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="h-32 animate-pulse bg-gold-50 dark:bg-forest-800" />
      <div className="grid gap-4 px-6 py-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-muted" />
        ))}
      </div>
      {actions}
    </div>
  );
}

export function StudentProfileActionButton(props: ComponentProps<typeof Button>) {
  return <Button size="sm" {...props} />;
}
