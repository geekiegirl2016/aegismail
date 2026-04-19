import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import type { RouteDeps } from './accounts.ts';
import { sendError } from './errors.ts';

const ListMessagesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  pageToken: z.string().optional(),
});

export async function registerMailboxRoutes(
  app: FastifyInstance,
  deps: RouteDeps,
): Promise<void> {
  app.get<{ Params: { id: string } }>(
    '/v1/accounts/:id/mailboxes',
    async (req, reply) => {
      try {
        const provider = await deps.registry.get(req.params.id);
        const mailboxes = await provider.listMailboxes(req.params.id);
        return { mailboxes };
      } catch (err) {
        return sendError(reply, err);
      }
    },
  );

  app.get<{
    Params: { id: string; mailboxId: string };
    Querystring: { limit?: string; pageToken?: string };
  }>('/v1/accounts/:id/mailboxes/:mailboxId/messages', async (req, reply) => {
    try {
      const query = ListMessagesQuery.parse(req.query);
      const provider = await deps.registry.get(req.params.id);
      const result = await provider.listMessages(req.params.id, {
        mailboxId: decodeURIComponent(req.params.mailboxId),
        limit: query.limit,
        pageToken: query.pageToken,
      });
      return result;
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
