import type {
  ProvisionDraftPayload,
  ProvisionDraftResponse,
  UpsertProvisionDraftRequest,
} from '@loomis/contracts';
import { provisionDraftRepository, type ProvisionDraftSource } from '../repository/provision-draft.repository.js';

function toResponse(
  row: NonNullable<Awaited<ReturnType<typeof provisionDraftRepository.findByActor>>>,
): ProvisionDraftResponse {
  return {
    id: row.id,
    source: row.source as ProvisionDraftSource,
    stepIndex: row.stepIndex,
    payload: row.payload as ProvisionDraftPayload,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const provisionDraftService = {
  async getDraft(
    createdById: string,
    source: ProvisionDraftSource,
  ): Promise<ProvisionDraftResponse | null> {
    const row = await provisionDraftRepository.findByActor(createdById, source);
    return row ? toResponse(row) : null;
  },

  async upsertDraft(
    createdById: string,
    source: ProvisionDraftSource,
    input: UpsertProvisionDraftRequest,
  ): Promise<ProvisionDraftResponse> {
    const row = await provisionDraftRepository.upsert({
      createdById,
      source,
      payload: input.payload as Record<string, unknown>,
      stepIndex: input.stepIndex,
    });
    return toResponse(row);
  },

  async clearDraft(createdById: string, source: ProvisionDraftSource): Promise<void> {
    await provisionDraftRepository.deleteByActor(createdById, source);
  },
};
