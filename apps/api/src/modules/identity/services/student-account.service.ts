import type { Executor } from '../../../shared/db.js';
import { LoomisError } from '../../../shared/errors.js';
import { userRepository } from '../repository/user.repository.js';
import { passwordService } from './password.service.js';
import { buildStudentPortalEmail } from './provisioned-password.service.js';

export const studentAccountService = {
  async createPortalAccount(
    input: {
      tenantId: string;
      admissionNo: string;
      password: string;
      displayName?: string;
    },
    tx?: Executor,
  ) {
    const loginEmail = buildStudentPortalEmail(input.tenantId, input.admissionNo);
    const existing = await userRepository.findByEmail(loginEmail);
    if (existing) {
      throw new LoomisError(
        'STUDENT_PORTAL_EMAIL_CONFLICT',
        409,
        'A portal account already exists for this admission number',
      );
    }

    const passwordHash = await passwordService.hashProvisioned(input.password);
    const user = await userRepository.create(
      {
        email: loginEmail,
        role: 'student',
        tenantId: input.tenantId,
        mfaRequired: false,
        status: 'active',
        passwordHash,
        mustChangePassword: true,
        displayName: input.displayName ?? null,
      },
      tx,
    );

    return { user, loginEmail };
  },
};
