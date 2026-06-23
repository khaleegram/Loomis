import { and, asc, eq, gte, inArray, isNull, lte, ne, sql } from 'drizzle-orm';
import {
  academicTerms,
  academicYears,
  classArms,
  classLevels,
  classProgressionMap,
  examConfigs,
  gradebookEntries,
  gradeCorrectionLogs,
  gradingSchemes,
  results,
  studentPromotionRecords,
} from '../../../../drizzle/schema/academic.js';
import { enrollments } from '../../../../drizzle/schema/student.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type {
  ConfigureTermInput,
  CreateAcademicYearInput,
  CreateExamConfigInput,
  CreateGradingSchemeInput,
  GradeCalculation,
  PromotionDecisionInput,
  PublishResultsInput,
  RequestGradeCorrectionInput,
  UpsertGradebookEntryInput,
} from '../types.js';

/** Default placeholder term names created at year activation (FR-ASM-002). */
function defaultTermName(sequence: number): string {
  const names = ['First Term', 'Second Term', 'Third Term'];
  return names[sequence - 1] ?? `Term ${sequence}`;
}

export const academicRepository = {
  // ── Academic years ───────────────────────────────────────────────────────────

  async createYear(tenantId: string, input: CreateAcademicYearInput, createdById: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [year] = await tx
        .insert(academicYears)
        .values({
          tenantId,
          label: input.label,
          startDate: input.startDate,
          endDate: input.endDate,
          termCount: input.termCount,
          createdById,
        })
        .returning();
      if (!year) throw new Error('Failed to create academic year');
      return year;
    });
  },

  async findYearById(tenantId: string, yearId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [year] = await tx
        .select()
        .from(academicYears)
        .where(and(eq(academicYears.tenantId, tenantId), eq(academicYears.id, yearId)))
        .limit(1);
      return year ?? null;
    });
  },

  async listYears(tenantId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(academicYears)
        .where(eq(academicYears.tenantId, tenantId))
        .orderBy(asc(academicYears.startDate)),
    );
  },

  async findActiveYear(tenantId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [year] = await tx
        .select()
        .from(academicYears)
        .where(and(eq(academicYears.tenantId, tenantId), eq(academicYears.status, 'active')))
        .limit(1);
      return year ?? null;
    });
  },

  /**
   * All years whose date range overlaps [start, end] (FR-ASM-001 overlap guard).
   * Dates are stored as ISO `date` strings, so lexical comparison is also
   * chronological; the overlap test is `existing.start <= new.end AND
   * existing.end >= new.start`.
   */
  async listOverlappingYears(tenantId: string, startDate: string, endDate: string) {
    return withTenantContext(tenantId, async (tx) => {
      const rows = await tx
        .select()
        .from(academicYears)
        .where(
          and(
            eq(academicYears.tenantId, tenantId),
            lte(academicYears.startDate, endDate),
            gte(academicYears.endDate, startDate),
          ),
        );
      return rows;
    });
  },

  /**
   * Activates a draft year and creates its draft term placeholders in ONE
   * transaction (FR-ASM-002). Activation is irreversible.
   */
  async activateYearWithTerms(tenantId: string, yearId: string, actorUserId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [year] = await tx
        .update(academicYears)
        .set({ status: 'active', activatedAt: now, activatedById: actorUserId, updatedAt: now })
        .where(
          and(
            eq(academicYears.tenantId, tenantId),
            eq(academicYears.id, yearId),
            eq(academicYears.status, 'draft'),
          ),
        )
        .returning();
      if (!year) return null;

      const existing = await tx
        .select({ id: academicTerms.id })
        .from(academicTerms)
        .where(and(eq(academicTerms.tenantId, tenantId), eq(academicTerms.academicYearId, yearId)))
        .limit(1);

      if (existing.length === 0) {
        const rows = Array.from({ length: year.termCount }, (_, i) => ({
          tenantId,
          academicYearId: yearId,
          name: defaultTermName(i + 1),
          sequence: i + 1,
          createdById: actorUserId,
        }));
        await tx.insert(academicTerms).values(rows);
      }

      return year;
    });
  },

  async closeYear(tenantId: string, yearId: string, actorUserId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [year] = await tx
        .update(academicYears)
        .set({ status: 'closed', closedAt: now, closedById: actorUserId, updatedAt: now })
        .where(
          and(
            eq(academicYears.tenantId, tenantId),
            eq(academicYears.id, yearId),
            eq(academicYears.status, 'active'),
          ),
        )
        .returning();
      return year ?? null;
    });
  },

  // ── Terms ────────────────────────────────────────────────────────────────────

  async findTermById(tenantId: string, termId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [term] = await tx
        .select()
        .from(academicTerms)
        .where(and(eq(academicTerms.tenantId, tenantId), eq(academicTerms.id, termId)))
        .limit(1);
      return term ?? null;
    });
  },

  async listTermsByYear(tenantId: string, yearId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(academicTerms)
        .where(and(eq(academicTerms.tenantId, tenantId), eq(academicTerms.academicYearId, yearId)))
        .orderBy(asc(academicTerms.sequence)),
    );
  },

  /** The term immediately preceding `sequence` in the same year (CON-019). */
  async findTermBySequence(tenantId: string, yearId: string, sequence: number) {
    return withTenantContext(tenantId, async (tx) => {
      const [term] = await tx
        .select()
        .from(academicTerms)
        .where(
          and(
            eq(academicTerms.tenantId, tenantId),
            eq(academicTerms.academicYearId, yearId),
            eq(academicTerms.sequence, sequence),
          ),
        )
        .limit(1);
      return term ?? null;
    });
  },

  /** True if any term outside `yearId` is still open or census-locked (CON-020). */
  async hasUnclosedTermsOutsideYear(tenantId: string, yearId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const rows = await tx
        .select({ id: academicTerms.id })
        .from(academicTerms)
        .where(
          and(
            eq(academicTerms.tenantId, tenantId),
            ne(academicTerms.academicYearId, yearId),
            inArray(academicTerms.status, ['open', 'census_locked']),
          ),
        )
        .limit(1);
      return rows.length > 0;
    });
  },

  async configureTerm(tenantId: string, termId: string, input: ConfigureTermInput) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [term] = await tx
        .update(academicTerms)
        .set({
          name: input.name,
          startDate: input.startDate,
          endDate: input.endDate,
          enrollmentWindowOpenDate: input.enrollmentWindowOpenDate,
          enrollmentWindowCloseDate: input.enrollmentWindowCloseDate,
          censusLockDate: input.censusLockDate,
          examStartDate: input.examStartDate ?? null,
          examEndDate: input.examEndDate ?? null,
          updatedAt: now,
        })
        .where(
          and(
            eq(academicTerms.tenantId, tenantId),
            eq(academicTerms.id, termId),
            eq(academicTerms.status, 'draft'),
          ),
        )
        .returning();
      return term ?? null;
    });
  },

  async openTerm(tenantId: string, termId: string, actorUserId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [term] = await tx
        .update(academicTerms)
        .set({ status: 'open', openedAt: now, openedById: actorUserId, updatedAt: now })
        .where(
          and(
            eq(academicTerms.tenantId, tenantId),
            eq(academicTerms.id, termId),
            eq(academicTerms.status, 'draft'),
          ),
        )
        .returning();
      return term ?? null;
    });
  },

  async closeTerm(tenantId: string, termId: string, actorUserId: string, overrideReason: string | null) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [term] = await tx
        .update(academicTerms)
        .set({
          status: 'closed',
          closedAt: now,
          closedById: actorUserId,
          closureOverrideReason: overrideReason,
          updatedAt: now,
        })
        .where(
          and(
            eq(academicTerms.tenantId, tenantId),
            eq(academicTerms.id, termId),
            eq(academicTerms.status, 'census_locked'),
          ),
        )
        .returning();
      return term ?? null;
    });
  },

  /**
   * Flips a term to `census_locked` inside the caller's SERIALIZABLE transaction.
   * Attestation and outbox append are orchestrated by censusService.
   */
  async lockCensusInTx(
    tx: Executor,
    params: {
      tenantId: string;
      termId: string;
      declaredBillableCount: number;
      systemBillableCount: number;
      varianceReason: string | null;
      attestedById: string;
      lockedAt: Date;
    },
  ) {
    const [term] = await tx
      .update(academicTerms)
      .set({
        status: 'census_locked',
        declaredBillableCount: params.declaredBillableCount,
        systemBillableCount: params.systemBillableCount,
        censusVarianceReason: params.varianceReason,
        censusLockedAt: params.lockedAt,
        censusLockedById: params.attestedById,
        updatedAt: params.lockedAt,
      })
      .where(
        and(
          eq(academicTerms.tenantId, params.tenantId),
          eq(academicTerms.id, params.termId),
          eq(academicTerms.status, 'open'),
        ),
      )
      .returning();
    return term ?? null;
  },

  // ── Class structure ────────────────────────────────────────────────────────────

  async createClassLevel(
    tenantId: string,
    input: { code: string; name: string; rank: number; isTerminal: boolean },
    createdById: string,
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const [level] = await tx
        .insert(classLevels)
        .values({ tenantId, ...input, createdById })
        .returning();
      if (!level) throw new Error('Failed to create class level');
      return level;
    });
  },

  async findClassLevelById(tenantId: string, levelId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [level] = await tx
        .select()
        .from(classLevels)
        .where(and(eq(classLevels.tenantId, tenantId), eq(classLevels.id, levelId)))
        .limit(1);
      return level ?? null;
    });
  },

  async listClassLevels(tenantId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(classLevels)
        .where(eq(classLevels.tenantId, tenantId))
        .orderBy(asc(classLevels.rank)),
    );
  },

  async createClassArm(
    tenantId: string,
    input: { academicYearId: string; classLevelId: string; name: string },
    createdById: string,
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const [arm] = await tx
        .insert(classArms)
        .values({ tenantId, ...input, createdById })
        .returning();
      if (!arm) throw new Error('Failed to create class arm');
      return arm;
    });
  },

  async listClassArms(tenantId: string, academicYearId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(classArms)
        .where(
          and(eq(classArms.tenantId, tenantId), eq(classArms.academicYearId, academicYearId)),
        ),
    );
  },

  async findClassArmById(tenantId: string, classArmId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [arm] = await tx
        .select()
        .from(classArms)
        .where(and(eq(classArms.tenantId, tenantId), eq(classArms.id, classArmId)))
        .limit(1);
      return arm ?? null;
    });
  },

  async upsertProgression(
    tenantId: string,
    input: { fromClassLevelId: string; toClassLevelId: string | null; isTerminal: boolean },
    createdById: string,
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [existing] = await tx
        .select()
        .from(classProgressionMap)
        .where(
          and(
            eq(classProgressionMap.tenantId, tenantId),
            eq(classProgressionMap.fromClassLevelId, input.fromClassLevelId),
          ),
        )
        .limit(1);

      if (existing) {
        const [updated] = await tx
          .update(classProgressionMap)
          .set({
            toClassLevelId: input.toClassLevelId,
            isTerminal: input.isTerminal,
            updatedAt: now,
          })
          .where(eq(classProgressionMap.id, existing.id))
          .returning();
        if (!updated) throw new Error('Failed to update progression');
        return updated;
      }

      const [created] = await tx
        .insert(classProgressionMap)
        .values({ tenantId, ...input, createdById })
        .returning();
      if (!created) throw new Error('Failed to create progression');
      return created;
    });
  },

  async listProgressions(tenantId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(classProgressionMap)
        .where(eq(classProgressionMap.tenantId, tenantId)),
    );
  },

  // ── Promotion records ──────────────────────────────────────────────────────────

  /**
   * Stages a promotion list (FR-ASM-007). Replaces any existing `proposed`
   * records for the closing year so the list can be re-run before confirmation;
   * `confirmed` records are immutable and left untouched.
   */
  async stagePromotions(
    tenantId: string,
    fromAcademicYearId: string,
    toAcademicYearId: string,
    decisions: PromotionDecisionInput[],
    decidedById: string,
  ) {
    return withTenantContext(tenantId, async (tx) => {
      await tx
        .delete(studentPromotionRecords)
        .where(
          and(
            eq(studentPromotionRecords.tenantId, tenantId),
            eq(studentPromotionRecords.fromAcademicYearId, fromAcademicYearId),
            eq(studentPromotionRecords.status, 'proposed'),
          ),
        );

      const rows = decisions.map((d) => ({
        tenantId,
        studentId: d.studentId,
        fromAcademicYearId,
        toAcademicYearId,
        fromClassLevelId: d.fromClassLevelId,
        fromClassArmId: d.fromClassArmId,
        toClassLevelId: d.toClassLevelId,
        toClassArmId: d.toClassArmId,
        outcome: d.outcome,
        heldBackReason: d.heldBackReason ?? null,
        decidedById,
      }));
      return tx.insert(studentPromotionRecords).values(rows).returning();
    });
  },

  async listPromotions(tenantId: string, fromAcademicYearId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(studentPromotionRecords)
        .where(
          and(
            eq(studentPromotionRecords.tenantId, tenantId),
            eq(studentPromotionRecords.fromAcademicYearId, fromAcademicYearId),
          ),
        ),
    );
  },

  async confirmPromotions(
    tenantId: string,
    fromAcademicYearId: string,
    confirmedById: string,
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      return tx
        .update(studentPromotionRecords)
        .set({ status: 'confirmed', confirmedById, confirmedAt: now, updatedAt: now })
        .where(
          and(
            eq(studentPromotionRecords.tenantId, tenantId),
            eq(studentPromotionRecords.fromAcademicYearId, fromAcademicYearId),
            eq(studentPromotionRecords.status, 'proposed'),
          ),
        )
        .returning();
    });
  },

  // ── Grading schemes ─────────────────────────────────────────────────────────

  async createGradingScheme(tenantId: string, input: CreateGradingSchemeInput, createdById: string) {
    return withTenantContext(tenantId, async (tx) => {
      if (input.isDefault) {
        await tx
          .update(gradingSchemes)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(and(eq(gradingSchemes.tenantId, tenantId), eq(gradingSchemes.isDefault, true)));
      }

      const [scheme] = await tx
        .insert(gradingSchemes)
        .values({ tenantId, ...input, createdById })
        .returning();
      if (!scheme) throw new Error('Failed to create grading scheme');
      return scheme;
    });
  },

  async listGradingSchemes(tenantId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx.select().from(gradingSchemes).where(eq(gradingSchemes.tenantId, tenantId)).orderBy(asc(gradingSchemes.name)),
    );
  },

  async findGradingSchemeById(tenantId: string, schemeId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [scheme] = await tx
        .select()
        .from(gradingSchemes)
        .where(and(eq(gradingSchemes.tenantId, tenantId), eq(gradingSchemes.id, schemeId)))
        .limit(1);
      return scheme ?? null;
    });
  },

  // ── Exam configs ────────────────────────────────────────────────────────────

  async createExamConfig(tenantId: string, input: CreateExamConfigInput, configuredById: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [config] = await tx
        .insert(examConfigs)
        .values({ tenantId, ...input, configuredById })
        .returning();
      if (!config) throw new Error('Failed to create exam config');
      return config;
    });
  },

  async listExamConfigs(tenantId: string, termId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(examConfigs)
        .where(and(eq(examConfigs.tenantId, tenantId), eq(examConfigs.termId, termId)))
        .orderBy(asc(examConfigs.classArmId), asc(examConfigs.subjectId)),
    );
  },

  async findExamConfigById(tenantId: string, examConfigId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [config] = await tx
        .select()
        .from(examConfigs)
        .where(and(eq(examConfigs.tenantId, tenantId), eq(examConfigs.id, examConfigId)))
        .limit(1);
      return config ?? null;
    });
  },

  // ── Gradebook ───────────────────────────────────────────────────────────────

  async upsertGradebookEntry(input: {
    tenantId: string;
    gradebook: UpsertGradebookEntryInput;
    examConfig: typeof examConfigs.$inferSelect;
    calculation: GradeCalculation;
    teacherStaffProfileId: string;
  }) {
    return withTenantContext(input.tenantId, async (tx) => {
      const now = new Date();
      const [existing] = await tx
        .select()
        .from(gradebookEntries)
        .where(
          and(
            eq(gradebookEntries.tenantId, input.tenantId),
            eq(gradebookEntries.termId, input.examConfig.termId),
            eq(gradebookEntries.classArmId, input.examConfig.classArmId),
            eq(gradebookEntries.subjectId, input.examConfig.subjectId),
            eq(gradebookEntries.studentId, input.gradebook.studentId),
          ),
        )
        .limit(1);

      const values = {
        tenantId: input.tenantId,
        termId: input.examConfig.termId,
        classArmId: input.examConfig.classArmId,
        subjectId: input.examConfig.subjectId,
        studentId: input.gradebook.studentId,
        examConfigId: input.examConfig.id,
        gradingSchemeId: input.examConfig.gradingSchemeId,
        teacherStaffProfileId: input.teacherStaffProfileId,
        continuousAssessmentScore: input.gradebook.continuousAssessmentScore,
        examScore: input.gradebook.examScore,
        totalScore: input.calculation.totalScore,
        grade: input.calculation.grade,
        remark: input.calculation.remark,
      };

      if (existing) {
        if (existing.status === 'submitted') {
          return null;
        }
        const [entry] = await tx
          .update(gradebookEntries)
          .set({
            ...values,
            status: existing.status === 'corrected' ? 'corrected' : 'draft',
            updatedAt: now,
          })
          .where(
            and(
              eq(gradebookEntries.tenantId, input.tenantId),
              eq(gradebookEntries.id, existing.id),
              ne(gradebookEntries.status, 'correction_pending'),
            ),
          )
          .returning();
        return entry ?? null;
      }

      const [entry] = await tx.insert(gradebookEntries).values(values).returning();
      if (!entry) throw new Error('Failed to create gradebook entry');
      return entry;
    });
  },

  async listGradebookEntries(input: {
    tenantId: string;
    termId: string;
    classArmId: string;
    subjectId?: string;
  }) {
    return withTenantContext(input.tenantId, async (tx) =>
      tx
        .select()
        .from(gradebookEntries)
        .where(
          and(
            eq(gradebookEntries.tenantId, input.tenantId),
            eq(gradebookEntries.termId, input.termId),
            eq(gradebookEntries.classArmId, input.classArmId),
            ...(input.subjectId ? [eq(gradebookEntries.subjectId, input.subjectId)] : []),
          ),
        )
        .orderBy(asc(gradebookEntries.subjectId), asc(gradebookEntries.studentId)),
    );
  },

  async lockGradebookEntries(input: {
    tenantId: string;
    termId: string;
    classArmId: string;
    subjectId: string;
  }) {
    return withTenantContext(input.tenantId, async (tx) => {
      const now = new Date();
      const entries = await tx
        .select()
        .from(gradebookEntries)
        .where(
          and(
            eq(gradebookEntries.tenantId, input.tenantId),
            eq(gradebookEntries.termId, input.termId),
            eq(gradebookEntries.classArmId, input.classArmId),
            eq(gradebookEntries.subjectId, input.subjectId),
          ),
        );

      let lockedCount = 0;
      let alreadyLockedCount = 0;

      for (const entry of entries) {
        if (entry.status === 'submitted') {
          alreadyLockedCount += 1;
          continue;
        }
        if (entry.status === 'correction_pending') {
          continue;
        }
        await tx
          .update(gradebookEntries)
          .set({ status: 'submitted', submittedAt: now, updatedAt: now })
          .where(
            and(
              eq(gradebookEntries.tenantId, input.tenantId),
              eq(gradebookEntries.id, entry.id),
            ),
          );
        lockedCount += 1;
      }

      return { lockedCount, alreadyLockedCount };
    });
  },

  async findGradebookEntryForStudent(input: {
    tenantId: string;
    termId: string;
    classArmId: string;
    subjectId: string;
    studentId: string;
  }) {
    return withTenantContext(input.tenantId, async (tx) => {
      const [entry] = await tx
        .select()
        .from(gradebookEntries)
        .where(
          and(
            eq(gradebookEntries.tenantId, input.tenantId),
            eq(gradebookEntries.termId, input.termId),
            eq(gradebookEntries.classArmId, input.classArmId),
            eq(gradebookEntries.subjectId, input.subjectId),
            eq(gradebookEntries.studentId, input.studentId),
          ),
        )
        .limit(1);
      return entry ?? null;
    });
  },

  async findGradebookEntryById(tenantId: string, entryId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [entry] = await tx
        .select()
        .from(gradebookEntries)
        .where(and(eq(gradebookEntries.tenantId, tenantId), eq(gradebookEntries.id, entryId)))
        .limit(1);
      return entry ?? null;
    });
  },

  async createGradeCorrectionRequest(input: {
    tenantId: string;
    entry: typeof gradebookEntries.$inferSelect;
    correction: RequestGradeCorrectionInput;
    calculation: GradeCalculation;
    workflowInstanceId: string;
    requestedById: string;
  }) {
    return withTenantContext(input.tenantId, async (tx) => {
      const now = new Date();
      await tx
        .update(gradebookEntries)
        .set({ status: 'correction_pending', updatedAt: now })
        .where(and(eq(gradebookEntries.tenantId, input.tenantId), eq(gradebookEntries.id, input.entry.id)));

      const [log] = await tx
        .insert(gradeCorrectionLogs)
        .values({
          tenantId: input.tenantId,
          gradebookEntryId: input.entry.id,
          workflowInstanceId: input.workflowInstanceId,
          previousContinuousAssessmentScore: input.entry.continuousAssessmentScore,
          previousExamScore: input.entry.examScore,
          previousTotalScore: input.entry.totalScore,
          previousGrade: input.entry.grade,
          newContinuousAssessmentScore: input.correction.continuousAssessmentScore,
          newExamScore: input.correction.examScore,
          newTotalScore: input.calculation.totalScore,
          newGrade: input.calculation.grade,
          reason: input.correction.reason,
          requestedById: input.requestedById,
        })
        .returning();
      if (!log) throw new Error('Failed to create grade correction log');
      return log;
    });
  },

  async findGradeCorrectionByWorkflow(tenantId: string, workflowInstanceId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [log] = await tx
        .select()
        .from(gradeCorrectionLogs)
        .where(
          and(
            eq(gradeCorrectionLogs.tenantId, tenantId),
            eq(gradeCorrectionLogs.workflowInstanceId, workflowInstanceId),
          ),
        )
        .limit(1);
      return log ?? null;
    });
  },

  async applyGradeCorrection(input: {
    tenantId: string;
    correction: typeof gradeCorrectionLogs.$inferSelect;
    approvedById: string;
  }) {
    return withTenantContext(input.tenantId, async (tx) => {
      const now = new Date();
      const [entry] = await tx
        .update(gradebookEntries)
        .set({
          continuousAssessmentScore: input.correction.newContinuousAssessmentScore,
          examScore: input.correction.newExamScore,
          totalScore: input.correction.newTotalScore,
          grade: input.correction.newGrade,
          status: 'corrected',
          correctedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(gradebookEntries.tenantId, input.tenantId),
            eq(gradebookEntries.id, input.correction.gradebookEntryId),
          ),
        )
        .returning();
      if (!entry) throw new Error('Failed to apply grade correction');

      const [log] = await tx
        .update(gradeCorrectionLogs)
        .set({ status: 'approved', approvedById: input.approvedById, decidedAt: now, updatedAt: now })
        .where(and(eq(gradeCorrectionLogs.tenantId, input.tenantId), eq(gradeCorrectionLogs.id, input.correction.id)))
        .returning();
      if (!log) throw new Error('Failed to update grade correction log');
      return { entry, log };
    });
  },

  async markGradeCorrectionTerminal(input: {
    tenantId: string;
    correction: typeof gradeCorrectionLogs.$inferSelect;
    status: 'rejected' | 'returned';
  }) {
    return withTenantContext(input.tenantId, async (tx) => {
      const now = new Date();
      await tx
        .update(gradebookEntries)
        .set({ status: 'submitted', updatedAt: now })
        .where(
          and(
            eq(gradebookEntries.tenantId, input.tenantId),
            eq(gradebookEntries.id, input.correction.gradebookEntryId),
          ),
        );
      const [log] = await tx
        .update(gradeCorrectionLogs)
        .set({ status: input.status, decidedAt: now, updatedAt: now })
        .where(and(eq(gradeCorrectionLogs.tenantId, input.tenantId), eq(gradeCorrectionLogs.id, input.correction.id)))
        .returning();
      if (!log) throw new Error('Failed to update grade correction log');
      return log;
    });
  },

  async publishResults(input: PublishResultsInput & { tenantId: string; publishedById: string }) {
    return withTenantContext(input.tenantId, async (tx) => {
      const now = new Date();
      const published = [];
      for (const result of input.results) {
        const [existing] = await tx
          .select()
          .from(results)
          .where(
            and(
              eq(results.tenantId, input.tenantId),
              eq(results.termId, input.termId),
              eq(results.studentId, result.studentId),
            ),
          )
          .limit(1);

        if (existing) {
          const [updated] = await tx
            .update(results)
            .set({
              classArmId: input.classArmId,
              averageScore: result.averageScore,
              status: 'published',
              publishedById: input.publishedById,
              publishedAt: now,
              updatedAt: now,
            })
            .where(eq(results.id, existing.id))
            .returning();
          if (updated) published.push(updated);
          continue;
        }

        const [created] = await tx
          .insert(results)
          .values({
            tenantId: input.tenantId,
            termId: input.termId,
            classArmId: input.classArmId,
            studentId: result.studentId,
            averageScore: result.averageScore,
            publishedById: input.publishedById,
          })
          .returning();
        if (created) published.push(created);
      }
      return published;
    });
  },

  async findPublishedResult(tenantId: string, termId: string, studentId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(results)
        .where(
          and(
            eq(results.tenantId, tenantId),
            eq(results.termId, termId),
            eq(results.studentId, studentId),
            eq(results.status, 'published'),
          ),
        )
        .limit(1);
      return row ?? null;
    });
  },

  async listGradebookEntriesForStudent(tenantId: string, termId: string, studentId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(gradebookEntries)
        .where(
          and(
            eq(gradebookEntries.tenantId, tenantId),
            eq(gradebookEntries.termId, termId),
            eq(gradebookEntries.studentId, studentId),
          ),
        )
        .orderBy(asc(gradebookEntries.subjectId)),
    );
  },

  /** FR-ASM-006: gradebook rows that are not fully locked for term closure. */
  async countUnlockedGradebookEntries(tenantId: string, termId: string): Promise<number> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(gradebookEntries)
        .where(
          and(
            eq(gradebookEntries.tenantId, tenantId),
            eq(gradebookEntries.termId, termId),
            inArray(gradebookEntries.status, ['draft', 'correction_pending', 'corrected']),
          ),
        );
      return row?.count ?? 0;
    });
  },

  /** FR-ASM-006: active enrollments without a published result header for the term. */
  async countEnrolledStudentsWithoutPublishedResults(
    tenantId: string,
    termId: string,
  ): Promise<number> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(enrollments)
        .leftJoin(
          results,
          and(
            eq(results.tenantId, enrollments.tenantId),
            eq(results.termId, enrollments.termId),
            eq(results.studentId, enrollments.studentId),
            eq(results.status, 'published'),
          ),
        )
        .where(
          and(
            eq(enrollments.tenantId, tenantId),
            eq(enrollments.termId, termId),
            inArray(enrollments.status, ['active', 'active_billable']),
            isNull(results.id),
          ),
        );
      return row?.count ?? 0;
    });
  },

  /** FR-ASM-006: grade-correction workflow rows still awaiting a decision. */
  async countPendingGradeCorrectionsForTerm(tenantId: string, termId: string): Promise<number> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(gradeCorrectionLogs)
        .innerJoin(
          gradebookEntries,
          eq(gradeCorrectionLogs.gradebookEntryId, gradebookEntries.id),
        )
        .where(
          and(
            eq(gradeCorrectionLogs.tenantId, tenantId),
            eq(gradebookEntries.termId, termId),
            eq(gradeCorrectionLogs.status, 'pending'),
          ),
        );
      return row?.count ?? 0;
    });
  },
};
