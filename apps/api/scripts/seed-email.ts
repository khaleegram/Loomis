/**
 * Dev seed email convention — mirrors how schools are identified in prod:
 *   `{roleLocal}@{schoolSlug}.loomis.com`
 *
 * Platform / regional (no tenant): `{local}@platform.loomis.com`
 */
export const LOOMIS_DEV_ROOT = 'loomis.com';

export const ADVANCED_SCHOOL_SLUG = 'advanced';
export const ENTERPRISE_SCHOOL_SLUG = 'enterprise';
export const GREENFIELD_SCHOOL_SLUG = 'greenfield';

export function platformDevEmail(localPart: string): string {
  return `${localPart}@platform.${LOOMIS_DEV_ROOT}`;
}

export function schoolDevEmail(localPart: string, schoolSlug: string): string {
  return `${localPart}@${schoolSlug}.${LOOMIS_DEV_ROOT}`;
}

export function schoolContactEmail(schoolSlug: string): string {
  return `contact@${schoolSlug}.${LOOMIS_DEV_ROOT}`;
}
