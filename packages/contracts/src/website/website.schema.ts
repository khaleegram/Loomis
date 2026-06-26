import { z } from 'zod';

/** Template identifiers for school public websites. */
export const websiteTemplateId = z.enum(['prestige', 'bright_start', 'academic_trust']);
export type WebsiteTemplateId = z.infer<typeof websiteTemplateId>;

export const websiteSiteStatus = z.enum(['draft', 'published', 'unpublished']);
export type WebsiteSiteStatus = z.infer<typeof websiteSiteStatus>;

export const websiteSectionType = z.enum([
  'hero',
  'about',
  'principal_welcome',
  'admissions_cta',
  'gallery',
  'faq',
  'contact',
  'whatsapp_cta',
  'parent_portal_cta',
]);
export type WebsiteSectionType = z.infer<typeof websiteSectionType>;

export const websiteTheme = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#c9a96e'),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#1a1a2e'),
  fontStyle: z.enum(['modern', 'classic', 'friendly']).default('modern'),
});
export type WebsiteTheme = z.infer<typeof websiteTheme>;

export const websiteSeo = z.object({
  title: z.string().max(120).nullable().default(null),
  description: z.string().max(320).nullable().default(null),
  ogImageStorageObjectId: z.string().uuid().nullable().default(null),
});
export type WebsiteSeo = z.infer<typeof websiteSeo>;

export const websiteSection = z.object({
  id: z.string().uuid(),
  type: websiteSectionType,
  enabled: z.boolean(),
  order: z.number().int().nonnegative(),
  props: z.record(z.unknown()),
});
export type WebsiteSection = z.infer<typeof websiteSection>;

export const websiteSections = z.array(websiteSection).max(24);

export const updateWebsiteSiteRequest = z.object({
  templateId: websiteTemplateId.optional(),
  theme: websiteTheme.partial().optional(),
  sections: websiteSections.optional(),
  seo: websiteSeo.partial().optional(),
});
export type UpdateWebsiteSiteRequest = z.infer<typeof updateWebsiteSiteRequest>;

export const websiteSiteResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  slug: z.string(),
  status: websiteSiteStatus,
  templateId: websiteTemplateId,
  theme: websiteTheme,
  sections: websiteSections,
  seo: websiteSeo,
  publishedAt: z.string().datetime().nullable(),
  publishedVersion: z.number().int().nullable(),
  publicUrl: z.string().url(),
  updatedAt: z.string().datetime(),
});
export type WebsiteSiteResponse = z.infer<typeof websiteSiteResponse>;

export const websitePublishResponse = z.object({
  site: websiteSiteResponse,
  version: z.number().int(),
  publishedAt: z.string().datetime(),
});
export type WebsitePublishResponse = z.infer<typeof websitePublishResponse>;

export const publicWebsiteContact = z.object({
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
});
export type PublicWebsiteContact = z.infer<typeof publicWebsiteContact>;

export const publicWebsiteSiteResponse = z.object({
  slug: z.string(),
  schoolName: z.string(),
  templateId: websiteTemplateId,
  theme: websiteTheme,
  sections: websiteSections,
  seo: websiteSeo,
  contact: publicWebsiteContact,
  logoUrl: z.string().url().nullable(),
  resolvedAssets: z.record(z.string().url()),
  publishedAt: z.string().datetime(),
});
export type PublicWebsiteSiteResponse = z.infer<typeof publicWebsiteSiteResponse>;
