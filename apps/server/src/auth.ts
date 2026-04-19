import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { CredentialStore } from './keychain.ts';

const BEARER = /^Bearer\s+(.+)$/i;

/**
 * Constant-time comparison for shared-secret tokens.
 */
function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function extractBearer(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = BEARER.exec(header);
  return match?.[1] ?? null;
}

export interface RegisterAuthOptions {
  store: CredentialStore;
  /** Paths that skip auth (e.g. /health for liveness probes). */
  allowlist?: readonly string[];
}

export async function registerAuth(
  app: FastifyInstance,
  options: RegisterAuthOptions,
): Promise<string> {
  const token = await options.store.getOrCreateServerToken();
  const allowlist = new Set(options.allowlist ?? ['/health']);

  app.addHook('onRequest', async (req, reply) => {
    if (allowlist.has(req.url) || allowlist.has(req.url.split('?')[0] ?? '')) return;

    const presented = extractBearer(req);
    if (!presented || !safeEqual(presented, token)) {
      reply.code(401).send({ error: 'unauthorized' });
    }
  });

  return token;
}
