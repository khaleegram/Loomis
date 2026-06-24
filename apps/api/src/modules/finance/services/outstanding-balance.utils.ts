import type { OutstandingBalanceScope } from '@loomis/contracts';

export interface OutstandingInvoiceSlice {
  invoiceId: string;
  studentId: string;
  classLevelId: string;
  status: string;
  amountChargedMinor: number;
  amountPaidMinor: number;
  balanceMinor: number;
  termId: string;
  termStartDate: string | null;
  termSequence: number;
  academicYearId: string;
}

export interface ReferenceTerm {
  id: string;
  termStartDate: string | null;
  termSequence: number;
  academicYearId: string;
}

export interface AggregatedOutstandingRow {
  invoiceId: string | null;
  studentId: string;
  classLevelId: string;
  status: string | null;
  amountChargedMinor: number;
  amountPaidMinor: number;
  balanceMinor: number;
  termBalanceMinor?: number;
  arrearsBalanceMinor?: number;
  totalBalanceMinor?: number;
}

function isArrearsTerm(candidate: OutstandingInvoiceSlice, reference: ReferenceTerm): boolean {
  if (candidate.termId === reference.id) return false;
  if (candidate.academicYearId !== reference.academicYearId) {
    if (candidate.termStartDate && reference.termStartDate) {
      return candidate.termStartDate < reference.termStartDate;
    }
    return false;
  }
  return candidate.termSequence < reference.termSequence;
}

export function aggregateOutstandingByScope(
  slices: OutstandingInvoiceSlice[],
  reference: ReferenceTerm,
  scope: OutstandingBalanceScope,
  filters: { classLevelId?: string; status?: string },
): AggregatedOutstandingRow[] {
  const filtered = slices.filter((slice) => {
    if (filters.classLevelId && slice.classLevelId !== filters.classLevelId) return false;
    if (filters.status && slice.status !== filters.status) return false;
    return true;
  });

  if (scope === 'term') {
    return filtered
      .filter((slice) => slice.termId === reference.id)
      .map((slice) => ({
        invoiceId: slice.invoiceId,
        studentId: slice.studentId,
        classLevelId: slice.classLevelId,
        status: slice.status,
        amountChargedMinor: slice.amountChargedMinor,
        amountPaidMinor: slice.amountPaidMinor,
        balanceMinor: slice.balanceMinor,
      }));
  }

  const byStudent = new Map<string, OutstandingInvoiceSlice[]>();
  for (const slice of filtered) {
    const list = byStudent.get(slice.studentId) ?? [];
    list.push(slice);
    byStudent.set(slice.studentId, list);
  }

  const rows: AggregatedOutstandingRow[] = [];

  for (const [studentId, studentSlices] of byStudent) {
    let termBalance = 0;
    let arrearsBalance = 0;
    let termCharged = 0;
    let termPaid = 0;
    let arrearsCharged = 0;
    let arrearsPaid = 0;
    let classLevelId = studentSlices[0]!.classLevelId;
    let termStatus: string | null = null;
    let termInvoiceId: string | null = null;

    for (const slice of studentSlices) {
      if (slice.termId === reference.id) {
        termBalance += slice.balanceMinor;
        termCharged += slice.amountChargedMinor;
        termPaid += slice.amountPaidMinor;
        termStatus = slice.status;
        termInvoiceId = slice.invoiceId;
        classLevelId = slice.classLevelId;
      } else if (isArrearsTerm(slice, reference)) {
        arrearsBalance += slice.balanceMinor;
        arrearsCharged += slice.amountChargedMinor;
        arrearsPaid += slice.amountPaidMinor;
      }
    }

    const totalBalance = termBalance + arrearsBalance;
    if (scope === 'arrears') {
      if (arrearsBalance <= 0) continue;
      rows.push({
        invoiceId: null,
        studentId,
        classLevelId,
        status: termStatus,
        amountChargedMinor: arrearsCharged,
        amountPaidMinor: arrearsPaid,
        balanceMinor: arrearsBalance,
        termBalanceMinor: termBalance,
        arrearsBalanceMinor: arrearsBalance,
        totalBalanceMinor: totalBalance,
      });
      continue;
    }

    if (totalBalance <= 0) continue;

    rows.push({
      invoiceId: termInvoiceId,
      studentId,
      classLevelId,
      status: termStatus,
      amountChargedMinor: termCharged + arrearsCharged,
      amountPaidMinor: termPaid + arrearsPaid,
      balanceMinor: totalBalance,
      termBalanceMinor: termBalance,
      arrearsBalanceMinor: arrearsBalance,
      totalBalanceMinor: totalBalance,
    });
  }

  return rows.sort((a, b) => a.classLevelId.localeCompare(b.classLevelId) || a.studentId.localeCompare(b.studentId));
}

export function summarizeOutstandingRows(rows: AggregatedOutstandingRow[]) {
  return rows.reduce(
    (acc, row) => {
      acc.totalChargedMinor += row.amountChargedMinor;
      acc.totalPaidMinor += row.amountPaidMinor;
      acc.totalBalanceMinor += row.balanceMinor;
      return acc;
    },
    { studentCount: rows.length, totalChargedMinor: 0, totalPaidMinor: 0, totalBalanceMinor: 0 },
  );
}
