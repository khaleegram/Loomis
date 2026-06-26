import { LoomisError } from '../../../shared/errors.js';
import { academicRepository } from '../repository/academic.repository.js';
import type { CreateCalendarEventRequest } from '@loomis/contracts';
import type { ActorContext } from '../types.js';
import { requireTenant, requireYear, requireTerm } from './_shared.js';

/**
 * School calendar events. Schools add their own dated entries (holidays, PTA
 * meetings, sports day) on top of the term dates the system derives.
 */
export const calendarEventService = {
  async listEvents(tenantId: string, academicYearId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    await requireYear(tenantId, academicYearId);
    return academicRepository.listCalendarEvents(tenantId, academicYearId);
  },

  async createEvent(tenantId: string, input: CreateCalendarEventRequest, actor: ActorContext) {
    requireTenant(actor, tenantId);
    await requireYear(tenantId, input.academicYearId);
    if (input.termId) {
      const term = await requireTerm(tenantId, input.termId);
      if (term.academicYearId !== input.academicYearId) {
        throw new LoomisError(
          'ACADEMIC_TERM_YEAR_MISMATCH',
          422,
          'The selected term does not belong to that academic year',
        );
      }
    }

    const event = await academicRepository.createCalendarEvent(
      tenantId,
      {
        academicYearId: input.academicYearId,
        termId: input.termId,
        title: input.title,
        description: input.description,
        eventType: input.eventType,
        startDate: input.startDate,
        endDate: input.endDate,
      },
      actor.userId,
    );
    if (!event) {
      throw new LoomisError('INTERNAL_ERROR', 500, 'Failed to create calendar event');
    }
    return event;
  },

  async deleteEvent(tenantId: string, eventId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    const event = await academicRepository.findCalendarEventById(tenantId, eventId);
    if (!event) {
      throw new LoomisError('ACADEMIC_CALENDAR_EVENT_NOT_FOUND', 404, 'Calendar event not found');
    }
    await academicRepository.deleteCalendarEvent(tenantId, eventId);
  },
};
