import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import type { Config } from './config.ts';
import type { Db } from './db/index.ts';
import type { CredentialStore } from './keychain.ts';
import { buildLoggerOptions } from './logger.ts';
import { registerAuth } from './auth.ts';
import { registerAccountRoutes } from './routes/accounts.ts';
import { registerMailboxRoutes } from './routes/mailboxes.ts';
import { registerMessageRoutes } from './routes/messages.ts';

export interface BuildAppOptions {
  config: Config;
  db: Db;
  credentials: CredentialStore;
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const { config, db, credentials } = options;

  const app = Fastify({
    logger: buildLoggerOptions(config.AEGIS_LOG_LEVEL),
    disableRequestLogging: false,
  });

  await app.register(sensible);
  await app.register(cors, {
    origin: [/^tauri:\/\//, /^http:\/\/localhost:\d+$/, 'http://127.0.0.1:1420'],
    credentials: true,
  });

  app.get('/health', async () => ({ status: 'ok', service: 'aegismail-server' }));

  await registerAuth(app, { store: credentials, allowlist: ['/health'] });

  await app.register(async (scope) => {
    await registerAccountRoutes(scope, { db, credentials });
    await registerMailboxRoutes(scope, { db, credentials });
    await registerMessageRoutes(scope, { db, credentials });
  });

  return app;
}
