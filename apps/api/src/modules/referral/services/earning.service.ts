import { LEDGER_EVENT_TYPES, REFERRAL_EVENT_TYPES } from '@loomis/contracts';
import { eq } from 'drizzle-orm';
import { psfObligations } from '../../../../drizzle/schema/ledger.js';
import { ivpAnomalyCases } from '../../../../drizzle/schema/risk.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { ACTIVE_IVP_STATUSES } from '../../risk/types.js';
import {
  attributionRepository,
  earningRepository,
  kycRepository,
  participantRepository,
  payoutRepository,
  processedEventsRepository,
  referralOutboxRepository,
} from '../repository/index.js';
import { DEFAULT_REFERRAL_RULES } from '../types.js';
import { computeEarningAmountMinor } from '../utils/referral-code.js';
import type { EarningStatus } from '@loomis/contracts';

interface PsfSettledPayload {
  tenantId: string;
  obligationId: string;
  settledAmountMinor: number;
  termId: string;
  studentId: string;
}

interface EarningDraft {
  participantId: string;
  earningType: 'direct' | 'manager_override';
  rateBasisPoints: number;
  amountMinor: number;
  holdReason: string | null;
  status: EarningStatus;
}

export const earningService = {
  async getOrCreateOpenCycle() {
    return withTenantContext(null, async (tx) => {
      const open = await payoutRepository.findOpenCycle(tx);
      if (open) return open;

      const now = new Date();
      const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

      return payoutRepository.createOpenCycle(tx, {
        periodStart,
        periodEnd,
        rulesSnapshot: DEFAULT_REFERRAL_RULES,
      });
    });
  },

  async handlePsfObligationSettled(event: {
    event_id: string;
    payload: PsfSettledPayload;
  }): Promise<void> {
    const payload = event.payload;
    const { tenantId, obligationId, settledAmountMinor } = payload;

    await withTenantContext(tenantId, async (tx) => {
      const claimed = await processedEventsRepository.claim(
        tx,
        event.event_id,
        LEDGER_EVENT_TYPES.psfObligationSettled,
      );
      if (!claimed) return;

      const idempotencyKey = `psf-settled:${obligationId}`;
      const existing = await earningRepository.findByIdempotencyKey(tx, idempotencyKey);
      if (existing) return;

      const [obligation] = await tx
        .select()
        .from(psfObligations)
        .where(eq(psfObligations.id, obligationId))
        .limit(1);
      if (!obligation || obligation.status === 'disputed') return;

      const attribution = await attributionRepository.findByTenant(tx, tenantId);
      if (!attribution || attribution.status === 'forfeited') return;

      const ivpRows = await tx
        .select()
        .from(ivpAnomalyCases)
        .where(eq(ivpAnomalyCases.tenantId, tenantId));
      const ivpActive = ivpRows.some((row) =>
        ACTIVE_IVP_STATUSES.includes(row.caseStatus as (typeof ACTIVE_IVP_STATUSES)[number]),
      );

      const cycle =
        (await payoutRepository.findOpenCycle(tx)) ??
        (await withTenantContext(null, async (platformTx) => {
          const now = new Date();
          const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
          const periodEnd = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59),
          );
          return payoutRepository.createOpenCycle(platformTx, {
            periodStart,
            periodEnd,
            rulesSnapshot: DEFAULT_REFERRAL_RULES,
          });
        }));

      const rules = DEFAULT_REFERRAL_RULES;
      const drafts = await this.buildEarningDrafts(
        tx,
        attribution,
        settledAmountMinor,
        rules,
        ivpActive,
        attribution.status === 'flagged' || attribution.status === 'held',
      );

      for (const draft of drafts) {
        if (draft.amountMinor <= 0) continue;

        const entry = await earningRepository.create(tx, {
          participantId: draft.participantId,
          tenantId,
          attributionId: attribution.id,
          psfObligationId: obligationId,
          payoutCycleId: cycle.id,
          earningType: draft.earningType,
          amountMinor: draft.amountMinor,
          psfSettledAmountMinor: settledAmountMinor,
          rateBasisPoints: draft.rateBasisPoints,
          status: draft.status,
          holdReason: draft.holdReason,
          idempotencyKey:
            draft.earningType === 'direct'
              ? idempotencyKey
              : `${idempotencyKey}:override`,
        });

        if (entry) {
          await referralOutboxRepository.append(tx, {
            tenantId,
            aggregateType: 'earning_entry',
            aggregateId: entry.id,
            eventType: REFERRAL_EVENT_TYPES.earningAccrued,
            payload: {
              earningEntryId: entry.id,
              participantId: entry.participantId,
              tenantId,
              amountMinor: entry.amountMinor,
              status: entry.status,
            },
          });
        }
      }
    });
  },

  async buildEarningDrafts(
    tx: Parameters<typeof participantRepository.findById>[0],
    attribution: NonNullable<Awaited<ReturnType<typeof attributionRepository.findByTenant>>>,
    psfSettledMinor: number,
    rules: typeof DEFAULT_REFERRAL_RULES,
    ivpActive: boolean,
    attributionHeld: boolean,
  ): Promise<EarningDraft[]> {
    const directParticipant = await participantRepository.findById(
      tx,
      attribution.directParticipantId,
    );
    if (!directParticipant || directParticipant.status === 'deactivated') {
      return [];
    }

    const directKyc = await kycRepository.hasApprovedKyc(tx, directParticipant.id);
    if (!directKyc) return [];

    const holdReason = ivpActive
      ? 'ivp_case'
      : attributionHeld
        ? 'attribution_flagged'
        : directParticipant.status !== 'active'
          ? 'participant_deactivated'
          : null;

    const status: EarningStatus = holdReason ? 'held' : 'accrued';

    const isSubordinate = directParticipant.participantType === 'regional_subordinate';
    const directRate = isSubordinate
      ? rules.subordinateDirectRateBps
      : rules.managerDirectRateBps;

    const drafts: EarningDraft[] = [
      {
        participantId: directParticipant.id,
        earningType: 'direct',
        rateBasisPoints: directRate,
        amountMinor: computeEarningAmountMinor(psfSettledMinor, directRate),
        holdReason,
        status,
      },
    ];

    if (isSubordinate && attribution.managerParticipantId) {
      const manager = await participantRepository.findById(tx, attribution.managerParticipantId);
      const managerKyc =
        manager && manager.status === 'active'
          ? await kycRepository.hasApprovedKyc(tx, manager.id)
          : false;

      if (manager && managerKyc) {
        const overrideRate = rules.managerOverrideRateBps;
        drafts.push({
          participantId: manager.id,
          earningType: 'manager_override',
          rateBasisPoints: overrideRate,
          amountMinor: computeEarningAmountMinor(psfSettledMinor, overrideRate),
          holdReason,
          status,
        });
      }
    }

    return drafts;
  },

  async holdEarningsForTenant(tenantId: string, holdReason: string): Promise<void> {
    await withTenantContext(tenantId, async (tx) => {
      await earningRepository.updateStatusByTenant(
        tx,
        tenantId,
        ['accrued', 'eligible'],
        'held',
        holdReason,
      );
      const attribution = await attributionRepository.findByTenant(tx, tenantId);
      if (attribution) {
        await attributionRepository.updateStatus(tx, attribution.id, 'held', holdReason);
      }
    });
  },

  async releaseHeldEarningsForTenant(tenantId: string): Promise<void> {
    await withTenantContext(tenantId, async (tx) => {
      const attribution = await attributionRepository.findByTenant(tx, tenantId);
      if (!attribution || attribution.status === 'forfeited' || attribution.status === 'flagged') {
        return;
      }

      const ivpRows = await tx
        .select()
        .from(ivpAnomalyCases)
        .where(eq(ivpAnomalyCases.tenantId, tenantId));
      const ivpActive = ivpRows.some((row) =>
        ACTIVE_IVP_STATUSES.includes(row.caseStatus as (typeof ACTIVE_IVP_STATUSES)[number]),
      );
      if (ivpActive) return;

      await earningRepository.updateStatusByTenant(tx, tenantId, ['held'], 'accrued', null);
      if (attribution.status === 'held') {
        await attributionRepository.updateStatus(tx, attribution.id, 'active', null);
      }
    });
  },

  async getMyEarnings(participantId: string) {
    return earningRepository.listForParticipantGlobal(participantId);
  },

  async getEarningsSummary(participantId: string) {
    const entries = await earningRepository.listForParticipantGlobal(participantId);
    const byTenant = new Map<
      string,
      { accruedMinor: number; heldMinor: number; eligibleMinor: number }
    >();

    let totalAccruedMinor = 0;
    let totalHeldMinor = 0;
    let totalEligibleMinor = 0;
    let totalPaidMinor = 0;

    for (const entry of entries) {
      if (entry.status === 'accrued') totalAccruedMinor += entry.amountMinor;
      if (entry.status === 'held') totalHeldMinor += entry.amountMinor;
      if (entry.status === 'eligible') totalEligibleMinor += entry.amountMinor;
      if (entry.status === 'paid') totalPaidMinor += entry.amountMinor;

      const bucket = byTenant.get(entry.tenantId) ?? {
        accruedMinor: 0,
        heldMinor: 0,
        eligibleMinor: 0,
      };
      if (entry.status === 'accrued') bucket.accruedMinor += entry.amountMinor;
      if (entry.status === 'held') bucket.heldMinor += entry.amountMinor;
      if (entry.status === 'eligible') bucket.eligibleMinor += entry.amountMinor;
      byTenant.set(entry.tenantId, bucket);
    }

    return {
      participantId,
      totalAccruedMinor,
      totalHeldMinor,
      totalEligibleMinor,
      totalPaidMinor,
      byTenant: [...byTenant.entries()].map(([tenantId, totals]) => ({ tenantId, ...totals })),
    };
  },
};
