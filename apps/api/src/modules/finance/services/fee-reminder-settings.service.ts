import {
  FEE_REMINDER_PRESET_CONFIG_KEY,
  feeReminderPreset,
  type FeeReminderPreset,
  type UpdateFeeReminderSettingsRequest,
} from '@loomis/contracts';
import { configurationRepository } from '../../tenant/repository/configuration.repository.js';

const DEFAULT_PRESET: FeeReminderPreset = 'standard';

function parsePreset(value: unknown): FeeReminderPreset {
  if (value && typeof value === 'object' && 'preset' in value) {
    const parsed = feeReminderPreset.safeParse((value as { preset: unknown }).preset);
    if (parsed.success) return parsed.data;
  }
  const direct = feeReminderPreset.safeParse(value);
  return direct.success ? direct.data : DEFAULT_PRESET;
}

export const feeReminderSettingsService = {
  async getSettings(tenantId: string): Promise<{ preset: FeeReminderPreset }> {
    const config = await configurationRepository.findByKey(tenantId, FEE_REMINDER_PRESET_CONFIG_KEY);
    return { preset: parsePreset(config?.value) };
  },

  async updateSettings(
    tenantId: string,
    input: UpdateFeeReminderSettingsRequest,
  ): Promise<{ preset: FeeReminderPreset }> {
    await configurationRepository.upsert(tenantId, {
      key: FEE_REMINDER_PRESET_CONFIG_KEY,
      value: input,
    });
    return input;
  },
};
