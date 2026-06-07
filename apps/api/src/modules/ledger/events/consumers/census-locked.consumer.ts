import type { CensusLockedEvent } from '../types.js';
import { obligationService } from '../../services/obligation.service.js';

/** Consumes `academic.term.census_locked` → PSF obligations + ledger postings. */
export async function handleCensusLocked(event: CensusLockedEvent): Promise<void> {
  await obligationService.handleCensusLocked(event);
}
