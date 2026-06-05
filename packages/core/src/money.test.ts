import { describe, expect, it } from 'vitest';
import { formatKobo, koboToNaira, nairaToKobo } from './money.js';

describe('money', () => {
  it('converts naira to kobo as integers', () => {
    expect(nairaToKobo(10000)).toBe(1_000_000);
    expect(nairaToKobo(250.5)).toBe(25_050);
  });

  it('converts kobo back to naira', () => {
    expect(koboToNaira(1_000_000)).toBe(10000);
  });

  it('formats kobo with the naira symbol and grouping', () => {
    expect(formatKobo(1_000_000)).toContain('10,000.00');
  });
});
