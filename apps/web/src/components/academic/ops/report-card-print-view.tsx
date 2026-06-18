'use client';

import {
  useExamConfigs,
  useGradebookEntries,
  useGradingSchemes,
  useSchoolBranding,
  useTermEnrollmentRoster,
} from '@loomis/api-client';
import type { StudentGender, StudentResponse } from '@loomis/contracts';
import { Button, Skeleton } from '@loomis/ui-web';
import { Printer, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { ReportCardPrintBatch } from '@/components/academic/ops/report-card-print-batch';
import {
  classArmOptions,
  useAcademicOpsContext,
} from '@/lib/academic/use-academic-ops-context';
import {
  readReportCardPrintBatch,
  type ReportCardPrintBatchPayload,
} from '@/lib/academic/report-card-print-batch';
import { useActiveTenantStore } from '@/lib/tenant/active-tenant-store';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

function rosterStudentFromEnrollment(
  entry: {
    studentId: string;
    admissionNo: string;
    firstName: string;
    lastName: string;
  },
  gender: StudentGender = 'unknown',
): StudentResponse {
  return {
    id: entry.studentId,
    tenantId: '',
    admissionNo: entry.admissionNo,
    firstName: entry.firstName,
    lastName: entry.lastName,
    status: 'enrolled',
    gender,
    dateOfBirth: '2010-01-01',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  } as StudentResponse;
}

export function ReportCardPrintView() {
  const searchParams = useSearchParams();
  const batchKey = searchParams.get('key');
  const storeTenantId = useTenantId();
  const setActiveTenantId = useActiveTenantStore((s) => s.setActiveTenantId);

  const [batch, setBatch] = useState<ReportCardPrintBatchPayload | null>(null);
  const [batchReady, setBatchReady] = useState(false);

  useEffect(() => {
    const loaded = batchKey ? readReportCardPrintBatch(batchKey) : null;
    setBatch(loaded);
    if (loaded?.tenantId) {
      setActiveTenantId(loaded.tenantId);
    }
    setBatchReady(true);
  }, [batchKey, setActiveTenantId]);

  const tenantId = batch?.tenantId ?? storeTenantId;
  const adminCtx = useAcademicOpsContext(tenantId ?? '');
  const classArmId = batch?.classArmId ?? adminCtx.classArmId;
  const termId = batch?.termId ?? adminCtx.termId;

  const examConfigsQuery = useExamConfigs(tenantId ?? '', termId ?? '');
  const schemesQuery = useGradingSchemes(tenantId ?? '');
  const gradebookFilters =
    termId && classArmId ? { termId, classArmId } : null;
  const entriesQuery = useGradebookEntries(tenantId ?? '', gradebookFilters);
  const rosterQuery = useTermEnrollmentRoster(tenantId ?? '', termId ?? '');
  const brandingQuery = useSchoolBranding(tenantId ?? '');

  const classExamConfigs = useMemo(
    () => examConfigsQuery.data?.configs.filter((c) => c.classArmId === classArmId) ?? [],
    [examConfigsQuery.data, classArmId],
  );

  const allClassSubjectIds = useMemo(() => {
    const ids = classExamConfigs.map((c) => c.subjectId);
    return [...new Set(ids)].sort();
  }, [classExamConfigs]);

  const displaySubjectIds = useMemo(
    () => (batch?.subjectId ? [batch.subjectId] : allClassSubjectIds),
    [batch?.subjectId, allClassSubjectIds],
  );

  const activeScheme = useMemo(() => {
    const schemes = schemesQuery.data?.schemes ?? [];
    if (classExamConfigs.length === 0) {
      return schemes.find((scheme) => scheme.isDefault) ?? schemes[0] ?? null;
    }
    const schemeId = classExamConfigs[0]?.gradingSchemeId;
    return schemes.find((scheme) => scheme.id === schemeId) ?? schemes.find((s) => s.isDefault) ?? null;
  }, [schemesQuery.data, classExamConfigs]);

  const rosterStudents = useMemo(() => {
    return (rosterQuery.data?.entries ?? [])
      .filter(
        (entry) =>
          entry.classArmId === classArmId &&
          (entry.status === 'active' ||
            entry.status === 'active_billable' ||
            entry.status === 'suspended'),
      )
      .map((entry) => rosterStudentFromEnrollment(entry))
      .sort((a, b) => a.admissionNo.localeCompare(b.admissionNo));
  }, [rosterQuery.data, classArmId]);

  const printStudents = useMemo(() => {
    if (!batch) return [];
    const idSet = new Set(batch.studentIds);
    return rosterStudents.filter((student) => idSet.has(student.id));
  }, [batch, rosterStudents]);

  const classLabel =
    classArmOptions(adminCtx.arms, adminCtx.levels).find((arm) => arm.id === classArmId)?.label ??
    null;

  const isLoading =
    !batchReady ||
    !tenantId ||
    entriesQuery.isLoading ||
    rosterQuery.isLoading ||
    examConfigsQuery.isLoading ||
    schemesQuery.isLoading;

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (!batchReady) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white">
        <Skeleton className="h-12 w-64 rounded-lg" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <p className="text-[15px] font-semibold text-neutral-800">Print session not found</p>
        <p className="max-w-sm text-[13px] text-neutral-500">
          Open print again from Report cards using Print student or Print class.
        </p>
        <Button asChild variant="outline">
          <Link href="/school/report-cards">Back to report cards</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="report-card-print-portal fixed inset-0 z-[200] overflow-y-auto bg-neutral-200/90 print:static print:z-auto print:overflow-visible print:bg-white">
      <div
        data-print-hide="true"
        className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm sm:px-6"
      >
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-neutral-900">Print preview</p>
          <p className="text-[12px] text-neutral-500">
            {printStudents.length} report card{printStudents.length === 1 ? '' : 's'}
            {classLabel ? ` · ${classLabel}` : ''}
            {adminCtx.activeTerm?.name ? ` · ${adminCtx.activeTerm.name}` : ''}
            <span className="hidden sm:inline"> — one student per page</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 bg-brand-700 px-3 text-white hover:bg-brand-800"
            disabled={printStudents.length === 0 || isLoading}
            onClick={handlePrint}
          >
            <Printer className="size-3.5" />
            Print {printStudents.length > 0 ? `(${printStudents.length})` : ''}
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 px-3" asChild>
            <Link href="/school/report-cards">
              <X className="mr-1 size-3.5" />
              Close
            </Link>
          </Button>
        </div>
      </div>

      <ReportCardPrintBatch
        students={printStudents}
        subjectIds={displaySubjectIds}
        entries={entriesQuery.data?.entries ?? []}
        rosterStudents={rosterStudents}
        termName={adminCtx.activeTerm?.name}
        sessionName={adminCtx.activeYear?.label}
        classLabel={classLabel}
        schoolName={brandingQuery.data?.tenantName}
        logoStorageObjectId={brandingQuery.data?.branding.logoStorageObjectId}
        schemeName={activeScheme?.name}
        caWeight={activeScheme?.continuousAssessmentWeight ?? 40}
        examWeight={activeScheme?.examWeight ?? 60}
        passMark={activeScheme?.passMark ?? 40}
        gradeBands={activeScheme?.gradeBands ?? []}
      />
    </div>
  );
}
