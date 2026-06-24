import type { EmailDeliveryResult } from '@loomis/contracts';
import { COMMS_EVENT_TYPES } from '@loomis/contracts';
import { isEmailConfigured, sendEmail } from '../gateways/resend.gateway.js';
import { commsOutboxRepository } from '../repository/outbox.repository.js';
import { loginUrl, staffInvitationUrl, webAppBaseUrl } from '../utils/web-app-url.js';

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

async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<EmailDeliveryResult> {
  const recipient = input.to.toLowerCase();
  if (!isEmailConfigured()) {
    return { sent: false, recipient, reason: 'EMAIL_NOT_CONFIGURED' };
  }
  try {
    await sendEmail({ to: recipient, subject: input.subject, body: input.body });
    return { sent: true, recipient };
  } catch {
    return { sent: false, recipient, reason: 'SEND_FAILED' };
  }
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

    if (!isEmailConfigured()) {
      result = { sent: false, recipient, reason: 'EMAIL_NOT_CONFIGURED' };
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

    if (!isEmailConfigured()) {
      result = { sent: false, recipient, reason: 'EMAIL_NOT_CONFIGURED' };
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

    if (!isEmailConfigured()) {
      result = { sent: false, recipient, reason: 'EMAIL_NOT_CONFIGURED' };
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

  async sendAccountLockoutEmail(input: {
    to: string;
    unlocksAt: Date;
  }): Promise<EmailDeliveryResult> {
    return sendTransactionalEmail({
      to: input.to,
      subject: 'Your Loomis account was temporarily locked',
      body: [
        'Hello,',
        '',
        'Your Loomis account was locked after several failed sign-in attempts.',
        '',
        `It will unlock automatically at ${input.unlocksAt.toISOString()}.`,
        '',
        'If this was not you, contact your school administrator or reset your password.',
        '',
        loginUrl(),
      ].join('\n'),
    });
  },

  async sendSessionDisplacedEmail(input: {
    to: string;
    platform: string;
  }): Promise<EmailDeliveryResult> {
    return sendTransactionalEmail({
      to: input.to,
      subject: 'A new Loomis sign-in replaced an older session',
      body: [
        'Hello,',
        '',
        'You signed in on a new device or browser and your oldest active session was signed out.',
        '',
        `New sign-in platform: ${input.platform}`,
        '',
        'If this was not you, reset your password immediately and contact your administrator.',
        '',
        loginUrl(),
      ].join('\n'),
    });
  },

  async sendStaffInvitationEmail(input: {
    tenantId: string;
    userId: string;
    to: string;
    fullName: string;
    invitationToken: string;
    expiresAt: Date;
  }): Promise<EmailDeliveryResult> {
    const invitationUrl = staffInvitationUrl(input.invitationToken, input.tenantId);
    const result = await sendTransactionalEmail({
      to: input.to,
      subject: 'You are invited to join Loomis',
      body: [
        `Hello ${input.fullName},`,
        '',
        'Your school invited you to join Loomis as staff.',
        '',
        'Set your password using this one-time link:',
        invitationUrl,
        '',
        `This link expires at ${input.expiresAt.toISOString()}.`,
        '',
        'If you did not expect this invitation, you can ignore this email.',
      ].join('\n'),
    });
    if (input.tenantId) {
      await recordDeliveryEvent({ tenantId: input.tenantId, userId: input.userId, result });
    }
    return result;
  },

  async sendPasswordResetOtp(input: {
    to: string;
    otp: string;
    expiresAt: Date;
  }): Promise<EmailDeliveryResult> {
    return sendTransactionalEmail({
      to: input.to,
      subject: 'Your Loomis password reset code',
      body: [
        'Hello,',
        '',
        'Use this code to reset your Loomis password:',
        input.otp,
        '',
        `The code expires at ${input.expiresAt.toISOString()}.`,
        '',
        'If you did not request a password reset, you can ignore this email.',
      ].join('\n'),
    });
  },

  async sendPlatformBillingSnapshotEmail(input: {
    to: string;
    termName: string;
    systemBillableCount: number;
    adjustmentWindowEndsAt: Date;
  }): Promise<EmailDeliveryResult> {
    return sendTransactionalEmail({
      to: input.to,
      subject: `Platform billing snapshot — ${input.termName}`,
      body: [
        'Hello,',
        '',
        `The platform billing snapshot for ${input.termName} has been taken.`,
        '',
        `Billable students: ${input.systemBillableCount}`,
        `Adjustment window closes: ${input.adjustmentWindowEndsAt.toISOString().slice(0, 10)}`,
        '',
        'If the count looks wrong, submit a correction request in Platform Billing before the window closes.',
        '',
        `${webAppBaseUrl()}/school/academic/platform-billing`,
      ].join('\n'),
    });
  },

  async sendMtcBelowCommitmentWarningEmail(input: {
    to: string;
    termName: string;
    systemBillableCount: number;
    minimumTermCommitment: number;
    snapshotDate: string;
  }): Promise<EmailDeliveryResult> {
    return sendTransactionalEmail({
      to: input.to,
      subject: `Platform billing snapshot in 7 days — ${input.termName}`,
      body: [
        'Hello,',
        '',
        `Your platform billing snapshot for ${input.termName} is scheduled for ${input.snapshotDate}.`,
        '',
        `Current billable students: ${input.systemBillableCount}`,
        `Minimum term commitment: ${input.minimumTermCommitment}`,
        '',
        'Your billable count is below your minimum term commitment. Review enrollments before the snapshot date.',
        '',
        `${webAppBaseUrl()}/school/academic/platform-billing`,
      ].join('\n'),
    });
  },
};
