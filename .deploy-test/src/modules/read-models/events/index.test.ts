import { describe, expect, it } from 'vitest';
import { listRegisteredEventTypes } from '../../../shared/events/registry.js';
import { registerReadModelEventConsumers } from './index.js';
import { ACADEMIC_EVENT_TYPES } from '../../academic/events/types.js';
import { FINANCE_EVENT_TYPES } from '../../finance/events/types.js';
import { STUDENT_EVENT_TYPES } from '../../student/events/types.js';

describe('registerReadModelEventConsumers', () => {
  it('registers projection handlers for cross-module dashboard events', () => {
    registerReadModelEventConsumers();
    const types = listRegisteredEventTypes();

    expect(types).toContain(STUDENT_EVENT_TYPES.PARENT_LINK_VERIFIED);
    expect(types).toContain(STUDENT_EVENT_TYPES.ENROLLED);
    expect(types).toContain(FINANCE_EVENT_TYPES.paymentVerified);
    expect(types).toContain(ACADEMIC_EVENT_TYPES.termCensusLocked);
  });
});
