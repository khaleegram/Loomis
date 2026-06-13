'use client';

import {
  useGenerateLeavingCertificate,
  useStorageDownloadUrl,
} from '@loomis/api-client';
import type { StudentCertificateResponse } from '@loomis/contracts';
import { Download, FilePlus, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { cn } from '@loomis/ui-web';

interface LeavingCertificateDownloadButtonProps {
  storageObjectId: string | null | undefined;
  className?: string;
}

export function LeavingCertificateDownloadButton({
  storageObjectId,
  className,
}: LeavingCertificateDownloadButtonProps) {
  const { data, isLoading, isError } = useStorageDownloadUrl(storageObjectId);
  const downloadUrl = data?.downloadUrl;

  if (!storageObjectId) {
    return <span className="text-[12px] text-neutral-400">Not issued</span>;
  }

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-neutral-500">
        <Loader2 aria-hidden className="size-3.5 animate-spin" />
        Preparing…
      </span>
    );
  }

  if (isError || !downloadUrl) {
    return <span className="text-[12px] text-neutral-400">Unavailable</span>;
  }

  return (
    <a
      href={downloadUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(ACADEMIC_UI.btnPrimarySm, className)}
    >
      <Download aria-hidden className="size-3.5" />
      Download PDF
    </a>
  );
}

interface LeavingCertificateActionsProps {
  tenantId: string;
  studentId: string;
  academicYearId: string;
  certificate: StudentCertificateResponse | null | undefined;
  canGenerate?: boolean;
  onGenerated?: () => void;
}

export function LeavingCertificateActions({
  tenantId,
  studentId,
  academicYearId,
  certificate,
  canGenerate = false,
  onGenerated,
}: LeavingCertificateActionsProps) {
  const generate = useGenerateLeavingCertificate(tenantId);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    try {
      await generate.mutateAsync({ studentId, academicYearId });
      onGenerated?.();
    } catch (err) {
      setError(academicErrorMessage(err));
    }
  }

  if (certificate) {
    return (
      <div className="flex flex-col items-start gap-1">
        <LeavingCertificateDownloadButton storageObjectId={certificate.storageObjectId} />
        <span className="text-[11px] text-neutral-400">{certificate.certificateNumber}</span>
      </div>
    );
  }

  if (!canGenerate) {
    return <span className="text-[12px] text-neutral-400">Pending issue</span>;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={generate.isPending}
        className={ACADEMIC_UI.btnSecondarySm}
      >
        {generate.isPending ? (
          <Loader2 aria-hidden className="size-3.5 animate-spin" />
        ) : (
          <FilePlus aria-hidden className="size-3.5" />
        )}
        {generate.isPending ? 'Generating…' : 'Generate certificate'}
      </button>
      {error ? <span className="text-[11px] text-red-600">{error}</span> : null}
    </div>
  );
}
