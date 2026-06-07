import type { FastifyInstance } from 'fastify';
import { registerCommsEventConsumers } from './events/index.js';
import { messagesRoutes } from './routes/messages.routes.js';
import { notificationsRoutes } from './routes/notifications.routes.js';
import { pushSubscriptionsRoutes } from './routes/push-subscriptions.routes.js';
import { templatesRoutes } from './routes/templates.routes.js';

/**
 * Comms module plugin (SRS §4.7 FR-COM-001..002; §10.3/§10.4).
 * Messaging, in-app notifications, and delivery via SES / Termii / FCM / APNs.
 */
export async function commsModule(app: FastifyInstance): Promise<void> {
  registerCommsEventConsumers();
  await app.register(messagesRoutes);
  await app.register(notificationsRoutes);
  await app.register(pushSubscriptionsRoutes);
  await app.register(templatesRoutes);
}

export {
  automatedNotificationService,
  deliveryService,
  messageService,
  notificationService,
  pushSubscriptionService,
  templateService,
} from './services/index.js';
