import type { LateEnrolledEvent } from '../types.js';
import { obligationService } from '../../services/obligation.service.js';

/** Consumes `student.late_enrolled` → immediate PSF obligation at census rate. */
export async function handleLateEnrolled(event: LateEnrolledEvent): Promise<void> {
  await obligationService.handleLateEnrolled(event);
}
