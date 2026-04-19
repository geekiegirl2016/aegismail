import { AegisError, type AccountProvider } from '@aegismail/core';
import { ImapProvider, ImapAccountConfig } from '@aegismail/providers/imap';
import type { MailProvider } from '@aegismail/providers';
import type { AccountsRepo } from '../db/accounts.ts';
import type { CredentialStore } from '../keychain.ts';

/**
 * Holds live per-account `MailProvider` instances. Providers are created
 * on first use and cached for the lifetime of the process.
 *
 * Phase 2 only implements the IMAP branch (iCloud + Fastmail). Gmail and
 * Outlook adapters are stubs and will be wired here when they land.
 */
export class ProviderRegistry {
  private readonly cache = new Map<string, MailProvider>();

  constructor(
    private readonly accounts: AccountsRepo,
    private readonly credentials: CredentialStore,
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
      if (typeof maybeClose === 'function') {
        await maybeClose.call(provider);
      }
    }
    this.cache.clear();
  }

  invalidate(accountId: string): void {
    const provider = this.cache.get(accountId);
    if (!provider) return;
    const maybeClose = (provider as { close?: () => Promise<void> }).close;
    if (typeof maybeClose === 'function') {
      void maybeClose.call(provider);
    }
    this.cache.delete(accountId);
  }

  private async build(accountId: string, provider: AccountProvider): Promise<MailProvider> {
    if (provider !== 'icloud') {
      throw new AegisError(
        'provider_error',
        `${provider} provider is not yet implemented`,
      );
    }

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
      config,
      credentials: { username: config.username, password },
    });
  }
}
