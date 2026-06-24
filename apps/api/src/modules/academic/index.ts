import type { FastifyInstance } from 'fastify';
import { registerAcademicEventConsumers } from './events/index.js';
import { academicYearsRoutes } from './routes/academic-years.routes.js';
import { assignmentRoutes } from './routes/assignments.routes.js';
import { attendanceRoutes } from './routes/attendance.routes.js';
import { billingRoutes } from './routes/billing.routes.js';
import { classStructureRoutes } from './routes/class-structure.routes.js';
import { gradebookRoutes } from './routes/gradebook.routes.js';
import { promotionRoutes } from './routes/promotion.routes.js';
import { termsRoutes } from './routes/terms.routes.js';
import { teachingRoutes } from './routes/teaching.routes.js';
import { timetableRoutes } from './routes/timetable.routes.js';

import { startEnrollmentSnapshotJob } from './jobs/enrollment-snapshot.job.js';

/**
 * Academic Session module plugin (Phase 1, step 4). Years, terms, platform billing,
 * class structure, and promotion (loomis-module-patterns).
 */
export async function academicModule(app: FastifyInstance): Promise<void> {
  registerAcademicEventConsumers();
  await startEnrollmentSnapshotJob();
  await app.register(academicYearsRoutes);
  await app.register(termsRoutes);
  await app.register(billingRoutes);
  await app.register(classStructureRoutes);
  await app.register(promotionRoutes);
  await app.register(gradebookRoutes);
  await app.register(attendanceRoutes);
  await app.register(timetableRoutes);
  await app.register(teachingRoutes);
  await app.register(assignmentRoutes);
}

export { termService } from './services/index.js';
