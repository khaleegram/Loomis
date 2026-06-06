import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  CensusLockRequest,
  CloseTermRequest,
  ConfigureTermRequest,
  ConfirmPromotionRequest,
  CreateAcademicYearRequest,
  CreateClassArmRequest,
  CreateClassLevelRequest,
  CreateExamConfigRequest,
  CreateGradingSchemeRequest,
  ListGradebookQuery,
  PublishResultsRequest,
  RequestGradeCorrectionRequest,
  StagePromotionRequest,
  UpsertProgressionRequest,
  UpsertGradebookEntryRequest,
} from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import {
  academicYearService,
  censusService,
  classStructureService,
  gradebookService,
  promotionService,
  termService,
} from '../services/index.js';
import { requireActor } from './_context.js';
import {
  academicTermToResponse,
  academicYearToResponse,
  censusLockToResponse,
  classArmToResponse,
  classLevelToResponse,
  examConfigToResponse,
  gradebookEntryToResponse,
  gradeCorrectionToResponse,
  gradingSchemeToResponse,
  progressionToResponse,
  promotionRecordToResponse,
  resultToResponse,
} from './_serializers.js';

interface TenantParams {
  tenantId: string;
}
interface YearParams extends TenantParams {
  yearId: string;
}
interface TermParams extends TenantParams {
  termId: string;
}
interface EntryParams extends TenantParams {
  entryId: string;
}

// ── Academic years ───────────────────────────────────────────────────────────

export async function createAcademicYearHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: CreateAcademicYearRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const year = await academicYearService.createYear(req.params.tenantId, req.body, requireActor(req));
  return sendSuccess(reply, academicYearToResponse(year), 201);
}

export async function listAcademicYearsHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const years = await academicYearService.listYears(req.params.tenantId, requireActor(req));
  return sendSuccess(reply, { academicYears: years.map(academicYearToResponse) });
}

