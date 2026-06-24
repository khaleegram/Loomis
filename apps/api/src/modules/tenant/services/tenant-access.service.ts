import { LoomisError } from '../../../shared/errors.js';
import { tenantRepository } from '../repository/tenant.repository.js';

const SCHOOL_TENANT_ROLES = new Set([
  'school_owner',
  'principal',
  'admin_officer',
  'accountant',
  'cashier',
  'exam_officer',
  'deputy_exam_officer',
  'timetable_officer',
  'teacher',
  'class_teacher',
  'student',
]);

export const tenantAccessService = {
  isSchoolTenantRole(role: string): boolean {
    return SCHOOL_TENANT_ROLES.has(role);
  },

  async activateIfDue(tenantId: string): Promise<boolean> {
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant || tenant.status !== 'provisioning') {
      return false;
    }
    if (tenant.goLiveAt > new Date()) {
      return false;
    }
    const activated = await tenantRepository.activate(tenantId, new Date());
    return activated != null;
  },

  async assertSchoolAccessAllowed(tenantId: string): Promise<void> {
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }
    if (tenant.status === 'suspended') {
      throw new LoomisError('TENANT_SUSPENDED', 403, 'This school is suspended');
    }
    if (tenant.status === 'provisioning') {
      if (tenant.goLiveAt > new Date()) {
        throw new LoomisError(
          'TENANT_NOT_YET_LIVE',
          403,
          'This school is not live yet — log in is available from the scheduled go-live date',
          { goLiveAt: tenant.goLiveAt.toISOString() },
        );
      }
      await this.activateIfDue(tenantId);
    }
  },
};
