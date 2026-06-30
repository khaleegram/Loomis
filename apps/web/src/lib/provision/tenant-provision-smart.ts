import type { TenantResponse } from '@loomis/contracts';
import { RESERVED_SUBDOMAINS, slugifySchoolName } from '@loomis/core';

import { schoolPublicSiteUrl } from '@/lib/website/public-site-url';

const LOWERCASE_WORDS = new Set(['and', 'of', 'the', 'in', 'at', 'for', 'a', 'an', 'on']);

const EMAIL_DOMAIN_TYPOS: Record<string, string> = {
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gnail.com': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahho.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'iclod.com': 'icloud.com',
};

export type StudentBand = 'under_200' | '200_500' | '501_2000' | '2000_plus';
export type SchoolNeedProfile = 'basic' | 'workflows' | 'enterprise';

export const STUDENT_BAND_OPTIONS: { value: StudentBand; label: string; hint: string }[] = [
  { value: 'under_200', label: 'Under 200', hint: 'Small nursery/primary' },
  { value: '200_500', label: '200–500', hint: 'Growing private school' },
  { value: '501_2000', label: '501–2,000', hint: 'Established secondary' },
  { value: '2000_plus', label: '2,000+', hint: 'Large group / multi-campus' },
];

export const SCHOOL_NEED_OPTIONS: { value: SchoolNeedProfile; label: string; hint: string }[] = [
  { value: 'basic', label: 'Run school basics', hint: 'Fees, attendance, results, parent portal' },
  { value: 'workflows', label: 'More control', hint: 'Workflows, deputy exam, finance depth' },
  { value: 'enterprise', label: 'Full platform', hint: 'Large enrollment, enterprise policies' },
];

export function formatSchoolName(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  return trimmed
    .split(' ')
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && LOWERCASE_WORDS.has(lower)) return lower;
      if (word.includes('-')) {
        return word
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join('-');
      }
      if (word.length <= 3 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function normalizeNameKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;

  const aTokens = new Set(a.split(/\s+/).filter(Boolean));
  const bTokens = new Set(b.split(/\s+/).filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  return overlap / Math.max(aTokens.size, bTokens.size);
}

export function findSimilarTenants(name: string, tenants: TenantResponse[]): TenantResponse[] {
  const needle = normalizeNameKey(name);
  if (needle.length < 3) return [];

  return tenants
    .filter((tenant) => {
      const hay = normalizeNameKey(tenant.name);
      if (!hay) return false;
      if (hay === needle) return true;
      return nameSimilarity(hay, needle) >= 0.72;
    })
    .slice(0, 4);
}

export function previewSchoolSlug(name: string): {
  slug: string;
  url: string;
  reserved: boolean;
} {
  const slug = slugifySchoolName(name);
  return {
    slug,
    url: schoolPublicSiteUrl(slug),
    reserved: RESERVED_SUBDOMAINS.has(slug),
  };
}

export function formatNigerianPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('234')) {
    const rest = digits.slice(3, 13);
    return rest ? `+234${rest}` : '+234';
  }

  if (digits.startsWith('0')) {
    const rest = digits.slice(1, 11);
    return rest ? `+234${rest}` : '+234';
  }

  if (digits.length <= 10) {
    return `+234${digits.slice(0, 10)}`;
  }

  return `+234${digits.slice(0, 10)}`;
}

export function isValidNigerianPhone(value: string): boolean {
  return /^\+234[789]\d{9}$/.test(value.trim());
}

export function detectEmailDomainTypo(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0) return null;

  const domain = trimmed.slice(at + 1);
  const suggestion = EMAIL_DOMAIN_TYPOS[domain];
  if (!suggestion) return null;

  const local = trimmed.slice(0, at);
  return `${local}@${suggestion}`;
}

export function composeTenantAddress(parts: {
  street: string;
  area?: string;
  lga: string;
  state: string;
}): string {
  return [parts.street.trim(), parts.area?.trim(), parts.lga.trim(), parts.state.trim()]
    .filter(Boolean)
    .join(', ');
}

export function recommendTierCode(input: {
  studentBand: StudentBand;
  needs: SchoolNeedProfile;
}): 'core' | 'advanced' | 'enterprise' {
  if (input.needs === 'enterprise' || input.studentBand === '2000_plus') return 'enterprise';
  if (input.needs === 'workflows' || input.studentBand === '501_2000') return 'advanced';
  if (input.studentBand === '200_500' && input.needs === 'basic') return 'core';
  if (input.studentBand === 'under_200') return 'core';
  return 'advanced';
}

export function tierRecommendationCopy(tierCode: 'core' | 'advanced' | 'enterprise'): string {
  switch (tierCode) {
    case 'core':
      return 'Best for smaller schools that need fees, attendance, gradebook, and parent portal without extra complexity.';
    case 'advanced':
      return 'Best for mid-size schools that want workflows, deeper finance controls, and deputy exam coverage.';
    case 'enterprise':
      return 'Best for large or multi-campus schools that need the full platform and higher enrollment headroom.';
  }
}
