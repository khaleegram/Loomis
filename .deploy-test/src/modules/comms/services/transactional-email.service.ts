import type { EmailDeliveryResult } from '@loomis/contracts';
import { COMMS_EVENT_TYPES } from '@loomis/contracts';
import { getEnv } from '../../../config/env.js';
import { isSesConfigured, sendEmail } from '../gateways/ses.gateway.js';
import { commsOutboxRepository } from '../repository/outbox.repository.js';

function webAppBaseUrl(): string {
  const env = getEnv();
  if (env.WEB_APP_BASE_URL) return env.WEB_APP_BASE_URL.replace(/\/$/, '');
  if (env.PAYMENT_REDIRECT_BASE_URL) {
    try {
      const url = new URL(env.PAYMENT_REDIRECT_BASE_URL);
      return url.origin;
    } catch {
      // fall through
    }
  }
  return 'http://localhost:3000';
}

function loginUrl(): string {
  return `${webAppBaseUrl()}/login`;
}

function buildStaffCredentialsEmail(input: {
  fullName: string;
  loginEmail: string;
  temporaryPassword: string;
}): { subject: string; body: string } {
  return {
    subject: 'Your Loomis staff account is ready',
    body: [
      `Hello ${input.fullName},`,
      '',
      'Your school administrator created a Loomis account for you.',
      '',
      'Sign in here:',
      loginUrl(),
      '',
      'Login email:',
      input.loginEmail,
      '',
      'Temporary password:',
      input.temporaryPassword,
      '',
      'You must choose a new password when you sign in for the first time.',
      '',
      'If you did not expect this message, contact your school administrator.',
    ].join('\n'),
  };
}

function buildAdmissionOfferLetterEmail(input: {
  guardianName: string;
  studentFirstName: string;
  studentLastName: string;
  schoolName: string;
  intendedClassName: string;
  admissionNo: string;
}): { subject: string; body: string } {
  const studentName = `${input.studentFirstName} ${input.studentLastName}`.trim();
  return {
    subject: `Admission offer — ${studentName}`,
    body: [
      `Hello ${input.guardianName},`,
      '',
      `We are pleased to offer ${studentName} a place at ${input.schoolName}.`,
      '',
      `Admission number: ${input.admissionNo}`,
      `Class: ${input.intendedClassName}`,
      '',
      'Next steps:',
      '- Complete enrollment when the school opens the term.',
      '- Student portal credentials will be sent separately.',
      '',
      'If you have questions, contact the admissions office.',
      '',
      `This offer is from ${input.schoolName} via Loomis.`,
    ].join('\n'),
  };
}

function buildStudentPortalCredentialsEmail(input: {
  studentFirstName: string;
  studentLastName: string;
  guardianName: string;
  loginEmail: string;
  temporaryPassword: string;
}): { subject: string; body: string } {
  const studentName = `${input.studentFirstName} ${input.studentLastName}`.trim();
  return {
    subject: `Student portal access for ${studentName}`,
    body: [
      `Hello ${input.guardianName},`,
      '',
      `${studentName} has been admitted and a student portal account has been created.`,
      '',
      'Sign in here:',
      loginUrl(),
      '',
      'Student login email:',
      input.loginEmail,
      '',
      'Temporary password:',
      input.temporaryPassword,
      '',
      'The student must choose a new password on first sign-in.',
      '',
      'If you did not expect this message, contact the school admissions office.',
    ].join('\n'),
  };
}

async function recordDeliveryEvent(input: {
  tenantId: string;
  userId: string;
  result: EmailDeliveryResult;
}): Promise<void> {
  await commsOutboxRepository.publish({
    tenantId: input.tenantId,
    aggregateType: 'user',
    aggregateId: input.userId,
    eventType: COMMS_EVENT_TYPES.accountCredentialsEmail,
    payload: {
      userId: input.userId,
      tenantId: input.tenantId,
      sent: input.result.sent,
      ...(input.result.reason ? { reason: input.result.reason } : {}),
    },
  });
}

export const transactionalEmailService = {
  async sendStaffAccountCredentials(input: {
    tenantId: string;
    userId: string;
    to: string;
    fullName: string;
    loginEmail: string;
    temporaryPassword: string;
  }): Promise<EmailDeliveryResult> {
    const recipient = input.to.toLowerCase();
    let result: EmailDeliveryResult;

    if (!isSesConfigured()) {
      result = { sent: false, recipient, reason: 'SES_NOT_CONFIGURED' };
    } else {
      const { subject, body } = buildStaffCredentialsEmail({
        fullName: input.fullName,
        loginEmail: input.loginEmail,
        temporaryPassword: input.temporaryPassword,
      });
      try {
        await sendEmail({ to: recipient, subject, body });
        result = { sent: true, recipient };
      } catch {
        result = { sent: false, recipient, reason: 'SEND_FAILED' };
      }
    }

    await recordDeliveryEvent({ tenantId: input.tenantId, userId: input.userId, result });
    return result;
  },

  async sendStudentPortalCredentials(input: {
    tenantId: string;
    userId: string;
    to: string;
    guardianName: string;
    studentFirstName: string;
    studentLastName: string;
    loginEmail: string;
    temporaryPassword: string;
  }): Promise<EmailDeliveryResult> {
    const recipient = input.to.toLowerCase();
    let result: EmailDeliveryResult;

    if (!isSesConfigured()) {
      result = { sent: false, recipient, reason: 'SES_NOT_CONFIGURED' };
    } else {
      const { subject, body } = buildStudentPortalCredentialsEmail({
        guardianName: input.guardianName,
        studentFirstName: input.studentFirstName,
        studentLastName: input.studentLastName,
        loginEmail: input.loginEmail,
        temporaryPassword: input.temporaryPassword,
      });
      try {
        await sendEmail({ to: recipient, subject, body });
        result = { sent: true, recipient };
      } catch {
        result = { sent: false, recipient, reason: 'SEND_FAILED' };
      }
    }

    await recordDeliveryEvent({ tenantId: input.tenantId, userId: input.userId, result });
    return result;
  },

  async sendAdmissionOfferLetter(input: {
    tenantId: string;
    userId: string;
    to: string;
    guardianName: string;
    studentFirstName: string;
    studentLastName: string;
    schoolName: string;
    intendedClassName: string;
    admissionNo: string;
  }): Promise<EmailDeliveryResult> {
    const recipient = input.to.toLowerCase();
    let result: EmailDeliveryResult;

    if (!isSesConfigured()) {
      result = { sent: false, recipient, reason: 'SES_NOT_CONFIGURED' };
    } else {
      const { subject, body } = buildAdmissionOfferLetterEmail({
        guardianName: input.guardianName,
        studentFirstName: input.studentFirstName,
        studentLastName: input.studentLastName,
        schoolName: input.schoolName,
        intendedClassName: input.intendedClassName,
        admissionNo: input.admissionNo,
      });
      try {
        await sendEmail({ to: recipient, subject, body });
        result = { sent: true, recipient };
      } catch {
        result = { sent: false, recipient, reason: 'SEND_FAILED' };
      }
    }

    await recordDeliveryEvent({ tenantId: input.tenantId, userId: input.userId, result });
    return result;
  },
};
