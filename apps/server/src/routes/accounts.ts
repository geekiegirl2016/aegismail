import { z } from 'zod';
import { AegisError } from '@aegismail/core';
import { ImapAccountConfig, ICLOUD_IMAP, FASTMAIL_IMAP } from '@aegismail/providers/imap';
import type { FastifyInstance } from 'fastify';
import { AccountsRepo } from '../db/accounts.ts';
import type { Db } from '../db/index.ts';
import type { CredentialStore } from '../keychain.ts';
import type { ProviderRegistry } from '../providers/registry.ts';
import { sendError } from './errors.ts';

export interface RouteDeps {
  db: Db;
  credentials: CredentialStore;
  registry: ProviderRegistry;
}

const CreateAccountBody = z
  .object({
    provider: z.enum(['icloud']),
    displayName: z.string().min(1),
    emailAddress: z.string().email(),
    appPassword: z.string().min(1),
    config: ImapAccountConfig.partial().optional(),
  })
  .strict();

export async function registerAccountRoutes(
  app: FastifyInstance,
  deps: RouteDeps,
): Promise<void> {
  const accounts = new AccountsRepo(deps.db);

  app.post('/v1/accounts', async (req, reply) => {
    try {
      const body = CreateAccountBody.parse(req.body);

      const baseConfig =
        body.provider === 'icloud'
          ? ICLOUD_IMAP
          : (FASTMAIL_IMAP satisfies typeof ICLOUD_IMAP);

      const fullConfig = ImapAccountConfig.parse({
        ...baseConfig,
        username: body.emailAddress,
        ...(body.config ?? {}),
      });

      const account = accounts.create({
        provider: body.provider,
        displayName: body.displayName,
        emailAddress: body.emailAddress,
        config: fullConfig,
      });

      await deps.credentials.setPassword(account.id, body.appPassword);

      return reply.code(201).send({ account });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.get('/v1/accounts', async () => ({ accounts: accounts.list() }));

  app.get<{ Params: { id: string } }>('/v1/accounts/:id', async (req, reply) => {
    const account = accounts.get(req.params.id);
    if (!account) return sendError(reply, new AegisError('not_found', 'account not found'));
    return { account };
  });

  app.delete<{ Params: { id: string } }>('/v1/accounts/:id', async (req, reply) => {
    try {
      const existed = accounts.delete(req.params.id);
      if (!existed) return sendError(reply, new AegisError('not_found', 'account not found'));
      await deps.credentials.deletePassword(req.params.id);
      deps.registry.invalidate(req.params.id);
      return reply.code(204).send();
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
