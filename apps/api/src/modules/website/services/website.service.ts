import {
  type WebsiteSection,
  type WebsiteSeo,
  type WebsiteTheme,
  websiteSections,
  websiteSeo,
  websiteTheme,
  type PublicWebsiteSiteResponse,
  type WebsiteSiteResponse,
  type UpdateWebsiteSiteRequest,
  type CheckWebsiteSlugResponse,
  SCHOOL_BRANDING_CONFIG_KEY,
  schoolBrandingConfig,
  websiteSlug,
} from '@loomis/contracts';
import { publicSchoolSiteUrl, RESERVED_SUBDOMAINS, slugifySchoolName } from '@loomis/core';
import { uuidv7 } from 'uuidv7';
import { getEnv } from '../../../config/env.js';
import { writeAudit } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { storageRepository } from '../../storage/repository/storage.repository.js';
import { s3PresignService } from '../../storage/services/s3.client.js';
import { configurationRepository } from '../../tenant/repository/configuration.repository.js';
import { tenantRepository } from '../../tenant/repository/tenant.repository.js';
import { websiteRepository, type WebsiteSiteRow } from '../repository/website.repository.js';

const DEFAULT_THEME: WebsiteTheme = {
  primaryColor: '#c9a96e',
  accentColor: '#1a1a2e',
  fontStyle: 'modern',
};

const DEFAULT_SEO: WebsiteSeo = {
  title: null,
  description: null,
  ogImageStorageObjectId: null,
};

function parseTheme(value: unknown): WebsiteTheme {
  const parsed = websiteTheme.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_THEME;
}

function parseSeo(value: unknown): WebsiteSeo {
  const parsed = websiteSeo.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_SEO;
}

function parseSections(value: unknown): WebsiteSection[] {
  const parsed = websiteSections.safeParse(value);
  return parsed.success ? parsed.data : [];
}

function buildDefaultSections(schoolName: string, address: string): WebsiteSection[] {
  return [
    {
      id: uuidv7(),
      type: 'hero',
      enabled: true,
      order: 0,
      props: {
        headline: schoolName,
        subheadline: 'Welcome to our school community',
        ctaLabel: 'Admissions',
        ctaHref: '#admissions',
      },
    },
    {
      id: uuidv7(),
      type: 'about',
      enabled: true,
      order: 1,
      props: {
        title: 'About Us',
        body: `We are committed to excellence in education and character development.\n\n${address}`,
      },
    },
    {
      id: uuidv7(),
      type: 'admissions_cta',
      enabled: true,
      order: 2,
      props: {
        title: 'Join Our School',
        body: 'We welcome new families every term. Contact us to learn about our admission process.',
        buttonLabel: 'Enquire Now',
      },
    },
    {
      id: uuidv7(),
      type: 'contact',
      enabled: true,
      order: 3,
      props: {
        showMap: false,
        showPhone: true,
        showEmail: true,
        formEnabled: false,
      },
    },
    {
      id: uuidv7(),
      type: 'parent_portal_cta',
      enabled: true,
      order: 4,
      props: {
        title: 'Parents',
        body: 'Access fees, attendance, and school updates through the Loomis parent portal.',
      },
    },
  ];
}

