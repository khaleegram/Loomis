import { describe, expect, it } from 'vitest';
import { effectiveCan, effectiveCapabilities, COMBINED_FINANCE_CAPABILITIES } from './finance-presets.js';

describe('effectiveCapabilities', () => {
  it('grants combined finance preset to accountant in combined mode', () => {
    const caps = effectiveCapabilities('accountant', 'combined');
    for (const cap of COMBINED_FINANCE_CAPABILITIES) {
      expect(caps.has(cap)).toBe(true);
    }
  });

  it('does not grant payment.log to accountant in split mode', () => {
    expect(effectiveCan('accountant', 'payment.log', 'split')).toBe(false);
    expect(effectiveCan('accountant', 'payment.verify', 'split')).toBe(true);
  });

  it('does not grant verify to cashier in split mode', () => {
    expect(effectiveCan('cashier', 'payment.verify', 'split')).toBe(false);
    expect(effectiveCan('cashier', 'payment.log', 'split')).toBe(true);
  });
});
