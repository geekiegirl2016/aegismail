import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/index.ts';
import type { CredentialStore } from '../keychain.ts';

export interface RouteDeps {
  db: Db;
  credentials: CredentialStore;
}

export async function registerAccountRoutes(
  _app: FastifyInstance,
  _deps: RouteDeps,
): Promise<void> {
  // Phase 3 lands the real routes. Keeping this a no-op so the server
  // and its tests build during Phase 1.
}
