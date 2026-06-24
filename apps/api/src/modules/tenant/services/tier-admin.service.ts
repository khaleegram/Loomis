import type {
  CreateTierRequest,
  TierSummary,
  UpdateTierRequest,
} from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { tierRepository } from '../repository/tier.repository.js';

function toTierSummary(row: NonNullable<Awaited<ReturnType<typeof tierRepository.findById>>>): TierSummary {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? null,
    defaultPsfRateMinor: row.defaultPsfRateMinor,
    maxStudents: row.maxStudents ?? null,
    isSystem: row.isSystem,
    createdAt: row.createdAt.toISOString(),
  };
}

export const tierAdminService = {
  async createTier(input: CreateTierRequest): Promise<TierSummary> {
    const existing = await tierRepository.findByCode(input.code);
    if (existing) {
      throw new LoomisError('TENANT_TIER_CODE_CONFLICT', 409, 'A tier with this code already exists');
    }
    const tier = await tierRepository.create({
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      defaultPsfRateMinor: input.defaultPsfRateMinor,
      maxStudents: input.maxStudents ?? null,
      isSystem: false,
    });
    return toTierSummary(tier);
  },

  async updateTier(tierId: string, input: UpdateTierRequest): Promise<TierSummary> {
    const tier = await tierRepository.findById(tierId);
    if (!tier) {
      throw new LoomisError('TENANT_TIER_NOT_FOUND', 404, 'Tier not found');
    }
    const updated = await tierRepository.update(tierId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.defaultPsfRateMinor !== undefined
        ? { defaultPsfRateMinor: input.defaultPsfRateMinor }
        : {}),
      ...(input.maxStudents !== undefined ? { maxStudents: input.maxStudents } : {}),
    });
    if (!updated) {
      throw new LoomisError('TENANT_TIER_NOT_FOUND', 404, 'Tier not found');
    }
    return toTierSummary(updated);
  },
};
