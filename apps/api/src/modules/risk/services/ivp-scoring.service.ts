import type { IvpSignalType } from '@loomis/contracts';
import { signalRepository } from '../repository/signal.repository.js';
import type { CollectedSignals, IvpScoreResult } from '../types.js';
import {
  IVP_OPEN_CASE_THRESHOLD,
  IVP_SCORE_WEIGHTS,
  IVP_URGENT_THRESHOLD,
  IVP_WATCHLIST_THRESHOLD,
} from '../types.js';

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function zScore(value: number, history: number[], platformBaseline: number[]): number {
  const baseline = history.length >= 5 ? history : platformBaseline;
  if (baseline.length === 0) return value > 0 ? 1 : 0;
  const m = mean(baseline);
  const sd = stddev(baseline);
  if (sd === 0) return value > m ? 1 : 0;
  return (value - m) / sd;
}

const SIGNAL_MAP: Record<
  IvpSignalType,
  (signals: CollectedSignals) => number
> = {
  attendance_anomaly: (s) => s.attendanceAnomaly,
  gradebook_anomaly: (s) => s.gradebookAnomaly,
  payment_volume: (s) => s.paymentVolumeRatioMilli,
  device_count: (s) => s.deviceCount,
  parent_link: (s) => s.parentLinkAnomaly,
};

export const ivpScoringService = {
  async scoreTenantTerm(
    tenantId: string,
    termId: string,
    signals: CollectedSignals,
    reportedEnrollment: number,
  ): Promise<IvpScoreResult> {
    const zScores: Record<string, number> = {};
    let composite = 0;

    for (const [signalType, weight] of Object.entries(IVP_SCORE_WEIGHTS) as [
      IvpSignalType,
      number,
    ][]) {
      const value = SIGNAL_MAP[signalType](signals);
      const history = await signalRepository.listHistoricalValues(tenantId, termId, signalType);
      const platform = await signalRepository.listPlatformBaseline(signalType);
      const z = zScore(value, history, platform);
      zScores[signalType] = z;
      composite += weight * z;
    }

    let priority: IvpScoreResult['priority'] = 'standard';
    if (composite >= IVP_URGENT_THRESHOLD) priority = 'urgent';
    else if (composite >= IVP_OPEN_CASE_THRESHOLD) priority = 'standard';
    else if (composite >= IVP_WATCHLIST_THRESHOLD) priority = 'watchlist';

    const estimatedMin = Math.max(0, reportedEnrollment);
    const estimatedMax = Math.max(signals.activityEstimate, reportedEnrollment);

    return {
      compositeScore: composite,
      zScores,
      priority,
      estimatedMin,
      estimatedMax,
    };
  },
};
