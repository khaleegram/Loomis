/** Exam Officer inactivity before Deputy Exam Officer may act (loomis-roles.mdc). */
export const DEPUTY_EXAM_ACTIVATION_MS = 72 * 60 * 60 * 1000;

/** Additional wait after Deputy activation before Principal emergency publish (SRS FR-ACA-008). */
export const EMERGENCY_PUBLISH_ESCALATION_MS = 48 * 60 * 60 * 1000;

/** True when the Exam Officer has been inactive long enough for Deputy activation. */
export function isDeputyExamOfficerActivated(examOfficerLastActiveAt: Date | null): boolean {
  if (examOfficerLastActiveAt == null) return true;
  return Date.now() - examOfficerLastActiveAt.getTime() >= DEPUTY_EXAM_ACTIVATION_MS;
}

/** Hours remaining until Deputy may act; 0 when already eligible. */
export function hoursUntilDeputyExamActivation(examOfficerLastActiveAt: Date | null): number {
  if (examOfficerLastActiveAt == null) return 0;
  const remaining = DEPUTY_EXAM_ACTIVATION_MS - (Date.now() - examOfficerLastActiveAt.getTime());
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / (60 * 60 * 1000));
}

/** Principal emergency publish when EO inactive through Deputy window + escalation wait. */
export function isEmergencyPublishEscalationActive(examOfficerLastActiveAt: Date | null): boolean {
  if (examOfficerLastActiveAt == null) return false;
  const inactiveMs = Date.now() - examOfficerLastActiveAt.getTime();
  return inactiveMs >= DEPUTY_EXAM_ACTIVATION_MS + EMERGENCY_PUBLISH_ESCALATION_MS;
}

export function hoursUntilEmergencyPublishEscalation(examOfficerLastActiveAt: Date | null): number {
  if (examOfficerLastActiveAt == null) return 0;
  const totalMs = DEPUTY_EXAM_ACTIVATION_MS + EMERGENCY_PUBLISH_ESCALATION_MS;
  const remaining = totalMs - (Date.now() - examOfficerLastActiveAt.getTime());
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / (60 * 60 * 1000));
}
