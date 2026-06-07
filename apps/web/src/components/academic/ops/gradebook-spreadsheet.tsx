'use client';

import type { ExamConfigResponse, GradebookEntryResponse, StudentResponse } from '@loomis/contracts';
import {
  Badge,
  Button,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@loomis/ui-web';
import { useCallback, useMemo, useState } from 'react';

import { GradeEntryStatusBadge } from '@/components/academic/ops/workflow-status-badges';
import { formatSubjectLabel } from '@/lib/academic/ops-labels';
import { studentDisplayName } from '@/lib/student/student-labels';

export type GradebookViewMode = 'entry' | 'review';

export interface GradebookRow {
  student: StudentResponse;
  entry: GradebookEntryResponse | null;
  examConfigId: string;
}

interface GradebookSpreadsheetProps {
  mode: GradebookViewMode;
  onModeChange: (mode: GradebookViewMode) => void;
  readOnly?: boolean;
  rows: GradebookRow[];
  examConfig: ExamConfigResponse | null;
  caWeight: number;
  examWeight: number;
  isLoading?: boolean;
  onSaveCell: (
    studentId: string,
    examConfigId: string,
    ca: number,
    exam: number,
  ) => Promise<void>;
  onRequestCorrection?: (entry: GradebookEntryResponse) => void;
}

function computeWeightedTotal(ca: number, exam: number, caWeight: number, examWeight: number): number {
  return Math.round((ca * caWeight) / 100 + (exam * examWeight) / 100);
}

export function GradebookSpreadsheetSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-[420px] w-full" />
    </div>
  );
}

