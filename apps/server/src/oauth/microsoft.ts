import { AegisError } from '@aegismail/core';
import type { OAuthTokens } from './token-store.ts';

const AUTH_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const TOKEN_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

/**
 * Scopes for Outlook IMAP+SMTP via XOAUTH2. Mixing openid scopes with a
 * single resource (outlook.office.com) is supported by v2 and gets us
 * everything we need in one round trip — the id_token gives us the
 * user's email and display name without a separate Graph call.
 */
export const MICROSOFT_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'https://outlook.office.com/IMAP.AccessAsUser.All',
  'https://outlook.office.com/SMTP.Send',
];

export interface MicrosoftOAuthConfig {
  clientId: string;
  /** Optional — desktop public clients don't need a secret, but if you
   *  registered your app as "Web" you'll have one. */
  clientSecret?: string;
}

export interface BuildAuthUrlInput {
  redirectUri: string;
  state: string;
  codeChallenge: string;
  loginHint?: string;
}

export function buildAuthorizationUrl(
  config: MicrosoftOAuthConfig,
  input: BuildAuthUrlInput,
): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('scope', MICROSOFT_SCOPES.join(' '));
  url.searchParams.set('state', input.state);
  url.searchParams.set('code_challenge', input.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('prompt', 'select_account');
  if (input.loginHint) url.searchParams.set('login_hint', input.loginHint);
  return url.toString();
}

interface MicrosoftTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token?: string;
}

export async function exchangeCodeForTokens(
  config: MicrosoftOAuthConfig,
  input: { code: string; codeVerifier: string; redirectUri: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ tokens: OAuthTokens; idToken: string | null }> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: input.redirectUri,
    code_verifier: input.codeVerifier,
    scope: MICROSOFT_SCOPES.join(' '),
  });
  if (config.clientSecret) body.set('client_secret', config.clientSecret);

  const res = await fetchImpl(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AegisError(
      'unauthorized',
      `Microsoft token exchange failed (HTTP ${res.status}): ${text}`,
    );
  }

  const data = (await res.json()) as MicrosoftTokenResponse;
  const now = Date.now();
  const tokens: OAuthTokens = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
    scope: data.scope,
    obtainedAt: new Date(now).toISOString(),
  };
  if (data.refresh_token) tokens.refreshToken = data.refresh_token;
  return { tokens, idToken: data.id_token ?? null };
}

export async function refreshAccessToken(
  config: MicrosoftOAuthConfig,
  refreshToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: MICROSOFT_SCOPES.join(' '),
  });
  if (config.clientSecret) body.set('client_secret', config.clientSecret);

  const res = await fetchImpl(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AegisError(
      'unauthorized',
      `Microsoft token refresh failed (HTTP ${res.status}): ${text}`,
    );
  }

  const data = (await res.json()) as MicrosoftTokenResponse;
  const now = Date.now();
  const tokens: OAuthTokens = {
    accessToken: data.access_token,
    // Microsoft rotates refresh tokens on every refresh — use the new
    // one if supplied, fall back to the old one otherwise.
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: now + data.expires_in * 1000,
    scope: data.scope,
    obtainedAt: new Date(now).toISOString(),
  };
  return tokens;
}

export interface MicrosoftUserInfo {
  email: string;
  name?: string;
  sub: string;
}

/**
 * Decode the payload of a JWT id_token without verifying the signature
 * — we trust it because it came to us over TLS directly from the
 * Microsoft token endpoint. We only use it to read the user's email +
 * display name for account creation.
 */
export function parseIdToken(idToken: string): MicrosoftUserInfo {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new AegisError('provider_error', 'Malformed id_token');
  }
  const payloadPart = parts[1];
  if (!payloadPart) {
    throw new AegisError('provider_error', 'id_token missing payload');
  }
  let json: string;
  try {
    const b64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    json = Buffer.from(b64, 'base64').toString('utf8');
  } catch (err) {
    throw new AegisError('provider_error', 'id_token payload not base64', {
      cause: err,
    });
  }
  const payload = JSON.parse(json) as {
    email?: string;
    preferred_username?: string;
    upn?: string;
    name?: string;
    sub?: string;
    oid?: string;
  };
  const email = payload.email ?? payload.preferred_username ?? payload.upn;
  if (!email) {
    throw new AegisError(
      'provider_error',
      'id_token did not include an email / preferred_username claim',
    );
  }
  const out: MicrosoftUserInfo = {
    email,
    sub: payload.sub ?? payload.oid ?? email,
  };
  if (payload.name !== undefined) out.name = payload.name;
  return out;
}
