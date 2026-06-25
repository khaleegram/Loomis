import { academicRepository } from '../../academic/repository/academic.repository.js';
import { financeRepository } from '../../finance/repository/index.js';
import { configurationRepository } from '../repository/configuration.repository.js';
import { tenantOwnerService } from './tenant-owner.service.js';
import { psfSuggestionService } from './psf-suggestion.service.js';
import { psfRateService } from './psf-rate.service.js';
import { tenantRepository } from '../repository/tenant.repository.js';
import { TENANT_PSF_SUGGESTION_BASIS_KEY } from '../constants.js';

export interface TenantOnboardingStep {
  id: string;
  label: string;
  complete: boolean;
  detail: string | null;
}

export interface TenantOnboardingStatus {
  readyForOperations: boolean;
  completedStepCount: number;
  totalStepCount: number;
  steps: TenantOnboardingStep[];
  suggestedPsfBasisMinor: number | null;
}

export const tenantOnboardingService = {
  async getStatus(tenantId: string): Promise<TenantOnboardingStatus> {
    const ownerSetup = await tenantOwnerService.getOwnerSetupStatus(tenantId);
    const suggestedPsfRateMinor = await psfSuggestionService.getSuggestedRateMinor(tenantId);
    const basisConfig = await configurationRepository.findByKey(
      tenantId,
      TENANT_PSF_SUGGESTION_BASIS_KEY,
    );
    const suggestedPsfBasisMinor =
      basisConfig?.value != null && typeof basisConfig.value === 'number'
        ? basisConfig.value
        : null;

    const activeYear = await academicRepository.findActiveYear(tenantId);
    const tenant = await tenantRepository.findById(tenantId);
    const currentPsfRateMinor =
      tenant != null
        ? await psfRateService.resolveEffectiveRateMinor(tenant.id, tenant.tierId)
        : null;

    let feeStructuresConfigured = false;
    if (activeYear) {
      const terms = await academicRepository.listTermsByYear(tenantId, activeYear.id);
      const openTerm = terms.find((term) => term.status !== 'closed') ?? terms[0];
      if (openTerm) {
        const structures = await financeRepository.listStructuresByTerm(tenantId, openTerm.id);
        feeStructuresConfigured = structures.length > 0;
      }
    }

    const psfSuggestionPending =
      suggestedPsfRateMinor != null &&
      currentPsfRateMinor != null &&
      suggestedPsfRateMinor !== currentPsfRateMinor;

    const steps: TenantOnboardingStep[] = [
      {
        id: 'provisioned',
        label: 'School provisioned',
        complete: tenant?.status === 'active',
        detail: tenant?.activatedAt?.toISOString() ?? null,
      },
      {
        id: 'owner_account',
        label: 'School Owner account',
        complete: ownerSetup.hasOwnerAccount,
        detail: ownerSetup.ownerEmail,
      },
      {
        id: 'welcome_email',
        label: 'Welcome email sent',
        complete: Boolean(ownerSetup.setupEmailSentAt),
        detail: ownerSetup.setupEmailSentAt,
      },
      {
        id: 'academic_year',
        label: 'Academic year activated',
        complete: Boolean(activeYear),
        detail: activeYear?.label ?? null,
      },
      {
        id: 'fee_structures',
        label: 'Fee structures configured',
        complete: feeStructuresConfigured,
        detail: feeStructuresConfigured ? 'At least one class level' : null,
      },
      {
        id: 'psf_review',
        label: 'PSF rate aligned with fees',
        complete: !psfSuggestionPending,
        detail: psfSuggestionPending
          ? `Suggested ${suggestedPsfRateMinor} kobo from fee structure`
          : null,
      },
    ];

    const completedStepCount = steps.filter((step) => step.complete).length;

    return {
      readyForOperations:
        tenant?.status === 'active' &&
        ownerSetup.hasOwnerAccount &&
        Boolean(ownerSetup.setupEmailSentAt) &&
        feeStructuresConfigured &&
        Boolean(activeYear),
      completedStepCount,
      totalStepCount: steps.length,
      steps,
      suggestedPsfBasisMinor,
    };
  },
};