export function GradebookSpreadsheet({
  mode,
  onModeChange,
  readOnly = false,
  rows,
  examConfig,
  caWeight,
  examWeight,
  isLoading,
  onSaveCell,
  onRequestCorrection,
}: GradebookSpreadsheetProps) {
  const [drafts, setDrafts] = useState<Record<string, { ca: string; exam: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});

  const showInputs = !readOnly && mode === 'entry';

  const stats = useMemo(() => {
    const complete = rows.filter((r) => r.entry?.continuousAssessmentScore != null && r.entry?.examScore != null).length;
    return { complete, total: rows.length };
  }, [rows]);

  const getDraft = useCallback(
    (row: GradebookRow) => {
      const key = row.student.id;
      if (drafts[key]) return drafts[key];
      return {
        ca: row.entry?.continuousAssessmentScore?.toString() ?? '',
        exam: row.entry?.examScore?.toString() ?? '',
      };
    },
    [drafts],
  );

  async function commitRow(row: GradebookRow) {
    if (!examConfig) return;
    const draft = getDraft(row);
    const ca = Number.parseInt(draft.ca, 10);
    const exam = Number.parseInt(draft.exam, 10);
    if (Number.isNaN(ca) || Number.isNaN(exam)) return;
    if (ca > 100 || exam > 100) {
      setCellErrors((prev) => ({
        ...prev,
        [row.student.id]: 'Scores cannot exceed 100.',
      }));
      return;
    }
    setSavingId(row.student.id);
    setCellErrors((prev) => {
      const next = { ...prev };
      delete next[row.student.id];
      return next;
    });
    try {
      await onSaveCell(row.student.id, examConfig.id, ca, exam);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[row.student.id];
        return next;
      });
    } finally {
      setSavingId(null);
    }
  }

  if (isLoading) {
    return <GradebookSpreadsheetSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {!readOnly ? (
          <Tabs value={mode} onValueChange={(v) => onModeChange(v as GradebookViewMode)}>
            <TabsList>
              <TabsTrigger value="entry">Entry</TabsTrigger>
              <TabsTrigger value="review">Review</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : (
          <Badge variant="outline">Read-only consolidated view</Badge>
        )}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {examConfig ? (
            <span>{formatSubjectLabel(examConfig.subjectId)} · CA {caWeight}% / Exam {examWeight}%</span>
          ) : null}
          <span className="font-mono tabular-nums">
            {stats.complete}/{stats.total} complete
          </span>
        </div>
      </div>

      {mode === 'review' && !readOnly ? (
        <p className="text-sm text-muted-foreground">
          Review mode — scores are read-only. Switch to Entry to make changes.
        </p>
      ) : null}

      <div className="relative max-h-[min(70vh,720px)] overflow-auto rounded-sm border shadow-card">
        <Table className="min-w-[720px] border-collapse">
          <TableHeader className="sticky top-0 z-20 bg-neutral-100 dark:bg-forest-800">
            <TableRow>
              <TableHead className="sticky left-0 z-30 min-w-[220px] bg-neutral-100 dark:bg-forest-800">
                Student
              </TableHead>
              {showInputs ? (
                <>
                  <TableHead className="min-w-[88px] text-center">CA ({caWeight}%)</TableHead>
                  <TableHead className="min-w-[88px] text-center">Exam ({examWeight}%)</TableHead>
                </>
              ) : null}
              <TableHead
                className={`min-w-[88px] text-center ${
                  mode === 'review' ? 'bg-gold/10 dark:bg-gold/5' : ''
                }`}
              >
                Total
              </TableHead>
              <TableHead
                className={`min-w-[72px] text-center ${
                  mode === 'review' ? 'border-l-2 border-gold/40 bg-gold/10 dark:bg-gold/5' : ''
                }`}
              >
                Grade
              </TableHead>
              <TableHead className="min-w-[100px]">Status</TableHead>
              {!readOnly && mode === 'entry' ? <TableHead className="w-[100px]" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  No students to display. Ensure students are enrolled and an exam config exists.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const draft = getDraft(row);
                const caNum = Number.parseInt(draft.ca, 10);
                const examNum = Number.parseInt(draft.exam, 10);
                const hasBoth = !Number.isNaN(caNum) && !Number.isNaN(examNum);
                const total = hasBoth
                  ? (row.entry?.totalScore ??
                    computeWeightedTotal(caNum, examNum, caWeight, examWeight))
                  : null;
                const grade = row.entry?.grade ?? (hasBoth ? '—' : '—');
                const locked =
                  row.entry?.status === 'submitted' ||
                  row.entry?.status === 'correction_pending' ||
                  readOnly ||
                  mode === 'review';
                const err = cellErrors[row.student.id];

                return (
                  <TableRow key={row.student.id} className={!row.entry ? 'border-l-2 border-l-warning/50' : undefined}>
                    <TableCell className="sticky left-0 z-10 bg-card font-medium">
                      <div>{studentDisplayName(row.student.firstName, row.student.lastName)}</div>
                      <div className="text-xs text-muted-foreground">{row.student.admissionNo}</div>
                    </TableCell>
                    {showInputs ? (
                      <>
                        <TableCell className="p-2 text-center">
                          <Input
                            inputMode="numeric"
                            disabled={locked || savingId === row.student.id}
                            value={draft.ca}
                            aria-invalid={Boolean(err)}
                            className="h-9 w-20 mx-auto text-center font-mono tabular-nums"
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [row.student.id]: {
                                  ...getDraft(row),
                                  ca: e.target.value.replace(/\D/g, '').slice(0, 3),
                                },
                              }))
                            }
                            onBlur={() => {
                              if (!locked) void commitRow(row);
                            }}
                          />
                        </TableCell>
                        <TableCell className="p-2 text-center">
                          <Input
                            inputMode="numeric"
                            disabled={locked || savingId === row.student.id}
                            value={draft.exam}
                            aria-invalid={Boolean(err)}
                            className="h-9 w-20 mx-auto text-center font-mono tabular-nums"
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [row.student.id]: {
                                  ...getDraft(row),
                                  exam: e.target.value.replace(/\D/g, '').slice(0, 3),
                                },
                              }))
                            }
                            onBlur={() => {
                              if (!locked) void commitRow(row);
                            }}
                          />
                        </TableCell>
                      </>
                    ) : null}
                    <TableCell
                      className={`text-center font-mono tabular-nums ${
                        mode === 'review' ? 'bg-gold/5 font-semibold dark:bg-gold/5' : ''
                      }`}
                    >
                      {total ?? '—'}
                    </TableCell>
                    <TableCell
                      className={`text-center font-mono font-semibold ${
                        mode === 'review' ? 'border-l-2 border-gold/40 bg-gold/5 text-gold-foreground dark:text-gold' : ''
                      }`}
                    >
                      {grade}
                    </TableCell>
                    <TableCell>
                      {row.entry ? (
                        <GradeEntryStatusBadge status={row.entry.status} />
                      ) : (
                        <Badge variant="secondary">Incomplete</Badge>
                      )}
                    </TableCell>
                    {!readOnly && mode === 'entry' ? (
                      <TableCell>
                        {row.entry &&
                        (row.entry.status === 'submitted' || row.entry.status === 'corrected') &&
                        onRequestCorrection ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onRequestCorrection(row.entry!)}
                          >
                            Correct
                          </Button>
                        ) : null}
                        {err ? <p className="mt-1 text-xs text-destructive">{err}</p> : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
