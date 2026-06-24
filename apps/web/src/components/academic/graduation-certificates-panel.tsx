'use client';

import { useLeavingCertificates } from '@loomis/api-client';
import type { PromotionRecordResponse, StudentCertificateResponse } from '@loomis/contracts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@loomis/ui-web';
import { FileText } from 'lucide-react';
import { useMemo } from 'react';

import { AcademicEmptyState } from '@/components/academic/academic-empty-state';
import { LeavingCertificateActions } from '@/components/academic/leaving-certificate-actions';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useCanConfirmPromotions } from '@/lib/auth/use-can-confirm-promotions';

function formatIssuedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface GraduationCertificatesPanelProps {
  tenantId: string;
  academicYearId: string;
  records: PromotionRecordResponse[];
  studentNames: Record<string, string>;
}

export function GraduationCertificatesPanel({
  tenantId,
  academicYearId,
  records,
  studentNames,
}: GraduationCertificatesPanelProps) {
  const canGenerate = useCanConfirmPromotions();
  const confirmedGraduates = records.filter(
    (r) => r.outcome === 'graduated' && r.status === 'confirmed',
  );

  const certificatesQuery = useLeavingCertificates(tenantId, academicYearId);
  const certificateByStudent = useMemo(() => {
    const map = new Map<string, StudentCertificateResponse>();
    for (const cert of certificatesQuery.data?.certificates ?? []) {
      map.set(cert.studentId, cert);
    }
    return map;
  }, [certificatesQuery.data?.certificates]);

  if (confirmedGraduates.length === 0) {
    return (
      <AcademicEmptyState
        icon={FileText}
        title="No confirmed graduates yet"
        description="Leaving certificates appear here after the Principal confirms the graduation list."
      />
    );
  }

  const isLoading = certificatesQuery.isLoading;

  return (
    <div className={ACADEMIC_UI.dataPanel}>
      <Table>
        <TableHeader>
          <TableRow className={`${ACADEMIC_UI.tableHeader} hover:bg-transparent`}>
            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Student
            </TableHead>
            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Certificate
            </TableHead>
            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Issued
            </TableHead>
            <TableHead className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {confirmedGraduates.map((record, index) => {
            const certificate = certificateByStudent.get(record.studentId);
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
                  {isLoading ? '—' : certificate?.certificateNumber ?? 'Not issued'}
                </TableCell>
                <TableCell className="text-[13px] text-neutral-600">
                  {isLoading || !certificate ? '—' : formatIssuedDate(certificate.issuedAt)}
                </TableCell>
                <TableCell>
                  <LeavingCertificateActions
                    tenantId={tenantId}
                    studentId={record.studentId}
                    academicYearId={academicYearId}
                    certificate={certificate}
                    canGenerate={canGenerate}
                    onGenerated={() => certificatesQuery.refetch()}
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
