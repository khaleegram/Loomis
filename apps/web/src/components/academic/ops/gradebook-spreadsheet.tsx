'use client';

import type { ExamConfigResponse, GradebookEntryResponse, StudentResponse } from '@loomis/contracts';
import { Skeleton } from '@loomis/ui-web';
import { Lock, Pencil } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { GRADEBOOK_UI } from '@/lib/academic/gradebook-ui';
import {
  componentScoreError,
  computeGradebookTotal,
  formatScoreColumnLabel,
  isValidComponentScore,
} from '@/lib/academic/grade-scoring';
import { studentDisplayName } from '@/lib/student/student-labels';

export interface GradebookRow {
  student: StudentResponse;
  entry: GradebookEntryResponse | null;
  examConfigId: string;
}

interface GradebookSpreadsheetProps {
  rows: GradebookRow[];
  examConfig: ExamConfigResponse | null;
  caWeight: number;
  examWeight: number;
  isLoading?: boolean;
  readOnly?: boolean;
  onSaveCell: (
    studentId: string,
    examConfigId: string,
    ca: number,
    exam: number,
  ) => Promise<void>;
  onSaveError?: (err: unknown) => void;
  onRequestCorrection?: (entry: GradebookEntryResponse) => void;
}

type ScoreField = 'ca' | 'exam';

type RowFieldErrors = { ca?: string; exam?: string };

function isRowLocked(row: GradebookRow, readOnly: boolean): boolean {
  if (readOnly) return true;
  const status = row.entry?.status;
  return status === 'submitted' || status === 'correction_pending';
}

function statusLabel(status: GradebookEntryResponse['status'] | undefined): string {
  switch (status) {
    case 'submitted':
      return 'Locked';
    case 'correction_pending':
      return 'Pending';
    case 'corrected':
      return 'Corrected';
    case 'draft':
      return 'Draft';
    default:
      return 'Empty';
  }
}

