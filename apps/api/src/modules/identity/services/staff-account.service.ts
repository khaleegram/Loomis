import { randomUUID } from 'node:crypto';
import type { Role } from '@loomis/contracts';
import type { Executor } from '../../../shared/db.js';
import { LoomisError } from '../../../shared/errors.js';
import { userRepository } from '../repository/user.repository.js';
import { MFA_MANDATORY_ROLES } from '../types.js';
import { passwordService } from './password.service.js';

const PENDING_PASSWORD_SENTINEL = 'pending-invitation-password-not-usable';

export const staffAccountService = {
  async createActiveStaffAccount(
    input: {
      tenantId: string;
      email: string;
      phone: string;
      role: Role;
      password: string;
      displayName?: string;
    },
    tx?: Executor,
  ) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new LoomisError('HRM_ROLE_CONFLICT', 409, 'A user with this email already exists');
    }

    const passwordHash = await passwordService.hashProvisioned(input.password);
    return userRepository.create(
      {
        email: input.email,
        phone: input.phone,
        role: input.role,
        tenantId: input.tenantId,
        mfaRequired: MFA_MANDATORY_ROLES.has(input.role),
        status: 'active',
        passwordHash,
        mustChangePassword: true,
        displayName: input.displayName ?? null,
      },
      tx,
    );
  },

  async createPendingStaffAccount(
    input: {
      tenantId: string;
      email: string;
      phone: string;
      role: Role;
      displayName?: string;
    },
    tx?: Executor,
  ) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new LoomisError('HRM_ROLE_CONFLICT', 409, 'A user with this email already exists');
    }

    const passwordHash = await passwordService.hashSecret(
      `${PENDING_PASSWORD_SENTINEL}:${randomUUID()}`,
    );
    return userRepository.create(
      {
        email: input.email,
        phone: input.phone,
        role: input.role,
        tenantId: input.tenantId,
        mfaRequired: MFA_MANDATORY_ROLES.has(input.role),
        status: 'pending',
        passwordHash,
        displayName: input.displayName ?? null,
      },
      tx,
    );
  },

  async activatePendingStaffAccount(userId: string, password: string, tx?: Executor) {
    const passwordHash = await passwordService.hash(password);
    const user = await userRepository.activatePendingUser(userId, passwordHash, tx);
    if (!user) {
      throw new LoomisError('HRM_INVITATION_INVALID', 400, 'Invitation cannot activate this account');
    }
    return user;
  },

  async updateStaffRole(userId: string, role: Role, tx?: Executor) {
    const user = await userRepository.updateRole(userId, role, tx);
    if (!user) {
      throw new LoomisError('HRM_STAFF_NOT_FOUND', 404, 'Staff account not found');
    }
    return user;
  },
};
