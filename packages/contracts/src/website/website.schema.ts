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

/**
 * School-chosen site address (becomes {slug}.loomis.digital).
 * Keep this intentionally simple for school admins: one lowercase word, no
 * spaces or punctuation. Existing auto-generated draft slugs may contain
 * hyphens, but user-chosen updates must be clean one-word handles.
 */
export const websiteSlug = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Address must be at least 3 characters')
  .max(30, 'Address must be 30 characters or fewer')
  .regex(
    /^[a-z0-9]+$/,
    'Use one lowercase word only: letters and numbers, no spaces',
  );

export const updateWebsiteSiteRequest = z.object({
  slug: websiteSlug.optional(),
  templateId: websiteTemplateId.optional(),
  theme: websiteTheme.partial().optional(),
  sections: websiteSections.optional(),
  seo: websiteSeo.partial().optional(),
});
export type UpdateWebsiteSiteRequest = z.infer<typeof updateWebsiteSiteRequest>;

export const checkWebsiteSlugResponse = z.object({
  slug: z.string(),
  available: z.boolean(),
  reason: z.enum(['ok', 'taken', 'reserved', 'invalid']),
});
export type CheckWebsiteSlugResponse = z.infer<typeof checkWebsiteSlugResponse>;

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

// ── Website inquiries (Phase 2) ───────────────────────────────────────────────

export const websiteInquiryType = z.enum(['contact', 'admission_interest']);
export type WebsiteInquiryType = z.infer<typeof websiteInquiryType>;

export const websiteInquiryStatus = z.enum(['new', 'read', 'archived']);
export type WebsiteInquiryStatus = z.infer<typeof websiteInquiryStatus>;

const optionalWebsiteText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().max(max).optional(),
  );

export const submitWebsiteInquiryRequest = z.object({
  type: websiteInquiryType,
  submitterName: z.string().min(2).max(200),
  submitterEmail: z.string().email().max(255),
  submitterPhone: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().min(7).max(20).optional(),
  ),
  message: z.string().min(10).max(2000),
  /** Honeypot — must be empty; bots fill this field. */
  website: z.string().optional(),
  childFirstName: optionalWebsiteText(100),
  childLastName: optionalWebsiteText(100),
  classInterest: optionalWebsiteText(200),
});
export type SubmitWebsiteInquiryRequest = z.infer<typeof submitWebsiteInquiryRequest>;

export const websiteInquiryResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  siteId: z.string().uuid(),
  type: websiteInquiryType,
  submitterName: z.string(),
  submitterEmail: z.string().email(),
  submitterPhone: z.string().nullable(),
  message: z.string(),
  metadata: z.record(z.unknown()),
  status: websiteInquiryStatus,
  admissionId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type WebsiteInquiryResponse = z.infer<typeof websiteInquiryResponse>;

export const submitWebsiteInquiryResponse = z.object({
  inquiryId: z.string().uuid(),
  message: z.string(),
});
export type SubmitWebsiteInquiryResponse = z.infer<typeof submitWebsiteInquiryResponse>;

export const websiteInquiryListResponse = z.object({
  inquiries: z.array(websiteInquiryResponse),
  total: z.number().int(),
});
export type WebsiteInquiryListResponse = z.infer<typeof websiteInquiryListResponse>;

export const updateWebsiteInquiryRequest = z.object({
  status: websiteInquiryStatus,
});
export type UpdateWebsiteInquiryRequest = z.infer<typeof updateWebsiteInquiryRequest>;