function parseDraftScore(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function validateDraftScores(
  ca: number | null,
  exam: number | null,
  caWeight: number,
  examWeight: number,
): RowFieldErrors {
  const errors: RowFieldErrors = {};
  if (ca != null) {
    const caError = componentScoreError(ca, caWeight, 'CA');
    if (caError) errors.ca = caError;
  }
  if (exam != null) {
    const examError = componentScoreError(exam, examWeight, 'Exam');
    if (examError) errors.exam = examError;
  }
  return errors;
}

export function GradebookSpreadsheetSkeleton() {
  return <Skeleton className="h-full min-h-[420px] w-full" />;
}

export function GradebookSpreadsheet({
  rows,
  examConfig,
  caWeight,
  examWeight,
  isLoading,
  readOnly = false,
  onSaveCell,
  onSaveError,
  onRequestCorrection,
}: GradebookSpreadsheetProps) {
  const [drafts, setDrafts] = useState<Record<string, { ca: string; exam: string }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, RowFieldErrors>>({});
  const [shakeCells, setShakeCells] = useState<Record<string, boolean>>({});
  const gridRef = useRef<HTMLDivElement>(null);

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

  const focusCell = useCallback((rowIndex: number, field: ScoreField) => {
    const selector = `[data-gb-row="${rowIndex}"][data-gb-field="${field}"]`;
    gridRef.current?.querySelector<HTMLInputElement>(selector)?.focus();
  }, []);

  const triggerShake = useCallback((studentId: string, field: ScoreField) => {
    const key = `${studentId}:${field}`;
    setShakeCells((prev) => ({ ...prev, [key]: true }));
    window.setTimeout(() => {
      setShakeCells((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 480);
  }, []);

  async function commitRow(row: GradebookRow) {
    if (!examConfig || isRowLocked(row, readOnly)) return;
    const draft = getDraft(row);
    const ca = parseDraftScore(draft.ca);
    const exam = parseDraftScore(draft.exam);
    if (ca == null || exam == null) return;

    const errors = validateDraftScores(ca, exam, caWeight, examWeight);
    if (errors.ca || errors.exam) {
      setFieldErrors((prev) => ({ ...prev, [row.student.id]: errors }));
      if (errors.ca) triggerShake(row.student.id, 'ca');
      if (errors.exam) triggerShake(row.student.id, 'exam');
      return;
    }

    setSavingKey(row.student.id);
    setFieldErrors((prev) => {
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
    } catch (err) {
      onSaveError?.(err);
    } finally {
      setSavingKey(null);
    }
  }

  const colCount = 7;

  if (isLoading) return <GradebookSpreadsheetSkeleton />;

  return (
    <div ref={gridRef} className="min-w-full">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead className="sticky top-0 z-30">
          <tr className={GRADEBOOK_UI.colHeader}>
            <th className={`${GRADEBOOK_UI.cell} ${GRADEBOOK_UI.rowHeader} w-10 text-center`}>#</th>
            <th className={`${GRADEBOOK_UI.cell} ${GRADEBOOK_UI.rowHeader} min-w-[180px] px-3 py-2 text-left`}>
              Student
            </th>
            <th className={`${GRADEBOOK_UI.cell} w-20 px-1 py-2 text-center`}>
              {formatScoreColumnLabel('CA', caWeight)}
            </th>
            <th className={`${GRADEBOOK_UI.cell} w-20 px-1 py-2 text-center`}>
              {formatScoreColumnLabel('Exam', examWeight)}
            </th>
            <th className={`${GRADEBOOK_UI.cell} w-16 bg-[#faf3e8] px-1 py-2 text-center text-neutral-700`}>
              Total (/100)
            </th>
            <th className={`${GRADEBOOK_UI.cell} w-14 bg-[#faf3e8] px-1 py-2 text-center text-neutral-700`}>
              Grd
            </th>
            <th className={`${GRADEBOOK_UI.cell} w-16 px-1 py-2 text-center`}>Stat</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="py-16 text-center text-[13px] text-neutral-400">
                No students on this class roster. Check enrollment for the selected term.
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => {
              const draft = getDraft(row);
              const caNum = parseDraftScore(draft.ca);
              const examNum = parseDraftScore(draft.exam);
              const rowErrors = fieldErrors[row.student.id] ?? {};
              const bothValid =
                caNum != null &&
                examNum != null &&
                isValidComponentScore(caNum, caWeight) &&
                isValidComponentScore(examNum, examWeight);
              const total = bothValid
                ? (row.entry?.totalScore ?? computeGradebookTotal(caNum, examNum))
                : row.entry?.totalScore ?? null;
              const grade = row.entry?.grade ?? null;
              const locked = isRowLocked(row, readOnly);
              const saving = savingKey === row.student.id;
              const canCorrect =
                row.entry &&
                (row.entry.status === 'submitted' || row.entry.status === 'corrected') &&
                onRequestCorrection;

              const handleKeyDown = (field: ScoreField, e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void commitRow(row).then(() => {
                    if (rowIndex < rows.length - 1) focusCell(rowIndex + 1, field);
                  });
                }
                if (e.key === 'Tab' && !e.shiftKey && field === 'ca') {
                  e.preventDefault();
                  focusCell(rowIndex, 'exam');
                }
              };

              const updateDraft = (field: ScoreField, raw: string) => {
                const max = field === 'ca' ? caWeight : examWeight;
                const val = raw.replace(/\D/g, '').slice(0, String(max).length);
                const parsed = parseDraftScore(val);
                const nextDraft = { ...getDraft(row), [field]: val };
                const nextErrors = validateDraftScores(
                  parseDraftScore(nextDraft.ca),
                  parseDraftScore(nextDraft.exam),
                  caWeight,
                  examWeight,
                );

                setDrafts((prev) => ({
                  ...prev,
                  [row.student.id]: nextDraft,
                }));
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  if (nextErrors.ca || nextErrors.exam) next[row.student.id] = nextErrors;
                  else delete next[row.student.id];
                  return next;
                });

                if (parsed != null && parsed > max) {
                  triggerShake(row.student.id, field);
                }
              };

              return (
                <tr
                  key={row.student.id}
                  className={!row.entry ? 'bg-amber-50/40' : rowIndex % 2 === 1 ? 'bg-neutral-50/30' : 'bg-white'}
                >
                  <td
                    className={`${GRADEBOOK_UI.cell} ${GRADEBOOK_UI.rowHeader} text-center font-mono text-[11px] text-neutral-400`}
                  >
                    {rowIndex + 1}
                  </td>
                  <td className={`${GRADEBOOK_UI.cell} ${GRADEBOOK_UI.rowHeader} px-3 py-1.5`}>
                    <div className="text-[13px] font-medium text-neutral-900">
                      {studentDisplayName(row.student.firstName, row.student.lastName)}
                    </div>
                    <div className="font-mono text-[10px] text-neutral-400">{row.student.admissionNo}</div>
                  </td>

                  {(['ca', 'exam'] as const).map((field) => {
                    const fieldMax = field === 'ca' ? caWeight : examWeight;
                    const fieldError = field === 'ca' ? rowErrors.ca : rowErrors.exam;
                    const shake = shakeCells[`${row.student.id}:${field}`];

                    return (
                      <td key={field} className={GRADEBOOK_UI.cell}>
                        {locked ? (
                          <div
                            className={`flex h-[34px] items-center justify-center ${GRADEBOOK_UI.scoreReadonly}`}
                          >
                            {field === 'ca'
                              ? (row.entry?.continuousAssessmentScore ?? '—')
                              : (row.entry?.examScore ?? '—')}
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              data-gb-row={rowIndex}
                              data-gb-field={field}
                              disabled={saving}
                              value={field === 'ca' ? draft.ca : draft.exam}
                              aria-label={`${field === 'ca' ? 'CA' : 'Exam'} score (max ${fieldMax}) for ${row.student.admissionNo}`}
                              aria-invalid={Boolean(fieldError)}
                              className={`${fieldError ? GRADEBOOK_UI.scoreInputError : GRADEBOOK_UI.scoreInput} ${shake ? 'animate-gradebook-shake' : ''}`}
                              onChange={(e) => updateDraft(field, e.target.value)}
                              onBlur={() => void commitRow(row)}
                              onKeyDown={(e) => handleKeyDown(field, e)}
                            />
                            {fieldError ? (
                              <span className="absolute inset-x-0 -bottom-4 truncate text-center text-[9px] font-medium text-red-600">
                                Max {fieldMax}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  <td className={`${GRADEBOOK_UI.cell} bg-[#faf3e8]/60`}>
                    <div
                      className={`flex h-[34px] items-center justify-center font-mono text-[13px] font-semibold tabular-nums ${GRADEBOOK_UI.scoreReadonly}`}
                    >
                      {total ?? '—'}
                    </div>
                  </td>
                  <td className={`${GRADEBOOK_UI.cell} bg-[#faf3e8]/60`}>
                    <div className="flex h-[34px] items-center justify-center font-mono text-[13px] font-bold tabular-nums text-brand-800">
                      {grade ?? '—'}
                    </div>
                  </td>
                  <td className={GRADEBOOK_UI.cell}>
                    <div className="flex h-[34px] flex-col items-center justify-center gap-0.5 px-1">
                      <span className="text-[9px] font-bold uppercase tracking-wide text-neutral-500">
                        {statusLabel(row.entry?.status)}
                      </span>
                      {canCorrect ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-brand-700 hover:underline"
                          onClick={() => onRequestCorrection!(row.entry!)}
                        >
                          <Pencil aria-hidden className="size-2.5" />
                          Fix
                        </button>
                      ) : locked && readOnly ? (
                        <Lock aria-hidden className="size-3 text-neutral-300" />
                      ) : locked ? (
                        <Lock aria-hidden className="size-3 text-neutral-300" />
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
