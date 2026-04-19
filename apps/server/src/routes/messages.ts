import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { RouteDeps } from './accounts.ts';
import { sendError } from './errors.ts';

const PatchMessageBody = z
  .object({
    isRead: z.boolean().optional(),
  })
  .strict();

export async function registerMessageRoutes(
  app: FastifyInstance,
  deps: RouteDeps,
): Promise<void> {
  app.get<{ Params: { id: string; messageId: string } }>(
    '/v1/accounts/:id/messages/:messageId',
    async (req, reply) => {
      try {
        const provider = await deps.registry.get(req.params.id);
        const message = await provider.getMessage(
          req.params.id,
          decodeURIComponent(req.params.messageId),
        );
        return { message };
      } catch (err) {
        return sendError(reply, err);
      }
    },
  );

  app.patch<{
    Params: { id: string; messageId: string };
    Body: { isRead?: boolean };
  }>('/v1/accounts/:id/messages/:messageId', async (req, reply) => {
    try {
      const body = PatchMessageBody.parse(req.body);
      const provider = await deps.registry.get(req.params.id);
      const messageId = decodeURIComponent(req.params.messageId);
      if (body.isRead !== undefined) {
        await provider.markRead(req.params.id, messageId, body.isRead);
      }
      return reply.code(204).send();
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
