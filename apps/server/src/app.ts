import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import type { Config } from './config.ts';

export async function buildApp(config: Config): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.AEGIS_LOG_LEVEL },
    disableRequestLogging: false,
  });

  await app.register(sensible);
  await app.register(cors, { origin: true, credentials: true });

  app.get('/health', async () => ({ status: 'ok', service: 'aegismail-server' }));

  app.get('/v1/accounts', async () => ({ accounts: [] }));

  return app;
}
