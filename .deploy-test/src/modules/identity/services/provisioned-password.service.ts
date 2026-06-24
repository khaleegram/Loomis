/** Default temporary password for newly added staff (must change on first login). */
export const DEFAULT_STAFF_PROVISIONED_PASSWORD = '11111111';

/** Default temporary password for newly admitted students (must change on first login). */
export const DEFAULT_STUDENT_PROVISIONED_PASSWORD = '00000000';

/** Builds a unique, non-deliverable portal login email for a student. */
export function buildStudentPortalEmail(tenantId: string, admissionNo: string): string {
  const slug = admissionNo
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const tenantPrefix = tenantId.replace(/-/g, '').slice(0, 8);
  return `${slug}.${tenantPrefix}@student.loomis.local`;
}
