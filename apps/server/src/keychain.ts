import keytar from 'keytar';
import { randomBytes } from 'node:crypto';

const SERVICE = 'com.aegismail.app';
const SERVER_TOKEN_ACCOUNT = '__server_bearer_token__';
const CREDENTIAL_PREFIX = 'account.';

export interface CredentialStore {
  getPassword(accountId: string): Promise<string | null>;
  setPassword(accountId: string, password: string): Promise<void>;
  deletePassword(accountId: string): Promise<boolean>;
  getOrCreateServerToken(): Promise<string>;
  rotateServerToken(): Promise<string>;
}

function credentialKey(accountId: string): string {
  return `${CREDENTIAL_PREFIX}${accountId}`;
}

/**
 * Credential store backed by the OS keyring (macOS Keychain via keytar).
 *
 * - Per-account IMAP passwords live under service="com.aegismail.app",
 *   account="account.<uuid>".
 * - A single per-install bearer token (for localhost server auth) lives
 *   under account="__server_bearer_token__" and is minted on first request.
 */
export class KeychainCredentialStore implements CredentialStore {
  async getPassword(accountId: string): Promise<string | null> {
    return keytar.getPassword(SERVICE, credentialKey(accountId));
  }

  async setPassword(accountId: string, password: string): Promise<void> {
    await keytar.setPassword(SERVICE, credentialKey(accountId), password);
  }

  async deletePassword(accountId: string): Promise<boolean> {
    return keytar.deletePassword(SERVICE, credentialKey(accountId));
  }

  async getOrCreateServerToken(): Promise<string> {
    const existing = await keytar.getPassword(SERVICE, SERVER_TOKEN_ACCOUNT);
    if (existing) return existing;
    const fresh = randomBytes(32).toString('base64url');
    await keytar.setPassword(SERVICE, SERVER_TOKEN_ACCOUNT, fresh);
    return fresh;
  }

  async rotateServerToken(): Promise<string> {
    const fresh = randomBytes(32).toString('base64url');
    await keytar.setPassword(SERVICE, SERVER_TOKEN_ACCOUNT, fresh);
    return fresh;
  }
}

/**
 * In-memory credential store for tests and dev without a keyring.
 * Opt in by exporting AEGIS_INSECURE_MEMORY_KEYSTORE=1 (never in production).
 */
export class InMemoryCredentialStore implements CredentialStore {
  private readonly passwords = new Map<string, string>();
  private serverToken: string | null = null;

  async getPassword(accountId: string): Promise<string | null> {
    return this.passwords.get(accountId) ?? null;
  }

  async setPassword(accountId: string, password: string): Promise<void> {
    this.passwords.set(accountId, password);
  }

  async deletePassword(accountId: string): Promise<boolean> {
    return this.passwords.delete(accountId);
  }

  async getOrCreateServerToken(): Promise<string> {
    if (!this.serverToken) {
      this.serverToken = randomBytes(32).toString('base64url');
    }
    return this.serverToken;
  }

  async rotateServerToken(): Promise<string> {
    this.serverToken = randomBytes(32).toString('base64url');
    return this.serverToken;
  }
}

export function createCredentialStore(): CredentialStore {
  if (process.env['AEGIS_INSECURE_MEMORY_KEYSTORE'] === '1') {
    return new InMemoryCredentialStore();
  }
  return new KeychainCredentialStore();
}
