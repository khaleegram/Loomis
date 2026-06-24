import { calculateSuggestedPsfRateMinor, formatKobo, sumBillableFeeItemsMinor } from '@loomis/core';
import { deliveryService } from '../../comms/services/delivery.service.js';
import { transactionalEmailService } from '../../comms/services/transactional-email.service.js';
import { financeRepository } from '../../finance/repository/index.js';
import { staffRepository } from '../../hrm/repository/staff.repository.js';
import { configurationRepository } from '../repository/configuration.repository.js';
import { tenantRepository } from '../repository/tenant.repository.js';
import { psfRateService } from './psf-rate.service.js';
import {
  TENANT_PSF_SUGGESTED_RATE_KEY,
  TENANT_PSF_SUGGESTION_BASIS_KEY,
} from '../constants.js';

export const psfSuggestionService = {
  async getSuggestedRateMinor(tenantId: string): Promise<number | null> {
    const config = await configurationRepository.findByKey(tenantId, TENANT_PSF_SUGGESTED_RATE_KEY);
    if (config?.value == null || typeof config.value !== 'number') return null;
    return config.value;
  },

  /**
   * Recomputes PSF suggestion from all fee structures in a term and notifies the
   * School Owner when the suggested rate differs from the current effective rate.
   */
  async evaluateAfterFeeStructureChange(tenantId: string, termId: string): Promise<void> {
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) return;

    const structures = await financeRepository.listStructuresByTerm(tenantId, termId);
    if (structures.length === 0) return;

    let maxBillableMinor = 0;
    for (const { items } of structures) {
      const billable = sumBillableFeeItemsMinor(
        items.map((item) => ({
          category: item.category as import('@loomis/contracts').FeeItemCategory,
          amountMinor: item.amountMinor,
        })),
      );
      if (billable > maxBillableMinor) maxBillableMinor = billable;
    }

    if (maxBillableMinor <= 0) return;

    const suggestedRateMinor = calculateSuggestedPsfRateMinor(maxBillableMinor);
    const currentRateMinor = await psfRateService.resolveEffectiveRateMinor(
      tenantId,
      tenant.tierId,
    );

    await configurationRepository.upsert(tenantId, {
      key: TENANT_PSF_SUGGESTED_RATE_KEY,
      value: suggestedRateMinor,
    });
    await configurationRepository.upsert(tenantId, {
      key: TENANT_PSF_SUGGESTION_BASIS_KEY,
      value: maxBillableMinor,
    });

    if (currentRateMinor === suggestedRateMinor) return;

    const owners = await staffRepository.findActiveUserIdsByRole(tenantId, 'school_owner');
    if (owners.length === 0) return;

    const basisLabel = formatKobo(maxBillableMinor);
    const suggestedLabel = formatKobo(suggestedRateMinor);
    const currentLabel =
      currentRateMinor != null ? formatKobo(currentRateMinor) : 'platform default';

    const title = 'Suggested platform fee (PSF) update';
    const body = `Based on your fee structure (up to ${basisLabel} per student), the suggested PSF is ${suggestedLabel}. Current setting: ${currentLabel}. Platform Operations can apply this rate or you may request a review.`;

    await deliveryService.createManyInApp(
      owners.map((owner) => ({
        tenantId,
        userId: owner.userId,
        notificationType: 'generic' as const,
        safeCopy: {
          title,
          body,
          deepLinkResourceType: 'platform_billing',
        },
        resourceId: termId,
        eventIdempotencyKey: `psf.suggestion:${tenantId}:${termId}:${suggestedRateMinor}`,
      })),
    );

    for (const owner of owners) {
      if (!owner.email) continue;
      void transactionalEmailService.sendPsfSuggestionEmail({
        tenantId,
        userId: owner.userId,
        to: owner.email,
        schoolName: tenant.name,
        basisFeesMinor: maxBillableMinor,
        suggestedRateMinor,
        currentRateMinor,
      });
    }
  },
};
