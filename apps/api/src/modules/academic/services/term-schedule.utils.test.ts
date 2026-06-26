import { describe, expect, it } from 'vitest';

import {
  pickTermSequenceToOpen,
  splitYearIntoTermSchedules,
  termScheduleToConfigureInput,
} from './term-schedule.utils.js';

describe('splitYearIntoTermSchedules', () => {
  it('splits a school year into three contiguous terms', () => {
    const segments = splitYearIntoTermSchedules('2025-09-01', '2026-07-31', 3);
    expect(segments).toHaveLength(3);
    expect(segments[0]!.name).toBe('First Term');
    expect(segments[0]!.startDate).toBe('2025-09-01');
    expect(segments[2]!.endDate).toBe('2026-07-31');
    expect(segments[1]!.startDate > segments[0]!.endDate).toBe(true);
  });
});

describe('termScheduleToConfigureInput', () => {
  it('sets enrollment and billing dates within the term', () => {
    const segment = {
      sequence: 1,
      name: 'First Term',
      startDate: '2025-09-01',
      endDate: '2025-12-15',
    };
    const config = termScheduleToConfigureInput(segment);
    expect(config.enrollmentWindowOpenDate).toBe('2025-09-01');
    expect(config.censusSnapshotDate <= config.endDate).toBe(true);
    expect(config.censusSnapshotDate >= config.startDate).toBe(true);
  });
});

describe('pickTermSequenceToOpen', () => {
  const segments = splitYearIntoTermSchedules('2025-09-01', '2026-07-31', 3);

  it('opens first term before the year starts', () => {
    expect(pickTermSequenceToOpen(segments, '2025-08-01')).toBe(1);
  });

  it('opens the term that contains today', () => {
    expect(pickTermSequenceToOpen(segments, segments[1]!.startDate)).toBe(2);
  });
});
