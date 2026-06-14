import {
  SCHOOL_BRANDING_CONFIG_KEY,
  schoolBrandingConfig,
  type SchoolBrandingResponse,
  type UpdateSchoolBrandingRequest,
} from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { storageRepository } from '../../storage/repository/storage.repository.js';
import { configurationRepository } from '../repository/configuration.repository.js';
import { tenantRepository } from '../repository/tenant.repository.js';

const EMPTY_BRANDING: UpdateSchoolBrandingRequest = { logoStorageObjectId: null };

function parseBrandingValue(value: unknown): UpdateSchoolBrandingRequest {
  const parsed = schoolBrandingConfig.safeParse(value);
  return parsed.success ? parsed.data : EMPTY_BRANDING;
}

async function assertLogoOwnership(tenantId: string, logoStorageObjectId: string): Promise<void> {
  const record = await storageRepository.findById(tenantId, logoStorageObjectId);
  if (!record) {
    throw new LoomisError('STORAGE_OBJECT_NOT_FOUND', 404, 'Logo file not found');
  }
  if (record.ownerResourceType !== 'tenant_logo' || record.ownerResourceId !== tenantId) {
    throw new LoomisError('FORBIDDEN', 403, 'Logo file does not belong to this school');
  }
  if (record.status !== 'available') {
    throw new LoomisError('STORAGE_OBJECT_NOT_AVAILABLE', 409, 'Logo file is not ready yet');
  }
}

export const brandingService = {
  async getBranding(tenantId: string): Promise<SchoolBrandingResponse> {
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'School not found');
    }

    const config = await configurationRepository.findByKey(tenantId, SCHOOL_BRANDING_CONFIG_KEY);
    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      branding: parseBrandingValue(config?.value),
    };
  },

  async updateBranding(
    tenantId: string,
    input: UpdateSchoolBrandingRequest,
  ): Promise<SchoolBrandingResponse> {
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'School not found');
    }

    if (input.logoStorageObjectId) {
      await assertLogoOwnership(tenantId, input.logoStorageObjectId);
    }

    await configurationRepository.upsert(tenantId, {
      key: SCHOOL_BRANDING_CONFIG_KEY,
      value: input,
    });

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      branding: input,
    };
  },
};
