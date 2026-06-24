import { REFERRAL_EVENT_TYPES } from '@loomis/contracts';
import { sql } from 'drizzle-orm';
import { earningEntries } from '../../../../drizzle/schema/referral.js';
import { writeAudit } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { earningRepository, payoutRepository, referralOutboxRepository } from '../repository/index.js';
import type { ActorContext } from '../types.js';
import { DEFAULT_REFERRAL_RULES, PLATFORM_ROLES, TENANT_PAYOUT_CAP_BPS } from '../types.js';

export const payoutService = {
  async listCycles(actor: ActorContext) {
    if (
      !PLATFORM_ROLES.has(actor.role) &&
      actor.role !== 'regional_manager' &&
      actor.role !== 'regional_subordinate'
    ) {
      throw new LoomisError('FORBIDDEN', 403, 'Access denied');
    }
    return payoutRepository.listRecentGlobal();
  },

  async getCycle(cycleId: string, actor: ActorContext) {
    const cycle = await payoutRepository.findByIdGlobal(cycleId);
    if (!cycle) {
      throw new LoomisError('REFERRAL_PAYOUT_CYCLE_NOT_FOUND', 404, 'Payout cycle not found');
    }
    if (
      !PLATFORM_ROLES.has(actor.role) &&
      actor.role !== 'regional_manager' &&
      actor.role !== 'regional_subordinate'
    ) {
      throw new LoomisError('FORBIDDEN', 403, 'Access denied');
    }
    return cycle;
  },

  /** US-REF-004 — forty-percent cap check for a tenant in a cycle. */
  async checkTenantCap(tenantId: string, cycleId: string, actor: ActorContext) {
    if (!PLATFORM_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Platform role required');
    }

    const cycle = await payoutRepository.findByIdGlobal(cycleId);
    if (!cycle) {
      throw new LoomisError('REFERRAL_PAYOUT_CYCLE_NOT_FOUND', 404, 'Payout cycle not found');
    }

    return withTenantContext(tenantId, async (tx) => {
      const psfCollectedMinor = await earningRepository.sumPsfCollectedForTenantCycle(
        tx,
        tenantId,
        cycleId,
      );
      const capMinor = Math.floor((psfCollectedMinor * TENANT_PAYOUT_CAP_BPS) / 10_000);
      const accrued = await earningRepository.sumByTenantAndCycle(tx, tenantId, cycleId, [
        'accrued',
        'held',
        'eligible',
      ]);
      const referralAccruedMinor = accrued.amountMinor;
      const remainingCapMinor = Math.max(0, capMinor - referralAccruedMinor);
      const capExceeded = referralAccruedMinor > capMinor;
      const heldForCapMinor = capExceeded ? referralAccruedMinor - capMinor : 0;

      return {
        tenantId,
        payoutCycleId: cycleId,
        psfCollectedMinor,
        capMinor,
        referralAccruedMinor,
        remainingCapMinor,
        capExceeded,
        heldForCapMinor,
      };
    });
  },

  /**
   * Closes a payout cycle applying the 40% per-tenant cap (FR-REF-004 / CON-016).
   * Excess earnings are marked `carried_forward` for the next cycle.
   */
  async closeCycle(cycleId: string, actor: ActorContext, requestId: string) {
    if (!PLATFORM_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Platform role required');
    }

    const cycle = await payoutRepository.findByIdGlobal(cycleId);
    if (!cycle) {
      throw new LoomisError('REFERRAL_PAYOUT_CYCLE_NOT_FOUND', 404, 'Payout cycle not found');
    }
    if (cycle.status !== 'open') {
      throw new LoomisError('REFERRAL_PAYOUT_CYCLE_CLOSED', 409, 'Payout cycle is not open');
    }

    const rules = (cycle.rulesSnapshot as typeof DEFAULT_REFERRAL_RULES) ?? DEFAULT_REFERRAL_RULES;
    const capBps = rules.tenantPayoutCapBps ?? TENANT_PAYOUT_CAP_BPS;

    const tenantCapUsage: Record<
      string,
      { psfCollectedMinor: number; referralPaidMinor: number; capMinor: number }
    > = {};
    let totalPayoutMinor = 0;

    const tenantIdRows = await withTenantContext(null, async (tx) =>
      tx
        .selectDistinct({ tenantId: earningEntries.tenantId })
        .from(earningEntries)
        .where(sql`${earningEntries.payoutCycleId} = ${cycleId}`),
    );

    for (const { tenantId } of tenantIdRows) {
      const result = await withTenantContext(tenantId, async (tx) => {
        const psfCollectedMinor = await earningRepository.sumPsfCollectedForTenantCycle(
          tx,
          tenantId,
          cycleId,
        );
        const capMinor = Math.floor((psfCollectedMinor * capBps) / 10_000);
        const entries = await earningRepository.listByCycleAndTenant(tx, cycleId, tenantId);

        const payable = entries.filter((e) => e.status === 'accrued' && !e.holdReason);
        let runningTotal = 0;
        const eligibleIds: string[] = [];
        const carriedIds: string[] = [];

        for (const entry of payable) {
          if (runningTotal + entry.amountMinor <= capMinor) {
            runningTotal += entry.amountMinor;
            eligibleIds.push(entry.id);
          } else {
            carriedIds.push(entry.id);
          }
        }

        if (eligibleIds.length > 0) {
          await earningRepository.updateStatuses(tx, eligibleIds, 'eligible');
        }
        if (carriedIds.length > 0) {
          await earningRepository.updateStatuses(
            tx,
            carriedIds,
            'carried_forward',
            'cap_exceeded',
          );
        }

        return { psfCollectedMinor, referralPaidMinor: runningTotal, capMinor };
      });

      tenantCapUsage[tenantId] = result;
      totalPayoutMinor += result.referralPaidMinor;
    }

    const closed = await withTenantContext(null, async (tx) => {
      const row = await payoutRepository.closeCycle(tx, cycleId, {
        totalPayoutMinor,
        tenantCapUsage,
      });
      if (!row) {
        throw new LoomisError('REFERRAL_PAYOUT_CYCLE_NOT_FOUND', 404, 'Payout cycle not found');
      }

      await referralOutboxRepository.append(tx, {
        tenantId: null,
        aggregateType: 'payout_cycle',
        aggregateId: row.id,
        eventType: REFERRAL_EVENT_TYPES.payoutCycleClosed,
        payload: {
          payoutCycleId: row.id,
          totalPayoutMinor,
          tenantCapUsage,
        },
      });

      const nextStart = new Date(row.periodEnd.getTime() + 1000);
      const nextEnd = new Date(
        Date.UTC(nextStart.getUTCFullYear(), nextStart.getUTCMonth() + 1, 0, 23, 59, 59),
      );
      await payoutRepository.createOpenCycle(tx, {
        periodStart: nextStart,
        periodEnd: nextEnd,
        rulesSnapshot: rules,
      });

      return row;
    });

    await writeAudit({
      tenantId: null,
      actorUserId: actor.userId,
      action: 'referral.payout_cycle.closed',
      resourceType: 'payout_cycle',
      resourceId: closed.id,
      sensitivity: 'financial',
      result: 'success',
      requestId,
    });

    return closed;
  },
};
