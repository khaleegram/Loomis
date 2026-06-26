import type { EmailDeliveryResult } from '@loomis/contracts';
import { formatKobo } from '@loomis/core';
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

function buildSchoolOwnerWelcomeEmail(input: {
  fullName: string;
  schoolName: string;
  loginEmail: string;
  temporaryPassword: string;
}): { subject: string; body: string; html: string } {
  const signInUrl = loginUrl();
  const subject = `Welcome to Loomis — ${input.schoolName} is ready`;
  const body = [
    `Hello ${input.fullName},`,
    '',
    `Your school, ${input.schoolName}, has been provisioned on Loomis.`,
    '',
    'You can sign in now using the credentials below.',
    '',
    'Sign in here:',
    signInUrl,
    '',
    'Login email:',
    input.loginEmail,
    '',
    'Temporary password:',
    input.temporaryPassword,
    '',
    'You must choose a new password when you sign in for the first time.',
    '',
    'Next steps:',
    '- Set up your fee structure for the current term',
    '- Invite your principal and finance team',
    '- Open the academic year when you are ready',
    '',
    'If you did not expect this message, contact Loomis Platform Operations.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f3ef;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e4dc;">
        <tr><td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d2419 100%);padding:32px 28px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#c9a96e;">Loomis Platform</p>
          <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.25;">Welcome, ${input.fullName}</h1>
          <p style="margin:12px 0 0;font-size:14px;color:rgba(255,255,255,0.75);">${input.schoolName} is ready on Loomis.</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#444;">Use the credentials below to sign in and complete your school setup.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf8f5;border:1px solid #ece6da;border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:16px 18px;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">Login email</p>
              <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#111;">${input.loginEmail}</p>
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9ca3af;">Temporary password</p>
              <p style="margin:0;font-size:18px;font-weight:800;letter-spacing:0.08em;color:#111;font-family:ui-monospace,monospace;">${input.temporaryPassword}</p>
            </td></tr>
          </table>
          <a href="${signInUrl}" style="display:inline-block;background:#c9a96e;color:#111;text-decoration:none;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;">Sign in to Loomis</a>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#888;">You will be asked to set a new password on first sign-in. Start by configuring your fee structure, then invite your team.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, body, html };
}

function buildPsfSuggestionEmail(input: {
  schoolName: string;
  basisFeesMinor: number;
  suggestedRateMinor: number;
  currentRateMinor: number | null;
}): { subject: string; body: string } {
  const basis = formatKobo(input.basisFeesMinor);
  const suggested = formatKobo(input.suggestedRateMinor);
  const current = input.currentRateMinor != null ? formatKobo(input.currentRateMinor) : 'platform default';
  return {
    subject: `Suggested platform fee (PSF) for ${input.schoolName}`,
    body: [
      'Hello,',
      '',
      `Based on your configured school fees (${basis} per student), Loomis suggests a platform fee (PSF) of ${suggested} per billable student per term.`,
      '',
      `Your current PSF setting: ${current}`,
      '',
      'Platform Operations may apply this rate, or you can request a review if you believe a different rate applies.',
      '',
      `${webAppBaseUrl()}/school/finance/psf`,
    ].join('\n'),
  };
}

async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  body: string;
  html?: string;
}): Promise<EmailDeliveryResult> {
  const recipient = input.to.toLowerCase();
  if (!isEmailConfigured()) {
    return { sent: false, recipient, reason: 'EMAIL_NOT_CONFIGURED' };
  }
  try {
    await sendEmail({
      to: recipient,
      subject: input.subject,
      body: input.body,
      ...(input.html ? { html: input.html } : {}),
    });
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

  async sendSchoolOwnerWelcomeEmail(input: {
    tenantId: string;
    userId: string;
    to: string;
    fullName: string;
    schoolName: string;
    loginEmail: string;
    temporaryPassword: string;
  }): Promise<EmailDeliveryResult> {
    const recipient = input.to.toLowerCase();
    let result: EmailDeliveryResult;

    if (!isEmailConfigured()) {
      result = { sent: false, recipient, reason: 'EMAIL_NOT_CONFIGURED' };
    } else {
      const { subject, body, html } = buildSchoolOwnerWelcomeEmail({
        fullName: input.fullName,
        schoolName: input.schoolName,
        loginEmail: input.loginEmail,
        temporaryPassword: input.temporaryPassword,
      });
      try {
        await sendEmail({ to: recipient, subject, body, html: html ?? undefined });
        result = { sent: true, recipient };
      } catch {
        result = { sent: false, recipient, reason: 'SEND_FAILED' };
      }
    }

    await recordDeliveryEvent({ tenantId: input.tenantId, userId: input.userId, result });
    return result;
  },

  async sendPsfSuggestionEmail(input: {
    tenantId: string;
    userId: string;
    to: string;
    schoolName: string;
    basisFeesMinor: number;
    suggestedRateMinor: number;
    currentRateMinor: number | null;
  }): Promise<EmailDeliveryResult> {
    const recipient = input.to.toLowerCase();
    let result: EmailDeliveryResult;

    if (!isEmailConfigured()) {
      result = { sent: false, recipient, reason: 'EMAIL_NOT_CONFIGURED' };
    } else {
      const { subject, body } = buildPsfSuggestionEmail({
        schoolName: input.schoolName,
        basisFeesMinor: input.basisFeesMinor,
        suggestedRateMinor: input.suggestedRateMinor,
        currentRateMinor: input.currentRateMinor,
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

  async sendWebsiteInquiryNotificationEmail(input: {
    tenantId: string;
    to: string;
    schoolName: string;
    inquiryType: 'contact' | 'admission_interest';
    submitterName: string;
    submitterEmail: string;
    submitterPhone: string | null;
    message: string;
    childFirstName?: string;
    classInterest?: string;
  }): Promise<EmailDeliveryResult> {
    const recipient = input.to.toLowerCase();
    const label =
      input.inquiryType === 'admission_interest' ? 'Admission interest' : 'Website contact';
    const lines = [
      'Hello,',
      '',
      `A new ${label.toLowerCase()} enquiry arrived on your public school website.`,
      '',
      `From: ${input.submitterName}`,
      `Email: ${input.submitterEmail}`,
    ];
    if (input.submitterPhone) lines.push(`Phone: ${input.submitterPhone}`);
    if (input.childFirstName) lines.push(`Child: ${input.childFirstName}`);
    if (input.classInterest) lines.push(`Class interest: ${input.classInterest}`);
    lines.push('', 'Message:', input.message, '', `View enquiries: ${webAppBaseUrl()}/school/website/inquiries`);

    return sendTransactionalEmail({
      to: recipient,
      subject: `${label} — ${input.schoolName}`,
      body: lines.join('\n'),
    });
  },
};