async function resolveUniqueSlug(baseName: string): Promise<string> {
  let slug = slugifySchoolName(baseName);
  let suffix = 2;
  while (await websiteRepository.slugExists(slug)) {
    slug = `${slugifySchoolName(baseName)}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

function collectStorageObjectIds(sections: WebsiteSection[], seo: WebsiteSeo): string[] {
  const ids = new Set<string>();
  if (seo.ogImageStorageObjectId) ids.add(seo.ogImageStorageObjectId);

  for (const section of sections) {
    const props = section.props as Record<string, unknown>;
    if (typeof props.backgroundStorageObjectId === 'string') {
      ids.add(props.backgroundStorageObjectId);
    }
    if (typeof props.imageStorageObjectId === 'string') {
      ids.add(props.imageStorageObjectId);
    }
    if (typeof props.photoStorageObjectId === 'string') {
      ids.add(props.photoStorageObjectId);
    }
    if (Array.isArray(props.images)) {
      for (const img of props.images) {
        if (img && typeof img === 'object' && typeof (img as { storageObjectId?: string }).storageObjectId === 'string') {
          ids.add((img as { storageObjectId: string }).storageObjectId);
        }
      }
    }
  }
  return [...ids];
}

async function resolvePublicAssets(
  tenantId: string,
  storageObjectIds: string[],
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};
  for (const objectId of storageObjectIds) {
    const record = await storageRepository.findById(tenantId, objectId);
    if (!record || record.status !== 'available' || record.classification !== 'public_tenant') {
      continue;
    }
    const downloadUrl = await s3PresignService.createGetUrl({
      bucket: record.bucket,
      objectKey: record.objectKey,
    });
    resolved[objectId] = downloadUrl;
  }
  return resolved;
}

function toSiteResponse(row: WebsiteSiteRow, publishedVersion: number | null): WebsiteSiteResponse {
  const env = getEnv();
  return {
    id: row.id,
    tenantId: row.tenantId,
    slug: row.slug,
    status: row.status as WebsiteSiteResponse['status'],
    templateId: row.templateId as WebsiteSiteResponse['templateId'],
    theme: parseTheme(row.theme),
    sections: parseSections(row.sections),
    seo: parseSeo(row.seo),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    publishedVersion,
    publicUrl: publicSchoolSiteUrl(row.slug, {
      mode: env.PUBLIC_SITE_URL_MODE,
      apexDomain: env.PUBLIC_SITE_APEX_DOMAIN,
      pathBaseUrl: env.PUBLIC_SITE_BASE_URL,
    }),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const websiteService = {
  async ensureSite(tenantId: string): Promise<WebsiteSiteRow> {
    const existing = await websiteRepository.findByTenantId(tenantId);
    if (existing) return existing;

    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'School not found');
    }

    const slug = await resolveUniqueSlug(tenant.name);
    return websiteRepository.create({
      tenantId,
      slug,
      templateId: 'prestige',
      theme: DEFAULT_THEME,
      sections: buildDefaultSections(tenant.name, tenant.address),
      seo: { ...DEFAULT_SEO, title: tenant.name },
    });
  },

  async getSite(tenantId: string): Promise<WebsiteSiteResponse> {
    const site = await this.ensureSite(tenantId);
    let publishedVersion: number | null = null;
    if (site.publishedSnapshotId) {
      const snapshot = await websiteRepository.findSnapshotById(
        tenantId,
        site.publishedSnapshotId,
      );
      publishedVersion = snapshot?.version ?? null;
    }
    return toSiteResponse(site, publishedVersion);
  },

  async checkSlug(tenantId: string, candidate: string): Promise<CheckWebsiteSlugResponse> {
    const parsed = websiteSlug.safeParse(candidate);
    if (!parsed.success) {
      return { slug: candidate, available: false, reason: 'invalid' };
    }
    const slug = parsed.data;
    if (RESERVED_SUBDOMAINS.has(slug)) {
      return { slug, available: false, reason: 'reserved' };
    }
    const site = await websiteRepository.findByTenantId(tenantId);
    if (await websiteRepository.slugExists(slug, site?.id)) {
      return { slug, available: false, reason: 'taken' };
    }
    return { slug, available: true, reason: 'ok' };
  },

  /** Validates a requested slug change; throws on conflict/reserved. */
  async resolveSlugChange(
    site: WebsiteSiteRow,
    requested: string | undefined,
  ): Promise<string | undefined> {
    if (requested === undefined) return undefined;
    const parsed = websiteSlug.safeParse(requested);
    if (!parsed.success) {
      throw new LoomisError(
        'VALIDATION_ERROR',
        422,
        'Use one lowercase word only: letters and numbers, no spaces.',
      );
    }
    const slug = parsed.data;
    if (slug === site.slug) return undefined;
    if (RESERVED_SUBDOMAINS.has(slug)) {
      throw new LoomisError(
        'WEBSITE_SLUG_RESERVED',
        422,
        'That address is reserved. Please choose another.',
      );
    }
    if (await websiteRepository.slugExists(slug, site.id)) {
      throw new LoomisError(
        'WEBSITE_SLUG_TAKEN',
        409,
        'That address is already taken by another school. Please choose another.',
      );
    }
    return slug;
  },

  async updateSite(
    tenantId: string,
    input: UpdateWebsiteSiteRequest,
    actorUserId: string,
  ): Promise<WebsiteSiteResponse> {
    const site = await this.ensureSite(tenantId);
    const theme = input.theme ? { ...parseTheme(site.theme), ...input.theme } : parseTheme(site.theme);
    const seo = input.seo ? { ...parseSeo(site.seo), ...input.seo } : parseSeo(site.seo);
    const sections = input.sections ?? parseSections(site.sections);
    const nextSlug = await this.resolveSlugChange(site, input.slug);

    const updated = await websiteRepository.updateDraft(tenantId, site.id, {
      ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
      ...(input.templateId !== undefined ? { templateId: input.templateId } : {}),
      theme,
      seo,
      sections,
    });
    if (!updated) {
      throw new LoomisError('WEBSITE_NOT_FOUND', 404, 'Website not found');
    }

    await writeAudit({
      tenantId,
      actorUserId,
      action: 'website.draft.updated',
      resourceType: 'website_site',
      resourceId: site.id,
      sensitivity: 'standard',
      result: 'success',
      requestId: uuidv7(),
      metadata: {
        templateId: updated.templateId,
        sectionCount: sections.length,
        ...(nextSlug !== undefined ? { slugChanged: true } : {}),
      },
    });

    return this.getSite(tenantId);
  },

  async publishSite(tenantId: string, actorUserId: string): Promise<{ site: WebsiteSiteResponse; version: number }> {
    const site = await this.ensureSite(tenantId);
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant || tenant.status === 'suspended') {
      throw new LoomisError('TENANT_SUSPENDED', 403, 'School website cannot be published while suspended');
    }

    const theme = parseTheme(site.theme);
    const seo = parseSeo(site.seo);
    const sections = parseSections(site.sections);
    const nextVersion = (await websiteRepository.latestSnapshotVersion(tenantId, site.id)) + 1;
    const publishedAt = new Date();

    const snapshot = await withTenantContext(tenantId, async (tx) => {
      const created = await websiteRepository.createSnapshot(
        tenantId,
        {
          siteId: site.id,
          version: nextVersion,
          templateId: site.templateId,
          theme,
          sections,
          seo,
          publishedById: actorUserId,
        },
        tx,
      );
      await websiteRepository.setPublished(
        tenantId,
        site.id,
        created.id,
        actorUserId,
        publishedAt,
        tx,
      );
      return created;
    });

    await writeAudit({
      tenantId,
      actorUserId,
      action: 'website.published',
      resourceType: 'website_site',
      resourceId: site.id,
      sensitivity: 'standard',
      result: 'success',
      requestId: uuidv7(),
      metadata: { version: snapshot.version },
    });

    const refreshed = await this.getSite(tenantId);
    return { site: refreshed, version: snapshot.version };
  },

  async unpublishSite(tenantId: string, actorUserId: string): Promise<WebsiteSiteResponse> {
    const site = await this.ensureSite(tenantId);
    const updated = await websiteRepository.setUnpublished(tenantId, site.id);
    if (!updated) {
      throw new LoomisError('WEBSITE_NOT_FOUND', 404, 'Website not found');
    }

    await writeAudit({
      tenantId,
      actorUserId,
      action: 'website.unpublished',
      resourceType: 'website_site',
      resourceId: site.id,
      sensitivity: 'standard',
      result: 'success',
      requestId: uuidv7(),
    });

    return this.getSite(tenantId);
  },

  async getPublicSite(slug: string): Promise<PublicWebsiteSiteResponse> {
    const normalized = slug.trim().toLowerCase();
    const site = await websiteRepository.findBySlug(normalized);
    if (!site || site.status !== 'published' || !site.publishedSnapshotId) {
      throw new LoomisError('WEBSITE_NOT_FOUND', 404, 'School website not found');
    }

    const tenant = await tenantRepository.findById(site.tenantId);
    if (!tenant || tenant.status === 'suspended') {
      throw new LoomisError('WEBSITE_UNAVAILABLE', 403, 'School website is not available');
    }

    const snapshot = await websiteRepository.findSnapshotByIdPublic(site.publishedSnapshotId);
    if (!snapshot) {
      throw new LoomisError('WEBSITE_NOT_FOUND', 404, 'School website not found');
    }

    const theme = parseTheme(snapshot.theme);
    const seo = parseSeo(snapshot.seo);
    const sections = parseSections(snapshot.sections);

    const brandingConfig = await configurationRepository.findByKey(
      site.tenantId,
      SCHOOL_BRANDING_CONFIG_KEY,
    );
    const branding = schoolBrandingConfig.safeParse(brandingConfig?.value);
    const logoId = branding.success ? branding.data.logoStorageObjectId : null;

    const assetIds = collectStorageObjectIds(sections, seo);
    if (logoId) assetIds.push(logoId);

    const resolvedAssets = await resolvePublicAssets(site.tenantId, assetIds);

    return {
      slug: site.slug,
      schoolName: tenant.name,
      templateId: snapshot.templateId as PublicWebsiteSiteResponse['templateId'],
      theme,
      sections,
      seo: { ...seo, title: seo.title ?? tenant.name },
      contact: {
        email: tenant.contactEmail,
        phone: tenant.contactPhone ?? null,
        address: tenant.address,
      },
      logoUrl: logoId ? (resolvedAssets[logoId] ?? null) : null,
      resolvedAssets,
      publishedAt: snapshot.createdAt.toISOString(),
    };
  },
};
