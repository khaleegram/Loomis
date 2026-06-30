import { uuidv7 } from 'uuidv7';
import { LoomisError } from '../../../shared/errors.js';
import { studentRepository } from '../../student/repository/student.repository.js';
import type { ActorContext } from '../../student/types.js';
import { tenantRepository } from '../../tenant/repository/tenant.repository.js';
import { createNombaVirtualAccount, isNombaConfigured } from '../gateway/index.js';
import { virtualAccountRepository } from '../repository/virtual-account.repository.js';

function buildAccountRef(studentId: string): string {
  return `loomis-${studentId.replace(/-/g, '')}`;
}

function buildAccountDisplayName(studentName: string, schoolName: string): string {
  const label = `Loomis ${studentName}`.slice(0, 80);
  return schoolName ? `${label} (${schoolName})`.slice(0, 120) : label;
}

export const virtualAccountService = {
  isEnabled(): boolean {
    return isNombaConfigured();
  },

  async ensureForStudent(
    tenantId: string,
    studentId: string,
    actor: ActorContext,
  ): Promise<{
    studentId: string;
    accountNumber: string;
    bankName: string;
    accountName: string;
    accountRef: string;
    provider: 'nomba';
  }> {
    if (!isNombaConfigured()) {
      throw new LoomisError(
        'FINANCE_GATEWAY_NOT_CONFIGURED',
        503,
        'Nomba virtual accounts are not configured on this server',
      );
    }

    if (actor.role === 'parent') {
      const linked = await studentRepository.hasActiveParentLink(tenantId, actor.userId, studentId);
      if (!linked) {
        throw new LoomisError('FORBIDDEN', 403, 'You are not linked to this student in this school');
      }
    }

    const existing = await virtualAccountRepository.findByStudent(tenantId, studentId);
    if (existing) {
      return {
        studentId,
        accountNumber: existing.accountNumber,
        bankName: existing.bankName,
        accountName: existing.accountName,
        accountRef: existing.accountRef,
        provider: 'nomba',
      };
    }

    const student = await studentRepository.findStudentById(tenantId, studentId);
    if (!student) {
      throw new LoomisError('STUDENT_NOT_FOUND', 404, 'Student not found');
    }

    const tenant = await tenantRepository.findById(tenantId);
    const studentName = `${student.firstName} ${student.lastName}`.trim();
    const accountRef = buildAccountRef(studentId);
    const accountName = buildAccountDisplayName(studentName, tenant?.name ?? 'School');

    const created = await createNombaVirtualAccount({ accountRef, accountName });
    const row = await virtualAccountRepository.insert({
      id: uuidv7(),
      tenantId,
      studentId,
      accountRef: created.accountRef,
      accountNumber: created.accountNumber,
      bankName: created.bankName,
      accountName: created.accountName,
      nombaAccountHolderId: created.accountHolderId,
    });

    return {
      studentId,
      accountNumber: row.accountNumber,
      bankName: row.bankName,
      accountName: row.accountName,
      accountRef: row.accountRef,
      provider: 'nomba',
    };
  },
};
