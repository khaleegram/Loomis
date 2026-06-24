/** Canonical school subjects until the subjects module ships (matches seed + web ops-labels). */
export const SCHOOL_SUBJECT_CATALOGUE = [
  { id: '019c0000-0000-7000-8000-000000000001', code: 'MTH', label: 'Mathematics' },
  { id: '019c0000-0000-7000-8000-000000000002', code: 'ENG', label: 'English Language' },
  { id: '019c0000-0000-7000-8000-000000000003', code: 'BSC', label: 'Basic Science' },
  { id: '019c0000-0000-7000-8000-000000000004', code: 'SST', label: 'Social Studies' },
  { id: '019c0000-0000-7000-8000-000000000005', code: 'CIV', label: 'Civic Education' },
  { id: '019c0000-0000-7000-8000-000000000006', code: 'CMP', label: 'Computer Studies' },
] as const;

export type SchoolSubjectCatalogueEntry = (typeof SCHOOL_SUBJECT_CATALOGUE)[number];
