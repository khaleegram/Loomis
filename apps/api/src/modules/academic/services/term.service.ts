import { LoomisError } from '../../../shared/errors.js';
import { academicEvents } from '../events/index.js';
import { academicRepository } from '../repository/academic.repository.js';
import type { ActorContext, CloseTermInput, ConfigureTermInput } from '../types.js';
import { requireTenant, requireTerm } from './_shared.js';
import { termClosureGate } from './term-closure-gate.js';

export const termService = {
  async listTerms(tenantId: string, yearId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    return academicRepository.listTermsByYear(tenantId, yearId);
  },

  async getTerm(tenantId: string, termId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    return requireTerm(tenantId, termId);
  },

  /**
   * Configures a draft term (FR-ASM-004 / US-ASM-002). Date invariants (census
   * within term; enrollment closes on/before census) are validated by the Zod
   * schema and the DB CHECKs. Configuration is allowed only while draft.
   */
  async configureTerm(
    tenantId: string,
    termId: string,
    input: ConfigureTermInput,
    actor: ActorContext,
  ) {
    requireTenant(actor, tenantId);
    const term = await requireTerm(tenantId, termId);
    if (term.status !== 'draft') {
      throw new LoomisError(
        'ACADEMIC_TERM_NOT_DRAFT',
        409,
        'A term can only be configured while it is in draft (FR-ASM-004)',
      );
    }

    const updated = await academicRepository.configureTerm(tenantId, termId, input);
    if (!updated) {
      throw new LoomisError('ACADEMIC_TERM_NOT_DRAFT', 409, 'Term is no longer in draft');
    }
    return updated;
  },

  /**
   * Opens a term (FR-ASM-005 / CON-018/019). The term must be configured. Only
   * one term per year may be open (CON-018, DB partial unique index). The
   * previous term in the year must be closed (CON-019).
   */
  async openTerm(tenantId: string, termId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    const term = await requireTerm(tenantId, termId);
    if (term.status !== 'draft') {
      throw new LoomisError('ACADEMIC_TERM_NOT_DRAFT', 409, 'Only a draft term can be opened');
    }
    if (!term.startDate || !term.endDate || !term.censusLockDate || !term.enrollmentWindowCloseDate) {
      throw new LoomisError(
        'ACADEMIC_TERM_INVALID_CONFIG',
        422,
        'Configure the term dates before opening it (FR-ASM-004)',
      );
    }

    if (term.sequence > 1) {
      const previous = await academicRepository.findTermBySequence(
        tenantId,
        term.academicYearId,
        term.sequence - 1,
      );
      if (previous && previous.status !== 'closed') {
        throw new LoomisError(
          'ACADEMIC_TERM_PREVIOUS_NOT_CLOSED',
          409,
          'The previous term in this year must be closed first (CON-019)',
        );
      }
    }

    try {
      const opened = await academicRepository.openTerm(tenantId, termId, actor.userId);
      if (!opened) {
        throw new LoomisError('ACADEMIC_TERM_NOT_DRAFT', 409, 'Term is no longer in draft');
      }
      await academicEvents.publishTermOpened(tenantId, termId, term.academicYearId, actor.userId);
      return opened;
    } catch (err) {
      // The partial unique index (one open term per year) raises a unique
      // violation if another term is already open (CON-018).
      if (isUniqueViolation(err)) {
        throw new LoomisError(
          'ACADEMIC_TERM_ALREADY_OPEN',
          409,
          'Another term in this year is already open (CON-018)',
        );
      }
      throw err;
    }
  },

  /**
   * Closes a term (FR-ASM-006 / US-ASM-004 / CON-021). The term must be census
   * locked. Closure is gated; financial blockers can NEVER be overridden at the
   * school level. See termClosureGate for the fail-closed rationale.
   */
  async closeTerm(tenantId: string, termId: string, input: CloseTermInput, actor: ActorContext) {
    requireTenant(actor, tenantId);
    const term = await requireTerm(tenantId, termId);
    if (term.status === 'closed') {
      return term;
    }
    if (term.status !== 'census_locked') {
      throw new LoomisError(
        'ACADEMIC_TERM_CLOSURE_BLOCKED',
        409,
        'A term must be census-locked before it can be closed (FR-ASM-006)',
      );
    }

    const gate = await termClosureGate.evaluate(tenantId, termId);
    if (gate.financialBlockers.length > 0) {
      // CON-021: financial blockers are never overridable at the school level.
      throw new LoomisError(
        'ACADEMIC_TERM_CLOSURE_BLOCKED',
        409,
        'Term closure is blocked by financial conditions that require platform approval (CON-021)',
        { financialBlockers: gate.financialBlockers },
      );
    }
    if (gate.operationalBlockers.length > 0 && !input.overrideReason) {
      throw new LoomisError(
        'ACADEMIC_TERM_CLOSURE_BLOCKED',
        409,
        'Term closure is blocked; provide a documented override reason for non-financial blockers',
        { operationalBlockers: gate.operationalBlockers },
      );
    }

    const closed = await academicRepository.closeTerm(
      tenantId,
      termId,
      actor.userId,
      input.overrideReason ?? null,
    );
    if (!closed) {
      throw new LoomisError('ACADEMIC_TERM_CLOSURE_BLOCKED', 409, 'Term could not be closed');
    }

    await academicEvents.publishTermClosed(tenantId, termId, term.academicYearId, actor.userId);
    return closed;
  },
};

/** Postgres unique-violation SQLSTATE is 23505. */
function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '23505';
}
