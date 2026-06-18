const STORAGE_PREFIX = 'loomis:report-card-print:';

export interface ReportCardPrintBatchPayload {
  tenantId: string;
  studentIds: string[];
  /** When set, each card shows only this subject. */
  subjectId: string | null;
  classArmId: string;
  termId: string;
  createdAt: number;
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function storeReportCardPrintBatch(payload: ReportCardPrintBatchPayload): string {
  const key = `${STORAGE_PREFIX}${payload.createdAt}`;
  storage()?.setItem(key, JSON.stringify(payload));
  return key;
}

export function readReportCardPrintBatch(key: string): ReportCardPrintBatchPayload | null {
  if (!key.startsWith(STORAGE_PREFIX)) return null;
  const raw = storage()?.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ReportCardPrintBatchPayload;
    if (
      !parsed.tenantId ||
      !parsed.studentIds?.length ||
      !parsed.classArmId ||
      !parsed.termId
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function openReportCardPrintBatch(
  payload: Omit<ReportCardPrintBatchPayload, 'createdAt'>,
): void {
  const createdAt = Date.now();
  const key = storeReportCardPrintBatch({ ...payload, createdAt });
  const params = new URLSearchParams({ key });
  window.open(`/school/report-cards/print?${params.toString()}`, '_blank', 'noopener,noreferrer');
}
