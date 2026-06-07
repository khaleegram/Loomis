import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  UpsertWorkflowTemplateRequest,
  WorkflowDecideRequest,
  WorkflowType,
} from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { workflowService } from '../services/index.js';
import { requireActor } from './_context.js';
import {
  workflowInstanceToResponse,
  workflowStepToResponse,
  workflowTemplateToResponse,
} from './_serializers.js';

interface TenantParams {
  tenantId: string;
}

interface InstanceParams extends TenantParams {
  instanceId: string;
}

interface DecideParams extends InstanceParams {
  stepId: string;
}

interface TemplateParams extends TenantParams {
  workflowType: WorkflowType;
}

function resolveRouteTenantId(paramsTenantId: string | undefined, actorTenantId: string | null) {
  if (paramsTenantId) return paramsTenantId;
  return actorTenantId;
}

/** GET /tenants/:tenantId/workflows/inbox — US-WRK-002 */
export async function listInboxHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const tenantId = resolveRouteTenantId(req.params.tenantId, actor.tenantId);
  const rows = await workflowService.listInbox(tenantId, actor);
  return sendSuccess(reply, {
    items: rows.map(({ instance, activeStep }) => ({
      instance: workflowInstanceToResponse(instance),
      activeStep: workflowStepToResponse(activeStep),
    })),
  });
}

/** GET /tenants/:tenantId/workflows/mine — US-WRK-003 */
export async function listMyRequestsHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const tenantId = resolveRouteTenantId(req.params.tenantId, actor.tenantId);
  const instances = await workflowService.listMyRequests(tenantId, actor);
  return sendSuccess(reply, {
    instances: instances.map((i) => workflowInstanceToResponse(i)),
  });
}

/** GET /tenants/:tenantId/workflows/instances/:instanceId — US-WRK-003 */
export async function getInstanceHandler(
  req: FastifyRequest<{ Params: InstanceParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const tenantId = resolveRouteTenantId(req.params.tenantId, actor.tenantId);
  const { instance, steps, decisions } = await workflowService.getInstance(
    tenantId,
    req.params.instanceId,
    actor,
  );
  return sendSuccess(
    reply,
    workflowInstanceToResponse(instance, steps, decisions),
  );
}

/** POST /tenants/:tenantId/workflows/instances/:instanceId/steps/:stepId/decide */
export async function decideHandler(
  req: FastifyRequest<{ Params: DecideParams; Body: WorkflowDecideRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const tenantId = resolveRouteTenantId(req.params.tenantId, actor.tenantId);
  const mfaHeader = req.headers['x-mfa-token'];
  const mfaToken = Array.isArray(mfaHeader) ? mfaHeader[0] : mfaHeader;
  const instance = await workflowService.decide(
    tenantId,
    req.params.instanceId,
    req.params.stepId,
    req.body,
    actor,
    mfaToken ? { mfaToken } : undefined,
  );
  return sendSuccess(reply, workflowInstanceToResponse(instance));
}

/** GET /tenants/:tenantId/workflows/templates — US-WRK-001 */
export async function listTemplatesHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const tenantId = resolveRouteTenantId(req.params.tenantId, actor.tenantId);
  const templates = await workflowService.listTemplates(tenantId);
  return sendSuccess(reply, {
    templates: templates.map(workflowTemplateToResponse),
  });
}

/** PUT /tenants/:tenantId/workflows/templates/:workflowType — US-WRK-001 */
export async function upsertTemplateHandler(
  req: FastifyRequest<{ Params: TemplateParams; Body: UpsertWorkflowTemplateRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const tenantId = resolveRouteTenantId(req.params.tenantId, actor.tenantId);
  const template = await workflowService.upsertTemplate(
    tenantId,
    req.params.workflowType,
    req.body,
    actor,
  );
  return sendSuccess(
    reply,
    workflowTemplateToResponse({
      id: template.id,
      tenantId: template.tenantId,
      workflowType: template.workflowType as WorkflowType,
      approverChain: template.approverChain as UpsertWorkflowTemplateRequest['approverChain'],
      isMandatory: template.isMandatory,
      isActive: template.isActive,
      updatedAt: template.updatedAt.toISOString(),
    }),
  );
}

/** GET /workflows/templates — platform template catalogue (US-WRK-001) */
export async function listPlatformTemplatesHandler(
  _req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const templates = await workflowService.listTemplates(null);
  return sendSuccess(reply, {
    templates: templates.map(workflowTemplateToResponse),
  });
}

/** PUT /workflows/templates/:workflowType — platform template configuration */
export async function upsertPlatformTemplateHandler(
  req: FastifyRequest<{ Params: { workflowType: WorkflowType }; Body: UpsertWorkflowTemplateRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const template = await workflowService.upsertTemplate(
    null,
    req.params.workflowType,
    req.body,
    actor,
  );
  return sendSuccess(
    reply,
    workflowTemplateToResponse({
      id: template.id,
      tenantId: template.tenantId,
      workflowType: template.workflowType as WorkflowType,
      approverChain: template.approverChain as UpsertWorkflowTemplateRequest['approverChain'],
      isMandatory: template.isMandatory,
      isActive: template.isActive,
      updatedAt: template.updatedAt.toISOString(),
    }),
  );
}

/** POST /workflows/escalations/process — internal scheduler hook */
export async function processEscalationsHandler(
  _req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const count = await workflowService.processDueEscalations();
  return sendSuccess(reply, { escalatedCount: count });
}
