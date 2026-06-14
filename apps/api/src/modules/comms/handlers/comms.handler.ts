import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  RegisterPushSubscriptionRequest,
  ReplyToMessageRequest,
  SendAnnouncementRequest,
  SendClassMessageRequest,
  UpsertNotificationTemplateRequest,
} from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { getWebPushPublicKey, isWebPushConfigured } from '../gateways/webpush.gateway.js';
import {
  messageService,
  notificationService,
  pushSubscriptionService,
  templateService,
} from '../services/index.js';
import { requireActor } from './_context.js';
import {
  messageToResponse,
  notificationToResponse,
  pushSubscriptionToResponse,
  templateToResponse,
} from './_serializers.js';

export async function sendAnnouncementHandler(
  req: FastifyRequest<{ Params: { tenantId: string }; Body: SendAnnouncementRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await messageService.sendAnnouncement(
    req.params.tenantId,
    req.body,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, messageToResponse(row), 201);
}

export async function sendClassMessageHandler(
  req: FastifyRequest<{ Params: { tenantId: string }; Body: SendClassMessageRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await messageService.sendClassMessage(
    req.params.tenantId,
    req.body,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, messageToResponse(row), 201);
}

export async function replyToMessageHandler(
  req: FastifyRequest<{
    Params: { tenantId: string; messageId: string };
    Body: ReplyToMessageRequest;
  }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await messageService.replyToMessage(
    req.params.tenantId,
    req.params.messageId,
    req.body,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, messageToResponse(row), 201);
}

export async function getMessageHandler(
  req: FastifyRequest<{ Params: { tenantId: string; messageId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await messageService.getMessage(
    req.params.tenantId,
    req.params.messageId,
    requireActor(req),
  );
  return sendSuccess(reply, messageToResponse(row));
}

export async function getThreadHandler(
  req: FastifyRequest<{ Params: { tenantId: string; threadId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const rows = await messageService.getThread(
    req.params.tenantId,
    req.params.threadId,
    requireActor(req),
  );
  return sendSuccess(reply, rows.map(messageToResponse));
}

export async function listNotificationsHandler(
  req: FastifyRequest<{ Params: { tenantId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const rows = await notificationService.listForUser(req.params.tenantId, requireActor(req));
  return sendSuccess(reply, rows.map(notificationToResponse));
}

export async function markNotificationReadHandler(
  req: FastifyRequest<{ Params: { tenantId: string; notificationId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await notificationService.markRead(
    req.params.tenantId,
    req.params.notificationId,
    requireActor(req),
  );
  return sendSuccess(reply, notificationToResponse(row));
}

export async function getWebPushConfigHandler(
  _req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  return sendSuccess(reply, {
    webPushEnabled: isWebPushConfigured(),
    vapidPublicKey: getWebPushPublicKey(),
  });
}

export async function registerPushSubscriptionHandler(
  req: FastifyRequest<{ Body: RegisterPushSubscriptionRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await pushSubscriptionService.register(req.body, requireActor(req));
  return sendSuccess(reply, pushSubscriptionToResponse(row), 201);
}

export async function listPushSubscriptionsHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const rows = await pushSubscriptionService.listMine(requireActor(req));
  return sendSuccess(reply, rows.map(pushSubscriptionToResponse));
}

export async function deregisterPushSubscriptionHandler(
  req: FastifyRequest<{ Params: { subscriptionId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await pushSubscriptionService.deregister(
    req.params.subscriptionId,
    requireActor(req),
  );
  return sendSuccess(reply, pushSubscriptionToResponse(row));
}

export async function upsertTemplateHandler(
  req: FastifyRequest<{
    Params: { tenantId: string; templateKey: string; channel: string };
    Body: UpsertNotificationTemplateRequest;
  }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await templateService.upsert(
    req.params.tenantId,
    req.params.templateKey,
    req.params.channel,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, templateToResponse(row));
}

export async function listTemplatesHandler(
  req: FastifyRequest<{ Params: { tenantId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const rows = await templateService.list(req.params.tenantId, requireActor(req));
  return sendSuccess(reply, rows.map(templateToResponse));
}
