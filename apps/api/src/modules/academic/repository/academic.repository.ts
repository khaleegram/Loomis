import { and, asc, eq, gte, inArray, lte, ne } from 'drizzle-orm';
import {
  academicTerms,
  academicYears,
  classArms,
  classLevels,
  classProgressionMap,
  studentPromotionRecords,
} from '../../../../drizzle/schema/academic.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { ACADEMIC_EVENT_TYPES, type TermCensusLockedPayload } from '../events/types.js';
import type {
  ConfigureTermInput,
  CreateAcademicYearInput,
  PromotionDecisionInput,
} from '../types.js';
import { outboxRepository } from './outbox.repository.js';

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
   * The census lock (System Design §8.1) — a single SERIALIZABLE transaction:
   * update the term to `census_locked`, write the attested figures, AND append
   * the `academic.term.census_locked` outbox event so the Ledger module creates
   * one PSF obligation per billable student plus the balanced ledger postings.
   *
   * The conditional UPDATE (WHERE status = 'open') is the race guard: if a
   * concurrent request already locked the census, zero rows update and we return
   * null so the service surfaces ACADEMIC_CENSUS_ALREADY_LOCKED.
   */
  async lockCensus(params: {
    tenantId: string;
    termId: string;
    declaredBillableCount: number;
    systemBillableCount: number | null;
    varianceReason: string | null;
    eventPayload: TermCensusLockedPayload;
  }) {
    return withTenantContext(
      params.tenantId,
      async (tx) => {
        const now = new Date();
        const [term] = await tx
          .update(academicTerms)
          .set({
            status: 'census_locked',
            declaredBillableCount: params.declaredBillableCount,
            systemBillableCount: params.systemBillableCount,
            censusVarianceReason: params.varianceReason,
            censusLockedAt: now,
            censusLockedById: params.eventPayload.attestedById,
            updatedAt: now,
          })
          .where(
            and(
              eq(academicTerms.tenantId, params.tenantId),
              eq(academicTerms.id, params.termId),
              eq(academicTerms.status, 'open'),
            ),
          )
          .returning();
        if (!term) return null;

        await outboxRepository.append(tx, {
          aggregateType: 'academic_term',
          aggregateId: params.termId,
          eventType: ACADEMIC_EVENT_TYPES.termCensusLocked,
          tenantId: params.tenantId,
          payload: { ...params.eventPayload, censusLockedAt: now.toISOString() },
        });

        return term;
      },
      { isolationLevel: 'serializable' },
    );
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
};
