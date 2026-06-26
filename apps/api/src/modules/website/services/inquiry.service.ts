import { createHmac } from 'node:crypto';
import type {
  ConvertWebsiteInquiryToAdmissionRequest,
  ConvertWebsiteInquiryToAdmissionResponse,
  SubmitWebsiteInquiryRequest,
  SubmitWebsiteInquiryResponse,
  UpdateWebsiteInquiryRequest,
  WebsiteInquiryListResponse,
  WebsiteInquiryResponse,
} from '@loomis/contracts';
import { getEnv } from '../../../config/env.js';
import { LoomisError } from '../../../shared/errors.js';
import { transactionalEmailService } from '../../comms/services/transactional-email.service.js';
import { admissionService } from '../../student/services/admission.service.js';
import type { ActorContext } from '../../student/types.js';
import { tenantRepository } from '../../tenant/repository/tenant.repository.js';
import { websiteInquiryRepository } from '../repository/inquiry.repository.js';
import { websiteRepository } from '../repository/website.repository.js';
import { websiteService } from './website.service.js';

function hashIp(ip: string): string {
  const secret = getEnv().REFRESH_TOKEN_HMAC_SECRET;
  return createHmac('sha256', secret).update(ip).digest('hex');
}

function serializeInquiry(
  row: Awaited<ReturnType<typeof websiteInquiryRepository.create>>,
): WebsiteInquiryResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    siteId: row.siteId,
    type: row.type as WebsiteInquiryResponse['type'],
    submitterName: row.submitterName,
    submitterEmail: row.submitterEmail,
    submitterPhone: row.submitterPhone,
    message: row.message,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    status: row.status as WebsiteInquiryResponse['status'],
    admissionId: row.admissionId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const websiteInquiryService = {
  async submitPublicInquiry(
    slug: string,
    input: SubmitWebsiteInquiryRequest,
    clientIp: string,
  ): Promise<SubmitWebsiteInquiryResponse> {
    // Honeypot — bots fill hidden fields; return fake success without storing PII.
    if (input.website && input.website.length > 0) {
      return {
        inquiryId: '00000000-0000-0000-0000-000000000000',
        message: 'Thank you. We will be in touch shortly.',
      };
    }

    const site = await websiteRepository.findBySlug(slug.trim().toLowerCase());
    if (!site || site.status !== 'published') {
      throw new LoomisError('WEBSITE_NOT_FOUND', 404, 'School website not found');
    }

    const tenant = await tenantRepository.findById(site.tenantId);
    if (!tenant || tenant.status === 'suspended') {
      throw new LoomisError('WEBSITE_UNAVAILABLE', 403, 'School website is not available');
    }

    const metadata: Record<string, unknown> = {};
    if (input.type === 'admission_interest') {
      if (input.childFirstName) metadata.childFirstName = input.childFirstName;
      if (input.childLastName) metadata.childLastName = input.childLastName;
      if (input.classInterest) metadata.classInterest = input.classInterest;
      metadata.source = 'website';
    }

    const row = await websiteInquiryRepository.create({
      tenantId: site.tenantId,
      siteId: site.id,
      type: input.type,
      submitterName: input.submitterName.trim(),
      submitterEmail: input.submitterEmail.trim().toLowerCase(),
      submitterPhone: input.submitterPhone?.trim() ?? null,
      message: input.message.trim(),
      metadata,
      ipHash: hashIp(clientIp),
    });

    await transactionalEmailService.sendWebsiteInquiryNotificationEmail({
      tenantId: site.tenantId,
      to: tenant.contactEmail,
      schoolName: tenant.name,
      inquiryType: input.type,
      submitterName: input.submitterName,
      submitterEmail: input.submitterEmail,
      submitterPhone: input.submitterPhone ?? null,
      message: input.message,
      ...(input.childFirstName ? { childFirstName: input.childFirstName } : {}),
      ...(input.classInterest ? { classInterest: input.classInterest } : {}),
    });

    return {
      inquiryId: row.id,
      message: 'Thank you. The school will be in touch shortly.',
    };
  },

  async listInquiries(
    tenantId: string,
    status?: string,
  ): Promise<WebsiteInquiryListResponse> {
    await websiteService.ensureSite(tenantId);
    const rows = await websiteInquiryRepository.listByTenant(
      tenantId,
      status ? { status } : undefined,
    );
    const inquiries = rows.map(serializeInquiry);
    return { inquiries, total: inquiries.length };
  },

  async updateInquiryStatus(
    tenantId: string,
    inquiryId: string,
    input: UpdateWebsiteInquiryRequest,
  ): Promise<WebsiteInquiryResponse> {
    const updated = await websiteInquiryRepository.updateStatus(
      tenantId,
      inquiryId,
      input.status,
    );
    if (!updated) {
      throw new LoomisError('NOT_FOUND', 404, 'Enquiry not found');
    }
    return serializeInquiry(updated);
  },

  async convertToAdmission(
    tenantId: string,
    inquiryId: string,
    input: ConvertWebsiteInquiryToAdmissionRequest,
    actor: ActorContext,
  ): Promise<ConvertWebsiteInquiryToAdmissionResponse> {
    const inquiry = await websiteInquiryRepository.findById(tenantId, inquiryId);
    if (!inquiry) {
      throw new LoomisError('NOT_FOUND', 404, 'Enquiry not found');
    }
    if (inquiry.type !== 'admission_interest') {
      throw new LoomisError(
        'VALIDATION_ERROR',
        422,
        'Only admission interest enquiries can be converted to admissions',
      );
    }
    if (inquiry.admissionId) {
      throw new LoomisError(
        'VALIDATION_ERROR',
        409,
        'This enquiry is already linked to an admission record',
      );
    }

    const created = await admissionService.createAdmission(
      tenantId,
      {
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        intendedClassLevelId: input.intendedClassLevelId,
        guardianName: inquiry.submitterName,
        guardianEmail: inquiry.submitterEmail,
        guardianPhone: input.guardianPhone,
        guardianRelationship: input.guardianRelationship,
      },
      actor,
    );

    const linked = await websiteInquiryRepository.linkAdmission(
      tenantId,
      inquiryId,
      created.admission.id,
    );
    if (!linked) {
      throw new LoomisError('NOT_FOUND', 404, 'Enquiry not found');
    }

    return {
      inquiry: serializeInquiry(linked),
      admissionId: created.admission.id,
      referenceNumber: created.admission.referenceNumber,
    };
  },

  async countNewInquiries(tenantId: string): Promise<number> {
    return websiteInquiryRepository.countNew(tenantId);
  },
};
