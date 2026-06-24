import { LoomisError } from '../../../shared/errors.js';
import { academicEvents } from '../events/index.js';
import { academicRepository } from '../repository/academic.repository.js';
import type { ActorContext, CreateAcademicYearInput } from '../types.js';
import { requireTenant, requireYear } from './_shared.js';

export const academicYearService = {
  /**
   * Creates a draft academic year (FR-ASM-001 / US-ASM-001). Blocks overlapping
   * date ranges for the tenant. Only one year can be active at a time (CON-017),
   * enforced at activation and by a DB partial unique index.
   */
  async createYear(tenantId: string, input: CreateAcademicYearInput, actor: ActorContext) {
    requireTenant(actor, tenantId);

    const overlapping = await academicRepository.listOverlappingYears(
      tenantId,
      input.startDate,
      input.endDate,
    );
    if (overlapping.length > 0) {
      throw new LoomisError(
        'ACADEMIC_YEAR_OVERLAP',
        409,
        'The date range overlaps an existing academic year (FR-ASM-001)',
        { overlappingYearIds: overlapping.map((y) => y.id) },
      );
    }

    return academicRepository.createYear(tenantId, input, actor.userId);
  },

  async listYears(tenantId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    return academicRepository.listYears(tenantId);
  },

  async getYear(tenantId: string, yearId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    return requireYear(tenantId, yearId);
  },

  /**
   * Activates a draft year (FR-ASM-002 / CON-017/020). Irreversible. Blocked
   * while another year is active or any other year still has open/census-locked
   * terms. Creates the configured number of draft term placeholders.
   */
  async activateYear(tenantId: string, yearId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    const year = await requireYear(tenantId, yearId);
    if (year.status !== 'draft') {
      throw new LoomisError(
        'ACADEMIC_YEAR_NOT_DRAFT',
        409,
        'Only a draft academic year can be activated; activation is irreversible',
      );
    }

    const active = await academicRepository.findActiveYear(tenantId);
    if (active) {
      throw new LoomisError(
        'ACADEMIC_YEAR_ALREADY_ACTIVE',
        409,
        'Another academic year is already active (CON-017). Close it first.',
        { activeYearId: active.id },
      );
    }

    if (await academicRepository.hasUnclosedTermsOutsideYear(tenantId, yearId)) {
      throw new LoomisError(
        'ACADEMIC_YEAR_ACTIVATION_BLOCKED',
        409,
        'A previous academic year still has unclosed terms (CON-020)',
      );
    }

    // BLOCKED: FR-ASM-002 also requires that ALL PSF obligations from the previous
    // year are settled, platform-approved, or written off before activation. That
    // gate reads `ledger.psf_obligations`, owned by the Ledger module (not built
    // yet). We do NOT fake "all settled". Once the Ledger read-model exists, add a
    // pre-activation check here and fail closed if any obligation is unresolved.

    const activated = await academicRepository.activateYearWithTerms(tenantId, yearId, actor.userId);
    if (!activated) {
      throw new LoomisError('ACADEMIC_YEAR_NOT_DRAFT', 409, 'Academic year is no longer in draft');
    }

    await academicEvents.publishYearActivated(tenantId, yearId, actor.userId);
    return activated;
  },

  /**
   * Closes an active year (FR-ASM-003). Blocked unless every term in the year is
   * closed. On closure the year is archived (status `closed`) — records remain
   * permanently readable but no new records may be created against it.
   */
  async closeYear(tenantId: string, yearId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    const year = await requireYear(tenantId, yearId);
    if (year.status !== 'active') {
      throw new LoomisError(
        'ACADEMIC_YEAR_CLOSURE_BLOCKED',
        409,
        'Only an active academic year can be closed',
      );
    }

    const terms = await academicRepository.listTermsByYear(tenantId, yearId);
    const unclosed = terms.filter((t) => t.status !== 'closed');
    if (unclosed.length > 0) {
      throw new LoomisError(
        'ACADEMIC_YEAR_CLOSURE_BLOCKED',
        409,
        'Every term must be closed before the academic year can be closed (FR-ASM-003)',
        { unclosedTermIds: unclosed.map((t) => t.id) },
      );
    }

    const closed = await academicRepository.closeYear(tenantId, yearId, actor.userId);
    if (!closed) {
      throw new LoomisError('ACADEMIC_YEAR_CLOSURE_BLOCKED', 409, 'Academic year could not be closed');
    }

    await academicEvents.publishYearClosed(tenantId, yearId, actor.userId);
    return closed;
  },
};
