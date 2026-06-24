import { registerEventHandler } from '../../../shared/events/registry.js';
import { LEDGER_EVENT_TYPES } from '@loomis/contracts';
import { RISK_EVENT_TYPES } from '@loomis/contracts';
import { TENANT_EVENT_TYPES } from '../../tenant/events/types.js';
import { handleIvpCaseClosed, handleIvpCaseOpened } from './consumers/ivp-case.consumer.js';
import { handlePsfObligationSettled } from './consumers/psf-settled.consumer.js';
import { handleTenantProvisioned } from './consumers/tenant-provisioned.consumer.js';

/** Registers Referral module event consumers (System Design §3.2 Referral row). */
export function registerReferralEventConsumers(): void {
  registerEventHandler(LEDGER_EVENT_TYPES.psfObligationSettled, handlePsfObligationSettled);
  registerEventHandler(TENANT_EVENT_TYPES.provisioned, handleTenantProvisioned);
  registerEventHandler(RISK_EVENT_TYPES.ivpCaseOpened, handleIvpCaseOpened);
  registerEventHandler(RISK_EVENT_TYPES.ivpCaseClosed, handleIvpCaseClosed);
}

export { REFERRAL_CONSUMED_EVENT_TYPES } from './types.js';
