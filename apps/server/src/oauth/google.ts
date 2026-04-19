import { AegisError } from '@aegismail/core';
import type { OAuthTokens } from './token-store.ts';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';

/**
 * Scopes requested from Google. `https://mail.google.com/` is the full
 * IMAP+SMTP scope that Gmail's XOAUTH2 mech accepts; `openid email profile`
 * let us read the user's email + display name for account setup;
 * `offline_access`... wait, Google doesn't use offline_access — it uses
 * `access_type=offline` + `prompt=consent` to get a refresh token.
 */
export const GOOGLE_SCOPES = [
  'https://mail.google.com/',
  'openid',
  'email',
  'profile',
];

export interface GoogleOAuthConfig {
  clientId: string;
  /** For installed/desktop apps Google issues one but PKCE is what actually
   *  secures the flow. Ship it in the code — it's not confidential. */
  clientSecret: string;
}

export interface BuildAuthUrlInput {
  redirectUri: string;
  state: string;
  codeChallenge: string;
  /** Optional: pre-select this email on the Google consent page. */
  loginHint?: string;
}

export function buildAuthorizationUrl(
  config: GoogleOAuthConfig,
  input: BuildAuthUrlInput,
): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('scope', GOOGLE_SCOPES.join(' '));
  url.searchParams.set('state', input.state);
  url.searchParams.set('code_challenge', input.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  // access_type=offline is the Google-specific way to request a refresh
  // token. prompt=consent forces the user to see consent even if they've
  // seen it before, which is what guarantees we get a refresh_token on
  // re-authorization.
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  if (input.loginHint) url.searchParams.set('login_hint', input.loginHint);
  return url.toString();
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

export async function exchangeCodeForTokens(
  config: GoogleOAuthConfig,
  input: { code: string; codeVerifier: string; redirectUri: string },
  fetchImpl: typeof fetch = fetch,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    code: input.code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: input.codeVerifier,
  });

  const res = await fetchImpl(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AegisError(
      'unauthorized',
      `Google token exchange failed (HTTP ${res.status}): ${text}`,
    );
  }

  const data = (await res.json()) as GoogleTokenResponse;
  const now = Date.now();
  const tokens: OAuthTokens = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
    scope: data.scope,
    obtainedAt: new Date(now).toISOString(),
  };
  if (data.refresh_token) tokens.refreshToken = data.refresh_token;
  return tokens;
}

export async function refreshAccessToken(
  config: GoogleOAuthConfig,
  refreshToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetchImpl(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AegisError(
      'unauthorized',
      `Google token refresh failed (HTTP ${res.status}): ${text}`,
    );
  }

  const data = (await res.json()) as GoogleTokenResponse;
  const now = Date.now();
  const tokens: OAuthTokens = {
    accessToken: data.access_token,
    // Google sometimes rotates refresh tokens, sometimes doesn't. Keep
    // the old one if the response didn't include a new one.
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: now + data.expires_in * 1000,
    scope: data.scope,
    obtainedAt: new Date(now).toISOString(),
  };
  return tokens;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  givenName?: string;
  picture?: string;
}

export async function fetchUserInfo(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GoogleUserInfo> {
  const res = await fetchImpl(USERINFO_ENDPOINT, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new AegisError(
      'provider_error',
      `Google userinfo failed (HTTP ${res.status})`,
    );
  }
  const data = (await res.json()) as {
    sub: string;
    email: string;
    email_verified: boolean;
    name?: string;
    given_name?: string;
    picture?: string;
  };
  const out: GoogleUserInfo = {
    sub: data.sub,
    email: data.email,
    emailVerified: data.email_verified,
  };
  if (data.name !== undefined) out.name = data.name;
  if (data.given_name !== undefined) out.givenName = data.given_name;
  if (data.picture !== undefined) out.picture = data.picture;
  return out;
}
