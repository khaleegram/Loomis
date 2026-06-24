import { RISK_EVENT_TYPES } from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { writeAudit } from '../../../shared/audit.js';
import { tenantRepository } from '../../tenant/repository/tenant.repository.js';
import { breakGlassRepository, riskOutboxRepository } from '../repository/index.js';
import type { ActorContext, StartBreakGlassInput } from '../types.js';
import { BREAK_GLASS_TTL_MS } from '../types.js';

const PLATFORM_ROLES = new Set(['platform_owner', 'platform_admin']);

export const breakGlassService = {
  async startSession(input: StartBreakGlassInput, actor: ActorContext, requestId: string) {
    if (!PLATFORM_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Platform role required for break-glass access');
    }
    if (!input.supportTicketId?.trim()) {
      throw new LoomisError(
        'RISK_BREAK_GLASS_TICKET_REQUIRED',
        422,
        'A support ticket ID is required before break-glass can be activated',
      );
    }

    const tenant = await tenantRepository.findById(input.tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }

    const existing = await breakGlassRepository.findActiveForTenant(input.tenantId);
    if (existing) {
      throw new LoomisError(
        'RISK_BREAK_GLASS_ACTIVE_EXISTS',
        409,
        'An active break-glass session already exists for this tenant',
      );
    }

    const expiresAt = new Date(Date.now() + BREAK_GLASS_TTL_MS);
    const session = await breakGlassRepository.create({
      tenantId: input.tenantId,
      supportUserId: actor.userId,
      supportTicketId: input.supportTicketId.trim(),
      expiresAt,
    });

    const schoolOwnerUserId = await breakGlassRepository.findSchoolOwnerUserId(input.tenantId);

    await writeAudit({
      tenantId: input.tenantId,
      actorUserId: actor.userId,
      actorType: 'support',
      action: 'risk.break_glass.activated',
      resourceType: 'break_glass_session',
      resourceId: session.id,
      sensitivity: 'privileged',
      result: 'success',
      requestId,
      metadata: {
        supportTicketId: input.supportTicketId,
        expiresAt: expiresAt.toISOString(),
      },
    });

    await riskOutboxRepository.publish({
      tenantId: input.tenantId,
      aggregateType: 'break_glass_session',
      aggregateId: session.id,
      eventType: RISK_EVENT_TYPES.breakGlassActivated,
      payload: {
        sessionId: session.id,
        tenantId: input.tenantId,
        supportUserId: actor.userId,
        supportTicketId: input.supportTicketId,
        expiresAt: expiresAt.toISOString(),
        schoolOwnerUserId,
      },
    });

    // BLOCKED: School Owner email/push notification requires Comms module (Chat 17).
    // The `risk.break_glass.activated` outbox event is the integration contract;
    // owner must be notified within 5 minutes per SEC-004 / Revenue Integrity doc.

    return session;
  },

  async getActiveForTenant(tenantId: string, actor: ActorContext) {
    if (!PLATFORM_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Platform role required');
    }
    await breakGlassRepository.expireStale();
    return breakGlassRepository.findActiveForSupportUser(actor.userId, tenantId);
  },

  async revokeSession(tenantId: string, sessionId: string, actor: ActorContext, requestId: string) {
    if (!PLATFORM_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Platform role required');
    }
    const revoked = await breakGlassRepository.revoke(tenantId, sessionId);
    if (!revoked) {
      throw new LoomisError('RISK_BREAK_GLASS_SESSION_NOT_FOUND', 404, 'Break-glass session not found');
    }

    await writeAudit({
      tenantId,
      actorUserId: actor.userId,
      actorType: 'support',
      action: 'risk.break_glass.revoked',
      resourceType: 'break_glass_session',
      resourceId: sessionId,
      sensitivity: 'privileged',
      result: 'success',
      requestId,
    });

    return revoked;
  },

  /** Validates an active break-glass session for platform tenant data access. */
  async assertActiveSession(tenantId: string, supportUserId: string): Promise<void> {
    await breakGlassRepository.expireStale();
    const session = await breakGlassRepository.findActiveForSupportUser(supportUserId, tenantId);
    if (!session) {
      throw new LoomisError(
        'RISK_BREAK_GLASS_SESSION_EXPIRED',
        403,
        'Break-glass session is missing or expired',
      );
    }
  },
};
