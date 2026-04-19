import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.ts';
import { openDb, type Db } from '../db/index.ts';
import { InMemoryCredentialStore } from '../keychain.ts';
import { InMemoryTokenStore } from '../oauth/token-store.ts';

describe('accounts routes', () => {
  let app: FastifyInstance;
  let db: Db;
  let credentials: InMemoryCredentialStore;
  let tokens: InMemoryTokenStore;
  let token: string;

  const authHeader = (): { authorization: string } => ({
    authorization: `Bearer ${token}`,
  });

  beforeEach(async () => {
    db = openDb({ path: ':memory:' });
    credentials = new InMemoryCredentialStore();
    tokens = new InMemoryTokenStore();
    const built = await buildApp({
      config: {
        AEGIS_SERVER_HOST: '127.0.0.1',
        AEGIS_SERVER_PORT: 0,
        AEGIS_LOG_LEVEL: 'silent',
      },
      db,
      credentials,
      tokens,
    });
    app = built.app;
    token = built.bearerToken;
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  it('rejects account creation without a bearer token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/accounts',
      payload: {
        provider: 'icloud',
        displayName: 'Test',
        emailAddress: 'test@icloud.com',
        appPassword: 'xxxx-xxxx-xxxx-xxxx',
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it('creates an iCloud account and stores the password in the credential store', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/accounts',
      headers: authHeader(),
      payload: {
        provider: 'icloud',
        displayName: 'Test',
        emailAddress: 'test@icloud.com',
        appPassword: 'xxxx-xxxx-xxxx-xxxx',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ account: { id: string; emailAddress: string } }>();
    expect(body.account.emailAddress).toBe('test@icloud.com');

    const stored = await credentials.getPassword(body.account.id);
    expect(stored).toBe('xxxx-xxxx-xxxx-xxxx');
  });

  it('rejects an invalid email address', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/accounts',
      headers: authHeader(),
      payload: {
        provider: 'icloud',
        displayName: 'Test',
        emailAddress: 'not-an-email',
        appPassword: 'xxxx',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: string }>().error).toBe('invalid_input');
  });

  it('lists created accounts', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/accounts',
      headers: authHeader(),
      payload: {
        provider: 'icloud',
        displayName: 'A',
        emailAddress: 'a@icloud.com',
        appPassword: 'aaa',
      },
    });
    await app.inject({
      method: 'POST',
      url: '/v1/accounts',
      headers: authHeader(),
      payload: {
        provider: 'icloud',
        displayName: 'B',
        emailAddress: 'b@icloud.com',
        appPassword: 'bbb',
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/accounts',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ accounts: Array<{ emailAddress: string }> }>();
    expect(body.accounts.map((a) => a.emailAddress)).toEqual([
      'a@icloud.com',
      'b@icloud.com',
    ]);
  });

  it('deletes an account and removes its stored password', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/v1/accounts',
      headers: authHeader(),
      payload: {
        provider: 'icloud',
        displayName: 'Bye',
        emailAddress: 'bye@icloud.com',
        appPassword: 'secret',
      },
    });
    const { account } = created.json<{ account: { id: string } }>();

    const del = await app.inject({
      method: 'DELETE',
      url: `/v1/accounts/${account.id}`,
      headers: authHeader(),
    });
    expect(del.statusCode).toBe(204);
    expect(await credentials.getPassword(account.id)).toBeNull();

    const get = await app.inject({
      method: 'GET',
      url: `/v1/accounts/${account.id}`,
      headers: authHeader(),
    });
    expect(get.statusCode).toBe(404);
  });
});
