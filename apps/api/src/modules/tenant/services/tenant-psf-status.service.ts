import type { TenantPsfStatusResponse } from '@loomis/contracts';
import { eq } from 'drizzle-orm';
import { psfObligations } from '../../../../drizzle/schema/ledger.js';
import { academicRepository } from '../../academic/repository/academic.repository.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { psfRateService } from './psf-rate.service.js';
import { psfSuggestionService } from './psf-suggestion.service.js';
import { tenantRepository } from '../repository/tenant.repository.js';

export const tenantPsfStatusService = {
  async getStatus(tenantId: string): Promise<TenantPsfStatusResponse> {
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      return {
        currentRateMinor: null,
        suggestedRateMinor: null,
        suggestionPending: false,
        obligationsTotal: 0,
        obligationsOutstandingMinor: 0,
        termLabel: null,
      };
    }

    const currentRateMinor = await psfRateService.resolveEffectiveRateMinor(
      tenant.id,
      tenant.tierId,
    );
    const suggestedRateMinor = await psfSuggestionService.getSuggestedRateMinor(tenantId);
    const suggestionPending =
      suggestedRateMinor != null &&
      currentRateMinor != null &&
      suggestedRateMinor !== currentRateMinor;

    const activeYear = await academicRepository.findActiveYear(tenantId);
    let termLabel: string | null = null;
    if (activeYear) {
      const terms = await academicRepository.listTermsByYear(tenantId, activeYear.id);
      const openTerm = terms.find((term) => term.status !== 'closed') ?? terms[0];
      termLabel = openTerm?.name ?? null;
    }

    const obligationStats = await withTenantContext(tenantId, async (tx) => {
      const rows = await tx.select().from(psfObligations).where(eq(psfObligations.tenantId, tenantId));
      let obligationsOutstandingMinor = 0;
      for (const row of rows) {
        if (row.status === 'pending' || row.status === 'disputed') {
          obligationsOutstandingMinor += row.amountMinor;
        }
      }
      return { obligationsTotal: rows.length, obligationsOutstandingMinor };
    });

    return {
      currentRateMinor,
      suggestedRateMinor,
      suggestionPending,
      obligationsTotal: obligationStats.obligationsTotal,
      obligationsOutstandingMinor: obligationStats.obligationsOutstandingMinor,
      termLabel,
    };
  },
};
