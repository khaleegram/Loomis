import { LoomisError } from '../../../shared/errors.js';
import { academicRepository } from '../repository/academic.repository.js';
import type {
  ActorContext,
  CreateClassArmInput,
  CreateClassLevelInput,
  UpsertProgressionInput,
} from '../types.js';
import { requireTenant, requireYear } from './_shared.js';

/**
 * Class structure & progression map (FR-ASM-009). Levels are tenant reference
 * data; arms are created fresh per academic year so a year's class assignments
 * are never overwritten by the next year's setup.
 */
export const classStructureService = {
  async createClassLevel(tenantId: string, input: CreateClassLevelInput, actor: ActorContext) {
    requireTenant(actor, tenantId);
    try {
      return await academicRepository.createClassLevel(tenantId, input, actor.userId);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new LoomisError(
          'ACADEMIC_CLASS_LEVEL_CONFLICT',
          409,
          'A class level with this code or rank already exists',
        );
      }
      throw err;
    }
  },

  async listClassLevels(tenantId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    return academicRepository.listClassLevels(tenantId);
  },

  async createClassArm(tenantId: string, input: CreateClassArmInput, actor: ActorContext) {
    requireTenant(actor, tenantId);
    await requireYear(tenantId, input.academicYearId);

    const level = await academicRepository.findClassLevelById(tenantId, input.classLevelId);
    if (!level) {
      throw new LoomisError('ACADEMIC_CLASS_LEVEL_NOT_FOUND', 404, 'Class level not found');
    }

    try {
      return await academicRepository.createClassArm(tenantId, input, actor.userId);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new LoomisError(
          'ACADEMIC_CLASS_ARM_NOT_FOUND',
          409,
          'A class arm with this name already exists for the level in this year',
        );
      }
      throw err;
    }
  },

  async getClassStructure(tenantId: string, academicYearId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    await requireYear(tenantId, academicYearId);
    const [levels, arms] = await Promise.all([
      academicRepository.listClassLevels(tenantId),
      academicRepository.listClassArms(tenantId, academicYearId),
    ]);
    return { levels, arms };
  },

  /**
   * Defines/updates the progression destination for a level (FR-ASM-009). The
   * terminal/destination consistency is enforced by the Zod schema and a DB CHECK.
   */
  async upsertProgression(tenantId: string, input: UpsertProgressionInput, actor: ActorContext) {
    requireTenant(actor, tenantId);

    const from = await academicRepository.findClassLevelById(tenantId, input.fromClassLevelId);
    if (!from) {
      throw new LoomisError('ACADEMIC_CLASS_LEVEL_NOT_FOUND', 404, 'Source class level not found');
    }
    if (input.toClassLevelId !== null) {
      if (input.toClassLevelId === input.fromClassLevelId) {
        throw new LoomisError(
          'ACADEMIC_PROGRESSION_INVALID',
          422,
          'A class level cannot progress to itself',
        );
      }
      const to = await academicRepository.findClassLevelById(tenantId, input.toClassLevelId);
      if (!to) {
        throw new LoomisError(
          'ACADEMIC_CLASS_LEVEL_NOT_FOUND',
          404,
          'Destination class level not found',
        );
      }
    }

    return academicRepository.upsertProgression(
      tenantId,
      {
        fromClassLevelId: input.fromClassLevelId,
        toClassLevelId: input.toClassLevelId,
        isTerminal: input.isTerminal,
      },
      actor.userId,
    );
  },

  async listProgressions(tenantId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    return academicRepository.listProgressions(tenantId);
  },
};

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '23505';
}
