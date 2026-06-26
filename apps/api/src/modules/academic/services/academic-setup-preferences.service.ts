import {
  academicSetupPreferences,
  type AcademicSetupPreferences,
  type UpsertAcademicSetupPreferencesRequest,
} from '@loomis/contracts';
import { configurationRepository } from '../../tenant/repository/configuration.repository.js';
import type { ActorContext } from '../types.js';
import { requireTenant } from './_shared.js';

const CONFIG_KEY = 'academic.setup.preferences';

export const academicSetupPreferencesService = {
  async getPreferences(tenantId: string, actor: ActorContext): Promise<AcademicSetupPreferences> {
    requireTenant(actor, tenantId);
    const row = await configurationRepository.findByKey(tenantId, CONFIG_KEY);
    return academicSetupPreferences.parse(row?.value ?? {});
  },

  async upsertPreferences(
    tenantId: string,
    input: UpsertAcademicSetupPreferencesRequest,
    actor: ActorContext,
  ): Promise<AcademicSetupPreferences> {
    requireTenant(actor, tenantId);
    const current = await this.getPreferences(tenantId, actor);
    const merged = academicSetupPreferences.parse({
      ...current,
      ...input,
      calendar: { ...current.calendar, ...input.calendar },
      results: { ...current.results, ...input.results },
      reportCards: { ...current.reportCards, ...input.reportCards },
    });

    await configurationRepository.upsert(tenantId, {
      key: CONFIG_KEY,
      value: merged,
    });

    return merged;
  },
};
