import { randomBytes } from 'node:crypto';
import type { EmailDeliveryResult } from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { staffRepository } from '../../hrm/repository/staff.repository.js';
import { staffAccountService } from '../../identity/services/staff-account.service.js';
import { passwordService } from '../../identity/services/password.service.js';
import { userRepository } from '../../identity/repository/user.repository.js';
import { transactionalEmailService } from '../../comms/services/transactional-email.service.js';
import { configurationRepository } from '../repository/configuration.repository.js';
import { tenantRepository } from '../repository/tenant.repository.js';
import { TENANT_OWNER_SETUP_EMAIL_SENT_KEY } from '../constants.js';
import type { ActorContext } from '../types.js';

function generateTemporaryPassword(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

function deriveOwnerDisplayName(schoolName: string): string {
  const trimmed = schoolName.trim();
  if (!trimmed) return 'School Owner';
  return `${trimmed} Owner`;
}

async function findOwnerProfile(tenantId: string) {
  const owners = await staffRepository.findActiveUserIdsByRole(tenantId, 'school_owner');
  if (owners.length === 0) return null;
  const primary = owners[0]!;
  return staffRepository.findProfileByUserId(tenantId, primary.userId);
}

export const tenantOwnerService = {
  async getSetupEmailSentAt(tenantId: string): Promise<string | null> {
    const config = await configurationRepository.findByKey(
      tenantId,
      TENANT_OWNER_SETUP_EMAIL_SENT_KEY,
    );
    if (!config?.value || typeof config.value !== 'string') return null;
    return config.value;
  },

  async recordSetupEmailSent(tenantId: string, sentAt: Date): Promise<void> {
    await configurationRepository.upsert(tenantId, {
      key: TENANT_OWNER_SETUP_EMAIL_SENT_KEY,
      value: sentAt.toISOString(),
    });
  },

  /**
   * Creates the School Owner account and sends the welcome/setup email (US-PLT-001).
   * Idempotent when an owner already exists — only resends if explicitly requested.
   */
  async provisionOwner(
    input: {
      tenantId: string;
      schoolName: string;
      contactEmail: string;
      contactPhone: string;
    },
    actor: ActorContext,
  ): Promise<{ ownerUserId: string; temporaryPassword: string; email: EmailDeliveryResult }> {
    const email = input.contactEmail.toLowerCase();
    const existingOwner = await findOwnerProfile(input.tenantId);

    if (existingOwner) {
      throw new LoomisError(
        'TENANT_OWNER_ALREADY_EXISTS',
        409,
        'This school already has a School Owner account',
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const fullName = deriveOwnerDisplayName(input.schoolName);

    const user = await staffAccountService.createActiveStaffAccount({
      tenantId: input.tenantId,
      email,
      phone: input.contactPhone,
      role: 'school_owner',
      password: temporaryPassword,
      displayName: fullName,
    });

    await staffRepository.createStaffProfile({
      profile: {
        tenantId: input.tenantId,
        userId: user.id,
        fullName,
        email,
        phone: input.contactPhone,
        status: 'active',
        joinedAt: new Date(),
        createdById: actor.userId,
      },
      roleAssignment: {
        tenantId: input.tenantId,
        role: 'school_owner',
        assignmentType: 'primary',
        approvedById: actor.userId,
      },
    });

    const emailResult = await transactionalEmailService.sendSchoolOwnerWelcomeEmail({
      tenantId: input.tenantId,
      userId: user.id,
      to: email,
      fullName,
      schoolName: input.schoolName,
      loginEmail: email,
      temporaryPassword,
    });

    if (emailResult.sent) {
      await this.recordSetupEmailSent(input.tenantId, new Date());
    }

    return { ownerUserId: user.id, temporaryPassword, email: emailResult };
  },

  /** Resets the owner password and resends the setup email to the current owner. */
  async resendSetupEmail(
    tenantId: string,
    actor: ActorContext,
  ): Promise<{ setupEmailSentAt: string; email: EmailDeliveryResult }> {
    const ownerProfile = await findOwnerProfile(tenantId);
    if (!ownerProfile) {
      throw new LoomisError(
        'TENANT_OWNER_NOT_FOUND',
        404,
        'No School Owner account exists for this tenant — provision one first',
      );
    }

    const user = await userRepository.findById(ownerProfile.userId);
    if (!user) {
      throw new LoomisError('TENANT_OWNER_NOT_FOUND', 404, 'School Owner user record not found');
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await passwordService.hashProvisioned(temporaryPassword);
    await userRepository.resetToTemporaryPassword(user.id, passwordHash);

    const tenant = await tenantRepository.findById(tenantId);
    const schoolName = tenant?.name ?? 'your school';
    const emailResult = await transactionalEmailService.sendSchoolOwnerWelcomeEmail({
      tenantId,
      userId: user.id,
      to: ownerProfile.email,
      fullName: ownerProfile.fullName,
      schoolName,
      loginEmail: ownerProfile.email,
      temporaryPassword,
    });

    const sentAt = new Date();
    if (emailResult.sent) {
      await this.recordSetupEmailSent(tenantId, sentAt);
    }

    return { setupEmailSentAt: sentAt.toISOString(), email: emailResult };
  },

  async getOwnerSetupStatus(tenantId: string): Promise<{
    hasOwnerAccount: boolean;
    ownerEmail: string | null;
    setupEmailSentAt: string | null;
  }> {
    const ownerProfile = await findOwnerProfile(tenantId);
    const setupEmailSentAt = await this.getSetupEmailSentAt(tenantId);
    return {
      hasOwnerAccount: Boolean(ownerProfile),
      ownerEmail: ownerProfile?.email ?? null,
      setupEmailSentAt,
    };
  },
};
