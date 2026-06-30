import { describe, expect, it } from 'vitest';

import {
  composeTenantAddress,
  detectEmailDomainTypo,
  formatNigerianPhoneInput,
  formatSchoolName,
  recommendTierCode,
} from './tenant-provision-smart';

describe('tenant-provision-smart', () => {
  it('title-cases school names', () => {
    expect(formatSchoolName('  greenfield   academy ')).toBe('Greenfield Academy');
    expect(formatSchoolName('st. mary international school')).toBe('St. Mary International School');
  });

  it('formats Nigerian phone numbers', () => {
    expect(formatNigerianPhoneInput('08031234567')).toBe('+2348031234567');
    expect(formatNigerianPhoneInput('2348031234567')).toBe('+2348031234567');
    expect(formatNigerianPhoneInput('+2348031234567')).toBe('+2348031234567');
  });

  it('detects common email domain typos', () => {
    expect(detectEmailDomainTypo('owner@gmai.com')).toBe('owner@gmail.com');
    expect(detectEmailDomainTypo('owner@school.ng')).toBeNull();
  });

  it('composes structured addresses', () => {
    expect(
      composeTenantAddress({
        street: '12 Unity Road',
        area: 'GRA',
        lga: 'Ikeja',
        state: 'Lagos',
      }),
    ).toBe('12 Unity Road, GRA, Ikeja, Lagos');
  });

  it('recommends tiers from school profile', () => {
    expect(
      recommendTierCode({ studentBand: 'under_200', needs: 'basic' }),
    ).toBe('core');
    expect(
      recommendTierCode({ studentBand: '501_2000', needs: 'workflows' }),
    ).toBe('advanced');
    expect(
      recommendTierCode({ studentBand: '2000_plus', needs: 'basic' }),
    ).toBe('enterprise');
  });
});
