import { RISK_EVENT_TYPES } from '@loomis/contracts';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { RISK_EVENT_TYPES as LOCAL_EVENTS } from '../events/types.js';
import {
  caseRepository,
  riskOutboxRepository,
  signalRepository,
} from '../repository/index.js';
import type { IvpSignalType } from '@loomis/contracts';
import { ivpScoringService } from './ivp-scoring.service.js';
import { IVP_OPEN_CASE_THRESHOLD } from '../types.js';

const SNAPSHOT_SIGNALS: Array<{
  type: IvpSignalType;
  pick: (s: Awaited<ReturnType<typeof signalRepository.collectSignals>>) => number;
}> = [
  { type: 'attendance_anomaly', pick: (s) => s.attendanceAnomaly },
  { type: 'gradebook_anomaly', pick: (s) => s.gradebookAnomaly },
  { type: 'payment_volume', pick: (s) => s.paymentVolumeRatioMilli },
  { type: 'device_count', pick: (s) => s.deviceCount },
  { type: 'parent_link', pick: (s) => s.parentLinkAnomaly },
];

export const ivpBatchService = {
  /** Nightly IVP batch (System Design §8.2, 02:00 UTC). */
  async runNightlyBatch(): Promise<{ processed: number; casesOpened: number }> {
    const targets = await caseRepository.listCensusLockedTermsForBatch();
    let casesOpened = 0;

    for (const target of targets) {
      const tenantId = target.tenantId;
      const termId = target.termId;
      const reportedEnrollment = Number(target.reportedEnrollment ?? 0);

      const signals = await signalRepository.collectSignals(tenantId, termId);
      const score = await ivpScoringService.scoreTenantTerm(
        tenantId,
        termId,
        signals,
        reportedEnrollment,
      );

      await withTenantContext(tenantId, async (tx) => {
        for (const snap of SNAPSHOT_SIGNALS) {
          await signalRepository.upsertSnapshot(tx, {
            tenantId,
            termId,
            signalType: snap.type,
            signalValue: snap.pick(signals),
            metadata: { compositeScore: score.compositeScore },
          });
        }

        await riskOutboxRepository.append(tx, {
          tenantId,
          aggregateType: 'ivp_signal_batch',
          aggregateId: termId,
          eventType: RISK_EVENT_TYPES.signalDetected,
          payload: {
            tenantId,
            termId,
            signals,
            zScores: score.zScores,
            compositeScore: score.compositeScore,
          },
        });

        if (score.compositeScore < IVP_OPEN_CASE_THRESHOLD) return;

        const hasCase = await caseRepository.hasActiveCaseForTermInTx(tx, tenantId, termId);
        if (hasCase) return;

        const anomalyScore = Math.round(score.compositeScore * 1000);
        const ivpCase = await caseRepository.create(tx, {
          tenantId,
          termId,
          reportedEnrollment,
          estimatedMin: score.estimatedMin,
          estimatedMax: score.estimatedMax,
          anomalyScore,
          priority: score.priority,
          signalsAnalyzed: {
            raw: signals,
            zScores: score.zScores,
            compositeScore: score.compositeScore,
          },
        });

        await riskOutboxRepository.append(tx, {
          tenantId,
          aggregateType: 'ivp_anomaly_case',
          aggregateId: ivpCase.id,
          eventType: LOCAL_EVENTS.ivpCaseOpened,
          payload: {
            caseId: ivpCase.id,
            tenantId,
            termId,
            anomalyScore: score.compositeScore,
            priority: score.priority,
            reportedEnrollment,
            estimatedMin: score.estimatedMin,
            estimatedMax: score.estimatedMax,
          },
        });

        casesOpened += 1;
      });
    }

    return { processed: targets.length, casesOpened };
  },
};
