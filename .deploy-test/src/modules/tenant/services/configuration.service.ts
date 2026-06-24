import type { ConfigurationResponse } from '@loomis/contracts';
import { configurationRepository } from '../repository/configuration.repository.js';
import type { UpsertConfigurationInput } from '../types.js';

type ConfigurationRow = NonNullable<
  Awaited<ReturnType<typeof configurationRepository.findByKey>>
>;

function toResponse(config: ConfigurationRow): ConfigurationResponse {
  return {
    id: config.id,
    tenantId: config.tenantId,
    key: config.key,
    value: config.value,
    updatedAt: config.updatedAt.toISOString(),
  };
}

export const configurationService = {
  async listConfigurations(tenantId: string): Promise<ConfigurationResponse[]> {
    const configs = await configurationRepository.list(tenantId);
    return configs.map(toResponse);
  },

  async upsertConfiguration(
    tenantId: string,
    input: UpsertConfigurationInput,
  ): Promise<ConfigurationResponse> {
    const config = await configurationRepository.upsert(tenantId, input);
    return toResponse(config);
  },
};
