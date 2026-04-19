import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import type { Config } from './config.ts';
import { AccountsRepo } from './db/accounts.ts';
import type { Db } from './db/index.ts';
import type { CredentialStore } from './keychain.ts';
import type { TokenStore } from './oauth/token-store.ts';
import { buildLoggerOptions } from './logger.ts';
import { registerAuth } from './auth.ts';
import { ProviderRegistry } from './providers/registry.ts';
import { registerAccountRoutes } from './routes/accounts.ts';
import { registerMailboxRoutes } from './routes/mailboxes.ts';
import { registerMessageRoutes } from './routes/messages.ts';
import { registerOAuthRoutes } from './routes/oauth.ts';

export interface BuildAppOptions {
  config: Config;
  db: Db;
  credentials: CredentialStore;
  tokens: TokenStore;
}

export interface BuiltApp {
  app: FastifyInstance;
  registry: ProviderRegistry;
  bearerToken: string;
}

export async function buildApp(options: BuildAppOptions): Promise<BuiltApp> {
  const { config, db, credentials, tokens } = options;

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

  const bearerToken = await registerAuth(app, {
    store: credentials,
    allowlist: ['/health'],
  });

  const registry = new ProviderRegistry(
    config,
    new AccountsRepo(db),
    credentials,
    tokens,
  );
  const deps = { db, credentials, registry };

  await app.register(async (scope) => {
    await registerAccountRoutes(scope, deps);
    await registerMailboxRoutes(scope, deps);
    await registerMessageRoutes(scope, deps);
    await registerOAuthRoutes(scope, {
      config,
      db,
      credentials,
      tokens,
      registry,
    });
  });

  return { app, registry, bearerToken };
}
