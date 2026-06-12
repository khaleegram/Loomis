import type {
  AdmissionStatus,
  EnrollmentStatus,
  GuardianRelationship,
  IdentityAttestationType,
  ParentLinkStatus,
  StudentGender,
  StudentStatus,
} from '@loomis/contracts';

export function admissionStatusLabel(status: AdmissionStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'approved':
      return 'Approved';
    case 'declined':
      return 'Declined';
    case 'withdrawn':
      return 'Withdrawn';
    default:
      return status;
  }
}

export function studentStatusLabel(status: StudentStatus): string {
  switch (status) {
    case 'admitted':
      return 'Admitted';
    case 'enrolled':
      return 'Enrolled';
    case 'graduated':
      return 'Graduated';
    case 'transferred_out':
      return 'Transferred out';
    case 'withdrawn':
      return 'Withdrawn';
    default:
      return status;
  }
}

export function enrollmentStatusLabel(status: EnrollmentStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'active_billable':
      return 'Active (billable)';
    case 'suspended':
      return 'Suspended';
    case 'withdrawn':
      return 'Withdrawn';
    case 'transferred':
      return 'Transferred';
    case 'graduated':
      return 'Graduated';
    default:
      return status;
  }
}

export function parentLinkStatusLabel(status: ParentLinkStatus): string {
  switch (status) {
    case 'initiated':
      return 'Awaiting parent';
    case 'school_attested':
      return 'School attested';
    case 'parent_verified':
      return 'Parent verified';
    case 'active':
      return 'Active';
    case 'rejected':
      return 'Rejected';
    case 'revoked':
      return 'Revoked';
    case 'expired':
      return 'Expired';
    default:
      return status;
  }
}

export function genderLabel(gender: StudentGender): string {
  switch (gender) {
    case 'male':
      return 'Male';
    case 'female':
      return 'Female';
    case 'other':
      return 'Other';
    case 'unknown':
      return 'Not specified';
    default:
      return gender;
  }
}

export function relationshipLabel(relationship: GuardianRelationship): string {
  switch (relationship) {
    case 'mother':
      return 'Mother';
    case 'father':
      return 'Father';
    case 'guardian':
      return 'Guardian';
    case 'sponsor':
      return 'Sponsor';
    case 'other':
      return 'Other';
    default:
      return relationship;
  }
}

export function attestationTypeLabel(type: IdentityAttestationType): string {
  switch (type) {
    case 'birth_certificate':
      return 'Birth certificate';
    case 'previous_school_record':
      return 'Previous school record';
    case 'admission_photograph':
      return 'Admission photograph';
    case 'parent_consent':
      return 'Parent consent';
    default:
      return type;
  }
}

export function studentDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function studentInitials(firstName: string, lastName: string): string {
  const first = firstName.charAt(0).toUpperCase();
  const last = lastName.charAt(0).toUpperCase();
  return `${first}${last}`;
}

export function computeAgeYears(dateOfBirth: string): number {
  const [y, m, d] = dateOfBirth.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
    age -= 1;
  }
  return age;
}

export function daysBetween(isoStart: string, isoEnd: Date = new Date()): number {
  const start = new Date(isoStart).getTime();
  const end = isoEnd.getTime();
  return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
}

export function formatCalendarDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${'•'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}

export function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return `${'•'.repeat(phone.length - 4)}${phone.slice(-4)}`;
}

// ── Directory Metrics ──────────────────────────────────────────────────────────

export interface StudentDirectoryMetrics {
  total: number;
  enrolled: number;
  admitted: number;
  graduated: number;
  transferredOut: number;
  withdrawn: number;
}

export function computeStudentMetrics(
  students: { status: string }[],
): StudentDirectoryMetrics {
  return {
    total: students.length,
    enrolled: students.filter((s) => s.status === 'enrolled').length,
    admitted: students.filter((s) => s.status === 'admitted').length,
    graduated: students.filter((s) => s.status === 'graduated').length,
    transferredOut: students.filter((s) => s.status === 'transferred_out').length,
    withdrawn: students.filter((s) => s.status === 'withdrawn').length,
  };
}
