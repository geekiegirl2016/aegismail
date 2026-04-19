import { z } from 'zod';
import { AegisError } from '@aegismail/core';
import type { FastifyInstance } from 'fastify';
import type { RouteDeps } from './accounts.ts';
import { sendError } from './errors.ts';

const PatchMessageBody = z
  .object({
    isRead: z.boolean().optional(),
    isFlagged: z.boolean().optional(),
  })
  .strict();

const MoveMessageBody = z
  .object({
    mailboxId: z.string().min(1),
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
    Body: { isRead?: boolean; isFlagged?: boolean };
  }>('/v1/accounts/:id/messages/:messageId', async (req, reply) => {
    try {
      const body = PatchMessageBody.parse(req.body);
      const provider = await deps.registry.get(req.params.id);
      const messageId = decodeURIComponent(req.params.messageId);
      if (body.isRead !== undefined) {
        await provider.markRead(req.params.id, messageId, body.isRead);
      }
      if (body.isFlagged !== undefined) {
        await provider.markFlagged(req.params.id, messageId, body.isFlagged);
      }
      return reply.code(204).send();
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.post<{
    Params: { id: string; messageId: string };
    Body: { mailboxId: string };
  }>('/v1/accounts/:id/messages/:messageId/move', async (req, reply) => {
    try {
      const body = MoveMessageBody.parse(req.body);
      const provider = await deps.registry.get(req.params.id);
      const messageId = decodeURIComponent(req.params.messageId);
      const newMessageId = await provider.moveMessage(
        req.params.id,
        messageId,
        body.mailboxId,
      );
      return { messageId: newMessageId };
    } catch (err) {
      return sendError(reply, err);
    }
  });

  /**
   * DELETE is a shortcut for "move to the mailbox whose role is trash".
   * If the account doesn't advertise a Trash mailbox, falls back to a
   * 404 so the client can prompt for a target.
   */
  app.delete<{ Params: { id: string; messageId: string } }>(
    '/v1/accounts/:id/messages/:messageId',
    async (req, reply) => {
      try {
        const provider = await deps.registry.get(req.params.id);
        const messageId = decodeURIComponent(req.params.messageId);
        const mailboxes = await provider.listMailboxes(req.params.id);
        const trash = mailboxes.find((m) => m.role === 'trash');
        if (!trash) {
          return sendError(
            reply,
            new AegisError('not_found', 'This account has no Trash mailbox'),
          );
        }
        const newMessageId = await provider.moveMessage(
          req.params.id,
          messageId,
          trash.id,
        );
        return { messageId: newMessageId };
      } catch (err) {
        return sendError(reply, err);
      }
    },
  );
}
