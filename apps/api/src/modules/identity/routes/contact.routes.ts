import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { authenticate } from '../../../middleware/authenticate.js';
import { users } from '../../../../drizzle/schema/identity.js';
import { db } from '../../../shared/db.js';

export async function contactRoutes(app: FastifyInstance): Promise<void> {
  app.patch<{ Body: { email?: string; phone?: string } }>(
    '/identity/me/contact',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId = (req as any).auth?.userId;
      if (!userId) return reply.status(401).send({ error: 'Not authenticated' });

      const updates: Record<string, string> = {};
      if (req.body.email) updates.email = req.body.email;
      if (req.body.phone) updates.phone = req.body.phone;

      if (Object.keys(updates).length === 0) {
        return reply.status(400).send({ error: 'No fields to update' });
      }

      await db.update(users).set(updates).where(eq(users.id, userId));
      return reply.send({ status: 'updated' });
    },
  );
}