export async function getAcademicYearHandler(
  req: FastifyRequest<{ Params: YearParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const year = await academicYearService.getYear(
    req.params.tenantId,
    req.params.yearId,
    requireActor(req),
  );
  return sendSuccess(reply, academicYearToResponse(year));
}

export async function activateAcademicYearHandler(
  req: FastifyRequest<{ Params: YearParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const year = await academicYearService.activateYear(
    req.params.tenantId,
    req.params.yearId,
    requireActor(req),
  );
  return sendSuccess(reply, academicYearToResponse(year));
}

export async function closeAcademicYearHandler(
  req: FastifyRequest<{ Params: YearParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const year = await academicYearService.closeYear(
    req.params.tenantId,
    req.params.yearId,
    requireActor(req),
  );
  return sendSuccess(reply, academicYearToResponse(year));
}

// ── Terms ──────────────────────────────────────────────────────────────────────

export async function listTermsHandler(
  req: FastifyRequest<{ Params: YearParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const terms = await termService.listTerms(req.params.tenantId, req.params.yearId, requireActor(req));
  return sendSuccess(reply, { terms: terms.map(academicTermToResponse) });
}

export async function getTermHandler(
  req: FastifyRequest<{ Params: TermParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const term = await termService.getTerm(req.params.tenantId, req.params.termId, requireActor(req));
  return sendSuccess(reply, academicTermToResponse(term));
}

export async function configureTermHandler(
  req: FastifyRequest<{ Params: TermParams; Body: ConfigureTermRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const term = await termService.configureTerm(
    req.params.tenantId,
    req.params.termId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, academicTermToResponse(term));
}

export async function openTermHandler(
  req: FastifyRequest<{ Params: TermParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const term = await termService.openTerm(req.params.tenantId, req.params.termId, requireActor(req));
  return sendSuccess(reply, academicTermToResponse(term));
}

export async function closeTermHandler(
  req: FastifyRequest<{ Params: TermParams; Body: CloseTermRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const term = await termService.closeTerm(
    req.params.tenantId,
    req.params.termId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, academicTermToResponse(term));
}

// ── Census lock (Revenue Integrity) ──────────────────────────────────────────────

export async function censusLockHandler(
  req: FastifyRequest<{ Params: TermParams; Body: CensusLockRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await censusService.lockCensus(
    req.params.tenantId,
    req.params.termId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, censusLockToResponse(result), 201);
}

// ── Class structure ────────────────────────────────────────────────────────────

export async function createClassLevelHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: CreateClassLevelRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const level = await classStructureService.createClassLevel(
    req.params.tenantId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, classLevelToResponse(level), 201);
}

export async function listClassLevelsHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const levels = await classStructureService.listClassLevels(req.params.tenantId, requireActor(req));
  return sendSuccess(reply, { levels: levels.map(classLevelToResponse) });
}

export async function createClassArmHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: CreateClassArmRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const arm = await classStructureService.createClassArm(
    req.params.tenantId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, classArmToResponse(arm), 201);
}

export async function getClassStructureHandler(
  req: FastifyRequest<{ Params: YearParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const { levels, arms } = await classStructureService.getClassStructure(
    req.params.tenantId,
    req.params.yearId,
    requireActor(req),
  );
  return sendSuccess(reply, {
    levels: levels.map(classLevelToResponse),
    arms: arms.map(classArmToResponse),
  });
}

export async function upsertProgressionHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: UpsertProgressionRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const progression = await classStructureService.upsertProgression(
    req.params.tenantId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, progressionToResponse(progression), 201);
}

export async function listProgressionsHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const progressions = await classStructureService.listProgressions(
    req.params.tenantId,
    requireActor(req),
  );
  return sendSuccess(reply, { progressions: progressions.map(progressionToResponse) });
}

// ── Promotion & graduation ───────────────────────────────────────────────────────

export async function stagePromotionsHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: StagePromotionRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const records = await promotionService.stagePromotions(
    req.params.tenantId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, { records: records.map(promotionRecordToResponse) }, 201);
}

export async function listPromotionsHandler(
  req: FastifyRequest<{ Params: YearParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const records = await promotionService.listPromotions(
    req.params.tenantId,
    req.params.yearId,
    requireActor(req),
  );
  return sendSuccess(reply, { records: records.map(promotionRecordToResponse) });
}

export async function confirmPromotionsHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: ConfirmPromotionRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const records = await promotionService.confirmPromotions(
    req.params.tenantId,
    req.body.fromAcademicYearId,
    requireActor(req),
  );
  return sendSuccess(reply, { records: records.map(promotionRecordToResponse) });
}

// ── Grading schemes, gradebook & results ───────────────────────────────────────

export async function createGradingSchemeHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: CreateGradingSchemeRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const scheme = await gradebookService.createGradingScheme(req.params.tenantId, req.body, requireActor(req));
  return sendSuccess(reply, gradingSchemeToResponse(scheme), 201);
}

export async function listGradingSchemesHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const schemes = await gradebookService.listGradingSchemes(req.params.tenantId, requireActor(req));
  return sendSuccess(reply, { schemes: schemes.map(gradingSchemeToResponse) });
}

export async function createExamConfigHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: CreateExamConfigRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const config = await gradebookService.createExamConfig(req.params.tenantId, req.body, requireActor(req));
  return sendSuccess(reply, examConfigToResponse(config), 201);
}

export async function listExamConfigsHandler(
  req: FastifyRequest<{ Params: TermParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const configs = await gradebookService.listExamConfigs(
    req.params.tenantId,
    req.params.termId,
    requireActor(req),
  );
  return sendSuccess(reply, { configs: configs.map(examConfigToResponse) });
}

export async function upsertGradebookEntryHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: UpsertGradebookEntryRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const entry = await gradebookService.upsertGradebookEntry(req.params.tenantId, req.body, requireActor(req));
  return sendSuccess(reply, gradebookEntryToResponse(entry), 201);
}

export async function listGradebookEntriesHandler(
  req: FastifyRequest<{ Params: TenantParams; Querystring: ListGradebookQuery }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const entries = await gradebookService.listGradebookEntries(
    req.params.tenantId,
    req.query,
    requireActor(req),
  );
  return sendSuccess(reply, { entries: entries.map(gradebookEntryToResponse) });
}

export async function requestGradeCorrectionHandler(
  req: FastifyRequest<{ Params: EntryParams; Body: RequestGradeCorrectionRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const correction = await gradebookService.requestGradeCorrection(
    req.params.tenantId,
    req.params.entryId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, gradeCorrectionToResponse(correction), 202);
}

export async function publishResultsHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: PublishResultsRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const published = await gradebookService.publishResults(req.params.tenantId, req.body, requireActor(req));
  return sendSuccess(reply, { results: published.map(resultToResponse) }, 201);
}
