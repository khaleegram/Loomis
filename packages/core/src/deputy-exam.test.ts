import { describe, expect, it } from 'vitest';

import {
  DEPUTY_EXAM_ACTIVATION_MS,
  EMERGENCY_PUBLISH_ESCALATION_MS,
  hoursUntilDeputyExamActivation,
  hoursUntilEmergencyPublishEscalation,
  isDeputyExamOfficerActivated,
  isEmergencyPublishEscalationActive,
} from './deputy-exam.js';

describe('deputy exam 72h rule', () => {
  it('activates when exam officer has no session activity', () => {
    expect(isDeputyExamOfficerActivated(null)).toBe(true);
    expect(hoursUntilDeputyExamActivation(null)).toBe(0);
  });

  it('activates after 72 hours of inactivity', () => {
    const stale = new Date(Date.now() - DEPUTY_EXAM_ACTIVATION_MS - 1);
    expect(isDeputyExamOfficerActivated(stale)).toBe(true);
    expect(hoursUntilDeputyExamActivation(stale)).toBe(0);
  });

  it('does not activate when exam officer was recently active', () => {
    const recent = new Date(Date.now() - 60 * 60 * 1000);
    expect(isDeputyExamOfficerActivated(recent)).toBe(false);
    expect(hoursUntilDeputyExamActivation(recent)).toBeGreaterThan(0);
  });
});

describe('principal emergency publish escalation', () => {
  it('does not activate when exam officer has no session activity', () => {
    expect(isEmergencyPublishEscalationActive(null)).toBe(false);
    expect(hoursUntilEmergencyPublishEscalation(null)).toBe(0);
  });

  it('does not activate before deputy window plus escalation wait', () => {
    const staleDeputyOnly = new Date(
      Date.now() - DEPUTY_EXAM_ACTIVATION_MS - 1,
    );
    expect(isEmergencyPublishEscalationActive(staleDeputyOnly)).toBe(false);
    expect(hoursUntilEmergencyPublishEscalation(staleDeputyOnly)).toBeGreaterThan(0);
  });

  it('activates after deputy window plus escalation wait', () => {
    const totalMs = DEPUTY_EXAM_ACTIVATION_MS + EMERGENCY_PUBLISH_ESCALATION_MS;
    const stale = new Date(Date.now() - totalMs - 1);
    expect(isEmergencyPublishEscalationActive(stale)).toBe(true);
    expect(hoursUntilEmergencyPublishEscalation(stale)).toBe(0);
  });
});
