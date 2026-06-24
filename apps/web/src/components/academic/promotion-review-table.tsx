'use client';

import type { ClassLevelResponse, PromotionRecordResponse } from '@loomis/contracts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@loomis/ui-web';

import { AcademicEmptyState } from '@/components/academic/academic-empty-state';
import {
  classLevelName,
  promotionOutcomeLabel,
  promotionStatusLabel,
} from '@/lib/academic/promotion-labels';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { cn } from '@loomis/ui-web';
import { Users } from 'lucide-react';

const OUTCOME_STYLES: Record<PromotionRecordResponse['outcome'], string> = {
  promoted: 'bg-brand-100 text-brand-800 ring-1 ring-brand-200/60',
  held_back: 'bg-gold-50 text-gold-800 ring-1 ring-gold-200/70',
  graduated: 'bg-accent-purple-50 text-accent-purple-800 ring-1 ring-accent-purple-200/60',
};

const STATUS_STYLES: Record<PromotionRecordResponse['status'], string> = {
  proposed: 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200/60',
  confirmed: 'bg-brand-100 text-brand-800 ring-1 ring-brand-200/60',
};

function StatusPill({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        className,
      )}
    >
      {label}
    </span>
  );
}

interface PromotionReviewTableProps {
  records: PromotionRecordResponse[];
  levels: ClassLevelResponse[];
  studentNames?: Record<string, string>;
  emptyMessage?: string;
}

export function PromotionReviewTable({
  records,
  levels,
  studentNames = {},
  emptyMessage = 'No promotion records staged yet.',
}: PromotionReviewTableProps) {
  if (records.length === 0) {
    return (
      <AcademicEmptyState
        icon={Users}
        title="Nothing to review"
        description={emptyMessage}
      />
    );
  }

  return (
    <div className={ACADEMIC_UI.dataPanel}>
      <Table>
        <TableHeader>
          <TableRow className={`${ACADEMIC_UI.tableHeader} hover:bg-transparent`}>
            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Student
            </TableHead>
            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              From
            </TableHead>
            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              To
            </TableHead>
            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Outcome
            </TableHead>
            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, index) => {
            const studentLabel =
              studentNames[record.studentId] ?? 'Student';

            return (
              <TableRow
                key={record.id}
                className={cn(
                  'transition-colors hover:bg-brand-50/20',
                  index % 2 === 1 && 'bg-neutral-50/30',
                )}
              >
                <TableCell className="font-medium text-neutral-900">{studentLabel}</TableCell>
                <TableCell className="text-[13px] text-neutral-600">
                  {classLevelName(levels, record.fromClassLevelId)}
                </TableCell>
                <TableCell className="text-[13px] text-neutral-600">
                  {record.outcome === 'graduated'
                    ? 'Leaving school'
                    : classLevelName(levels, record.toClassLevelId)}
                </TableCell>
                <TableCell>
                  <StatusPill
                    label={promotionOutcomeLabel(record.outcome)}
                    className={OUTCOME_STYLES[record.outcome]}
                  />
                  {record.heldBackReason ? (
                    <p className="mt-1 max-w-xs text-[11px] text-neutral-400">{record.heldBackReason}</p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <StatusPill
                    label={promotionStatusLabel(record.status)}
                    className={STATUS_STYLES[record.status]}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
