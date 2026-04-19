import { z } from 'zod';
import { AegisError } from '@aegismail/core';
import { GMAIL_IMAP } from '@aegismail/providers/imap';
import type { FastifyInstance } from 'fastify';
import { AccountsRepo } from '../db/accounts.ts';
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  fetchUserInfo,
} from '../oauth/google.ts';
import { createLoopbackServer } from '../oauth/loopback.ts';
import { generatePkce, generateState } from '../oauth/pkce.ts';
import { googleOAuthFromConfig, type Config } from '../config.ts';
import type { Db } from '../db/index.ts';
import type { CredentialStore } from '../keychain.ts';
import type { TokenStore } from '../oauth/token-store.ts';
import type { ProviderRegistry } from '../providers/registry.ts';
import { sendError } from './errors.ts';

export interface OAuthRouteDeps {
  config: Config;
  db: Db;
  credentials: CredentialStore;
  tokens: TokenStore;
  registry: ProviderRegistry;
}

const StartBody = z
  .object({
    displayName: z.string().min(1),
    loginHint: z.string().email().optional(),
  })
  .strict();

const AwaitBody = z.object({ sessionId: z.string().min(1) }).strict();

interface OAuthSession {
  promise: Promise<string>;
  createdAt: number;
}

export async function registerOAuthRoutes(
  app: FastifyInstance,
  deps: OAuthRouteDeps,
): Promise<void> {
  const accounts = new AccountsRepo(deps.db);
  const sessions = new Map<string, OAuthSession>();

  // Reap abandoned sessions every minute.
  const reaper = setInterval(() => {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [id, session] of sessions) {
      if (session.createdAt < cutoff) sessions.delete(id);
    }
  }, 60_000);
  reaper.unref();
  app.addHook('onClose', async () => clearInterval(reaper));

  app.get('/v1/oauth/providers', async () => {
    const google = googleOAuthFromConfig(deps.config);
    return {
      providers: [
        { id: 'google', configured: google !== null },
        { id: 'microsoft', configured: false },
      ],
    };
  });

  app.post('/v1/oauth/google/start', async (req, reply) => {
    try {
      const google = googleOAuthFromConfig(deps.config);
      if (!google) {
        throw new AegisError('provider_error', 'Google OAuth client not configured.');
      }
      const body = StartBody.parse(req.body);

      const pkce = generatePkce();
      const state = generateState();
      const loopback = await createLoopbackServer({ expectedState: state });

      const authUrl = buildAuthorizationUrl(google, {
        redirectUri: loopback.redirectUri,
        state,
        codeChallenge: pkce.challenge,
        ...(body.loginHint ? { loginHint: body.loginHint } : {}),
      });

      const flowPromise = (async () => {
        const { code } = await loopback.result;
        const tokens = await exchangeCodeForTokens(google, {
          code,
          codeVerifier: pkce.verifier,
          redirectUri: loopback.redirectUri,
        });
        const info = await fetchUserInfo(tokens.accessToken);

        const existing = accounts
          .list()
          .find((a) => a.provider === 'gmail' && a.emailAddress === info.email);

        let accountId: string;
        if (existing) {
          accountId = existing.id;
        } else {
          const created = accounts.create({
            provider: 'gmail',
            displayName: body.displayName,
            emailAddress: info.email,
            config: { ...GMAIL_IMAP, username: info.email },
          });
          accountId = created.id;
        }

        await deps.tokens.set(accountId, tokens);
        deps.registry.invalidate(accountId);
        return accountId;
      })();

      // Prevent unhandled rejections if /await is never called.
      flowPromise.catch(() => undefined);

      sessions.set(state, { promise: flowPromise, createdAt: Date.now() });
      return { sessionId: state, authUrl };
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.post<{ Body: { sessionId: string } }>('/v1/oauth/google/await', async (req, reply) => {
    try {
      const body = AwaitBody.parse(req.body);
      const session = sessions.get(body.sessionId);
      if (!session) {
        throw new AegisError('not_found', 'OAuth session not found or expired');
      }
      const accountId = await session.promise;
      sessions.delete(body.sessionId);
      const account = accounts.get(accountId);
      if (!account) throw new AegisError('not_found', 'Created account missing');
      return { account };
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
