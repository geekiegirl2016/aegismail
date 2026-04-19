import keytar from 'keytar';

const SERVICE = 'com.aegismail.app';
const TOKEN_PREFIX = 'token.';

export interface OAuthTokens {
  /** RFC 6749 access token. Short-lived (usually ~1h). */
  accessToken: string;
  /** Long-lived refresh token. May be absent if the provider rotates. */
  refreshToken?: string;
  /** Absolute epoch ms after which accessToken must be refreshed. */
  expiresAt: number;
  /** Space-delimited scopes the user actually granted. */
  scope: string;
  /** ISO timestamp, for audit. */
  obtainedAt: string;
}

function tokenAccount(accountId: string): string {
  return `${TOKEN_PREFIX}${accountId}`;
}

export interface TokenStore {
  get(accountId: string): Promise<OAuthTokens | null>;
  set(accountId: string, tokens: OAuthTokens): Promise<void>;
  delete(accountId: string): Promise<boolean>;
}

/**
 * Persists OAuth tokens in the macOS Keychain under
 * service="com.aegismail.app", account="token.<accountId>". JSON-encoded
 * so we can hold access + refresh + expiry + scopes together.
 *
 * Different keychain namespace than per-account IMAP passwords so the
 * two can't collide.
 */
export class KeychainTokenStore implements TokenStore {
  async get(accountId: string): Promise<OAuthTokens | null> {
    const raw = await keytar.getPassword(SERVICE, tokenAccount(accountId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as OAuthTokens;
    } catch {
      return null;
    }
  }

  async set(accountId: string, tokens: OAuthTokens): Promise<void> {
    await keytar.setPassword(
      SERVICE,
      tokenAccount(accountId),
      JSON.stringify(tokens),
    );
  }

  async delete(accountId: string): Promise<boolean> {
    return keytar.deletePassword(SERVICE, tokenAccount(accountId));
  }
}

/** In-memory store for tests. */
export class InMemoryTokenStore implements TokenStore {
  private readonly map = new Map<string, OAuthTokens>();

  async get(accountId: string): Promise<OAuthTokens | null> {
    return this.map.get(accountId) ?? null;
  }
  async set(accountId: string, tokens: OAuthTokens): Promise<void> {
    this.map.set(accountId, tokens);
  }
  async delete(accountId: string): Promise<boolean> {
    return this.map.delete(accountId);
  }
}

export function createTokenStore(): TokenStore {
  if (process.env['AEGIS_INSECURE_MEMORY_KEYSTORE'] === '1') {
    return new InMemoryTokenStore();
  }
  return new KeychainTokenStore();
}
