import { AegisError, type AccountProvider } from '@aegismail/core';
import {
  ImapProvider,
  ImapAccountConfig,
  GMAIL_IMAP,
  OUTLOOK_IMAP,
} from '@aegismail/providers/imap';
import type { MailProvider } from '@aegismail/providers';
import type { AccountsRepo } from '../db/accounts.ts';
import type { CredentialStore } from '../keychain.ts';
import type { TokenStore } from '../oauth/token-store.ts';
import { refreshAccessToken as refreshGoogleToken } from '../oauth/google.ts';
import { refreshAccessToken as refreshMicrosoftToken } from '../oauth/microsoft.ts';
import {
  googleOAuthFromConfig,
  microsoftOAuthFromConfig,
  type Config,
} from '../config.ts';

const TOKEN_REFRESH_SKEW_MS = 60_000;

export class ProviderRegistry {
  private readonly cache = new Map<string, MailProvider>();

  constructor(
    private readonly config: Config,
    private readonly accounts: AccountsRepo,
    private readonly credentials: CredentialStore,
    private readonly tokens: TokenStore,
  ) {}

  async get(accountId: string): Promise<MailProvider> {
    const cached = this.cache.get(accountId);
    if (cached) return cached;

    const account = this.accounts.get(accountId);
    if (!account) throw new AegisError('not_found', `Account ${accountId} not found`);

    const provider = await this.build(accountId, account.provider);
    this.cache.set(accountId, provider);
    return provider;
  }

  async closeAll(): Promise<void> {
    for (const provider of this.cache.values()) {
      const maybeClose = (provider as { close?: () => Promise<void> }).close;
      if (typeof maybeClose === 'function') await maybeClose.call(provider);
    }
    this.cache.clear();
  }

  invalidate(accountId: string): void {
    const provider = this.cache.get(accountId);
    if (!provider) return;
    const maybeClose = (provider as { close?: () => Promise<void> }).close;
    if (typeof maybeClose === 'function') void maybeClose.call(provider);
    this.cache.delete(accountId);
  }

  private async build(accountId: string, provider: AccountProvider): Promise<MailProvider> {
    switch (provider) {
      case 'icloud':
        return this.buildIcloud(accountId);
      case 'gmail':
        return this.buildGmail(accountId);
      case 'outlook':
        return this.buildOutlook(accountId);
    }
  }

  private async buildIcloud(accountId: string): Promise<MailProvider> {
    const rawConfig = this.accounts.getConfig(accountId);
    if (!rawConfig) throw new AegisError('not_found', `Account ${accountId} config missing`);
    const config = ImapAccountConfig.parse(rawConfig);

    const password = await this.credentials.getPassword(accountId);
    if (!password) {
      throw new AegisError(
        'unauthorized',
        `No stored credentials for account ${accountId}. Re-authenticate.`,
      );
    }

    return new ImapProvider({
      accountId,
      providerId: 'icloud',
      config,
      credentials: { username: config.username, password },
    });
  }

  private async buildGmail(accountId: string): Promise<MailProvider> {
    const google = googleOAuthFromConfig(this.config);
    if (!google) {
      throw new AegisError(
        'provider_error',
        'Google OAuth client is not configured. Set AEGIS_GOOGLE_OAUTH_CLIENT_ID and AEGIS_GOOGLE_OAUTH_CLIENT_SECRET.',
      );
    }

    const rawConfig = this.accounts.getConfig(accountId);
    if (!rawConfig) throw new AegisError('not_found', `Account ${accountId} config missing`);
    const config = ImapAccountConfig.parse({ ...GMAIL_IMAP, ...rawConfig });

    const getAccessToken = async (): Promise<string> => {
      const stored = await this.tokens.get(accountId);
      if (!stored) {
        throw new AegisError(
          'unauthorized',
          `No OAuth tokens stored for account ${accountId}. Reconnect.`,
        );
      }
      const now = Date.now();
      if (stored.expiresAt - now > TOKEN_REFRESH_SKEW_MS) return stored.accessToken;
      if (!stored.refreshToken) {
        throw new AegisError(
          'unauthorized',
          'Access token expired and no refresh token stored. Reconnect.',
        );
      }
      const refreshed = await refreshGoogleToken(google, stored.refreshToken);
      await this.tokens.set(accountId, refreshed);
      return refreshed.accessToken;
    };

    return new ImapProvider({
      accountId,
      providerId: 'gmail',
      config,
      credentials: { username: config.username, getAccessToken },
    });
  }

  private async buildOutlook(accountId: string): Promise<MailProvider> {
    const ms = microsoftOAuthFromConfig(this.config);
    if (!ms) {
      throw new AegisError(
        'provider_error',
        'Microsoft OAuth client is not configured. Set AEGIS_MS_OAUTH_CLIENT_ID.',
      );
    }

    const rawConfig = this.accounts.getConfig(accountId);
    if (!rawConfig) throw new AegisError('not_found', `Account ${accountId} config missing`);
    const config = ImapAccountConfig.parse({ ...OUTLOOK_IMAP, ...rawConfig });

    const getAccessToken = async (): Promise<string> => {
      const stored = await this.tokens.get(accountId);
      if (!stored) {
        throw new AegisError(
          'unauthorized',
          `No OAuth tokens stored for account ${accountId}. Reconnect.`,
        );
      }
      const now = Date.now();
      if (stored.expiresAt - now > TOKEN_REFRESH_SKEW_MS) return stored.accessToken;
      if (!stored.refreshToken) {
        throw new AegisError(
          'unauthorized',
          'Access token expired and no refresh token stored. Reconnect.',
        );
      }
      const refreshed = await refreshMicrosoftToken(ms, stored.refreshToken);
      await this.tokens.set(accountId, refreshed);
      return refreshed.accessToken;
    };

    return new ImapProvider({
      accountId,
      providerId: 'outlook',
      config,
      credentials: { username: config.username, getAccessToken },
    });
  }
}
