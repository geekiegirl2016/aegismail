import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerAuth } from './auth.ts';
import { InMemoryCredentialStore } from './keychain.ts';

describe('registerAuth', () => {
  let app: FastifyInstance;
  let store: InMemoryCredentialStore;
  let token: string;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    store = new InMemoryCredentialStore();

    app.get('/health', async () => ({ status: 'ok' }));
    app.get('/v1/accounts', async () => ({ accounts: [] }));

    token = await registerAuth(app, { store, allowlist: ['/health'] });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows the health endpoint without a token', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
  });

  it('rejects protected endpoints without a bearer token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/accounts' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects protected endpoints with the wrong token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/accounts',
      headers: { authorization: 'Bearer wrong-token' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('accepts the right bearer token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/accounts',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it('is case-insensitive on the Bearer prefix', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/accounts',
      headers: { authorization: `bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });
});
