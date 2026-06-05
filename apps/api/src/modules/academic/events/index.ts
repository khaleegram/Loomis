import { outboxRepository } from '../repository/outbox.repository.js';
import { ACADEMIC_EVENT_TYPES } from './types.js';

/**
 * Academic event publishers for the lifecycle (non-census) signals. All academic
 * events flow through the durable outbox (`ledger.outbox_events`); the BullMQ
 * relay (Ledger module) consumes them. These emit standalone lifecycle events.
 *
 * The census-lock revenue trigger is NOT published here: it is appended to the
 * outbox INSIDE the SERIALIZABLE census transaction (academicRepository.lockCensus)
 * so the term status change and the `academic.term.census_locked` event commit
 * atomically (loomis-financial-integrity / System Design §8.1).
 */
export const academicEvents = {
  async publishYearActivated(tenantId: string, academicYearId: string, actorUserId: string) {
    return outboxRepository.publish({
      aggregateType: 'academic_year',
      aggregateId: academicYearId,
      eventType: ACADEMIC_EVENT_TYPES.yearActivated,
      tenantId,
      payload: { tenantId, academicYearId, activatedById: actorUserId },
    });
  },

  async publishYearClosed(tenantId: string, academicYearId: string, actorUserId: string) {
    return outboxRepository.publish({
      aggregateType: 'academic_year',
      aggregateId: academicYearId,
      eventType: ACADEMIC_EVENT_TYPES.yearClosed,
      tenantId,
      payload: { tenantId, academicYearId, closedById: actorUserId },
    });
  },

  async publishTermOpened(tenantId: string, termId: string, academicYearId: string, actorUserId: string) {
    return outboxRepository.publish({
      aggregateType: 'academic_term',
      aggregateId: termId,
      eventType: ACADEMIC_EVENT_TYPES.termOpened,
      tenantId,
      payload: { tenantId, termId, academicYearId, openedById: actorUserId },
    });
  },

  async publishTermClosed(tenantId: string, termId: string, academicYearId: string, actorUserId: string) {
    return outboxRepository.publish({
      aggregateType: 'academic_term',
      aggregateId: termId,
      eventType: ACADEMIC_EVENT_TYPES.termClosed,
      tenantId,
      payload: { tenantId, termId, academicYearId, closedById: actorUserId },
    });
  },

  async publishPromotionConfirmed(
    tenantId: string,
    fromAcademicYearId: string,
    toAcademicYearId: string,
    actorUserId: string,
  ) {
    return outboxRepository.publish({
      aggregateType: 'academic_year',
      aggregateId: fromAcademicYearId,
      eventType: ACADEMIC_EVENT_TYPES.promotionConfirmed,
      tenantId,
      payload: { tenantId, fromAcademicYearId, toAcademicYearId, confirmedById: actorUserId },
    });
  },
};

export { ACADEMIC_EVENT_TYPES } from './types.js';
export type { TermCensusLockedPayload } from './types.js';
